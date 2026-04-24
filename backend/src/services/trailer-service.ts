/**
 * SilentEye — Trailer / cargo logistics service.
 *
 * Pure-ish helpers for the trailer module. Handles risk scoring against
 * `risk_zones`, route adherence checks against `trailer_routes`, and
 * suspicious-stop evaluation. Each function takes coordinates + IDs and
 * returns plain data so route handlers can compose them freely.
 *
 * Heavy lifting (Sentinel-2 tip-and-cue, anomaly detection) lives in
 * gee-service.ts and is invoked from route handlers, not here.
 */
import { pool } from '../db/pool.js';

export const CARGO_TYPES = [
  'refrigerated', 'dry', 'tanker', 'flatbed', 'container', 'auto_carrier', 'other',
] as const;
export type CargoType = typeof CARGO_TYPES[number];

export const RISK_CATEGORIES = [
  'cargo_theft', 'highway_robbery', 'narco_violence',
  'protest_blockade', 'natural_hazard', 'road_closure', 'other',
] as const;
export type RiskCategory = typeof RISK_CATEGORIES[number];

export const RISK_SOURCES = ['manual', 'sesnsp', 'capufe', 'incident_history', 'partner_intel'] as const;
export type RiskSource = typeof RISK_SOURCES[number];

export const ROUTE_STATUSES = ['planned', 'in_progress', 'completed', 'deviated', 'cancelled'] as const;
export type RouteStatus = typeof ROUTE_STATUSES[number];

export const ALERT_TYPES = [
  'off_route', 'risk_zone_entry', 'suspicious_stop', 'route_deviation',
  'temperature_anomaly', 'satellite_anomaly_detected', 'eta_breach',
] as const;
export type AlertType = typeof ALERT_TYPES[number];

// ── Row shapes ────────────────────────────────────────────────────────

export interface Trailer {
  vehicle_id: string;
  cargo_type: CargoType | null;
  capacity_kg: number | null;
  trailer_plates: string | null;
  has_temperature_sensor: boolean;
  fleet_owner_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrailerRoute {
  id: string;
  trailer_id: string;
  name: string | null;
  origin_lat: number;
  origin_lng: number;
  destination_lat: number;
  destination_lng: number;
  buffer_meters: number;
  planned_departure: string | null;
  planned_arrival: string | null;
  status: RouteStatus;
  created_at: string;
  updated_at: string;
}

export interface RiskZoneRow {
  id: string;
  name: string;
  description: string | null;
  source: RiskSource;
  category: RiskCategory;
  risk_score: number;
  active_from: string;
  active_until: string | null;
}

export interface TrailerAlert {
  id: string;
  trailer_id: string;
  route_id: string | null;
  risk_zone_id: string | null;
  alert_type: AlertType;
  severity: 'info' | 'warning' | 'critical';
  latitude: number | null;
  longitude: number | null;
  message: string | null;
  metadata: Record<string, unknown> | null;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

// ── Validators ────────────────────────────────────────────────────────

export function isValidLatLng(lat: unknown, lng: unknown): lat is number {
  return typeof lat === 'number' && typeof lng === 'number'
    && Number.isFinite(lat) && Number.isFinite(lng)
    && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

// ── Risk scoring ──────────────────────────────────────────────────────

export interface RiskAssessment {
  score: number;                              // 0-100, max across overlapping zones
  zones: Array<{
    id: string;
    name: string;
    category: RiskCategory;
    risk_score: number;
    source: RiskSource;
  }>;
}

/**
 * Risk score at a coordinate: queries every active risk_zone that contains
 * the point, returns the maximum score plus the contributing zones.
 * Returns score=0, zones=[] for clean points.
 */
export async function getRiskAt(lat: number, lng: number): Promise<RiskAssessment> {
  const { rows } = await pool.query<{
    id: string; name: string; category: RiskCategory; risk_score: number; source: RiskSource;
  }>(
    `SELECT id, name, category, risk_score, source
     FROM risk_zones
     WHERE (active_until IS NULL OR active_until > NOW())
       AND active_from <= NOW()
       AND ST_Contains(zone, ST_SetSRID(ST_MakePoint($2, $1), 4326))
     ORDER BY risk_score DESC
     LIMIT 20`,
    [lat, lng],
  );
  const score = rows.length > 0 ? rows[0].risk_score : 0;
  return { score, zones: rows };
}

// ── Route adherence ───────────────────────────────────────────────────

export interface RouteAdherence {
  on_route: boolean;
  distance_m: number;
  buffer_m: number;
  route: Pick<TrailerRoute, 'id' | 'name' | 'buffer_meters' | 'status'> | null;
}

/**
 * Distance from current location to the active route's path. Returns null
 * route if the trailer has no in_progress / planned route.
 */
export async function checkRouteAdherence(
  trailerId: string,
  lat: number,
  lng: number,
): Promise<RouteAdherence> {
  const { rows } = await pool.query<{
    id: string; name: string | null; buffer_meters: number; status: RouteStatus; distance_m: number;
  }>(
    `SELECT id, name, buffer_meters, status,
            ST_Distance(
              path::geography,
              ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
            ) AS distance_m
     FROM trailer_routes
     WHERE trailer_id = $3 AND status IN ('planned', 'in_progress') AND path IS NOT NULL
     ORDER BY planned_departure DESC NULLS LAST
     LIMIT 1`,
    [lat, lng, trailerId],
  );
  if (rows.length === 0) {
    return { on_route: true, distance_m: 0, buffer_m: 0, route: null };
  }
  const r = rows[0];
  return {
    on_route: r.distance_m <= r.buffer_meters,
    distance_m: Math.round(r.distance_m),
    buffer_m: r.buffer_meters,
    route: { id: r.id, name: r.name, buffer_meters: r.buffer_meters, status: r.status },
  };
}

// ── Suspicious stop evaluation ────────────────────────────────────────

export interface StopEvaluation {
  suspicious: boolean;
  reason: string | null;
  riskAssessment: RiskAssessment;
  durationMinutes: number;
}

const DEFAULT_STOP_THRESHOLD_MIN = 15;
const RISK_SCORE_THRESHOLD = 40;

/**
 * Decide if a stop deserves an alert. Currently flags stops that:
 *   • last more than `thresholdMin` minutes (default 15), AND
 *   • happen inside an active risk zone scoring >= 40.
 *
 * Caller passes the duration; the GPS pipeline computes it from gps_logs
 * stillness (zero speed for N consecutive pings).
 */
export async function evaluateStop(
  lat: number,
  lng: number,
  durationMinutes: number,
  thresholdMin: number = DEFAULT_STOP_THRESHOLD_MIN,
): Promise<StopEvaluation> {
  const risk = await getRiskAt(lat, lng);
  if (durationMinutes < thresholdMin) {
    return { suspicious: false, reason: null, riskAssessment: risk, durationMinutes };
  }
  if (risk.score >= RISK_SCORE_THRESHOLD) {
    return {
      suspicious: true,
      reason: `Stop ${durationMinutes}m in zone "${risk.zones[0]?.name}" (score ${risk.score})`,
      riskAssessment: risk,
      durationMinutes,
    };
  }
  return { suspicious: false, reason: null, riskAssessment: risk, durationMinutes };
}

// ── Alert recording ───────────────────────────────────────────────────

export async function recordAlert(input: {
  trailerId: string;
  alertType: AlertType;
  severity?: 'info' | 'warning' | 'critical';
  latitude?: number;
  longitude?: number;
  message?: string;
  metadata?: Record<string, unknown>;
  routeId?: string;
  riskZoneId?: string;
}): Promise<TrailerAlert> {
  const hasGeom = typeof input.latitude === 'number' && typeof input.longitude === 'number';
  const { rows } = await pool.query<TrailerAlert>(
    `INSERT INTO trailer_alerts (
       trailer_id, route_id, risk_zone_id, alert_type, severity,
       latitude, longitude, geom, message, metadata
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7,
       ${hasGeom ? 'ST_SetSRID(ST_MakePoint($7, $6), 4326)' : 'NULL'},
       $8, $9
     )
     RETURNING *`,
    [
      input.trailerId,
      input.routeId || null,
      input.riskZoneId || null,
      input.alertType,
      input.severity || 'warning',
      input.latitude ?? null,
      input.longitude ?? null,
      input.message || null,
      input.metadata ? JSON.stringify(input.metadata) : null,
    ],
  );
  return rows[0];
}

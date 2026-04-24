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
import { logger } from '../utils/logger.js';
import { analyzeTerrainChange, isGeeReady } from './gee-service.js';

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

// ── Real-time rules engine ────────────────────────────────────────────
//
// Invoked from the GPS pipeline after each ping. Decides whether the new
// location triggers off_route, risk_zone_entry, or suspicious_stop alerts
// and records them. Each alert has a per-(trailer, type, scope) dedup
// window so we don't spam the same condition every 30 seconds.

export interface GpsContext {
  vehicleId: string;
  latitude: number;
  longitude: number;
  speed: number;       // km/h
  timestamp: Date;
}

const HIGH_RISK_THRESHOLD = 40;
const STOP_THRESHOLD_MIN = 15;
const ALERT_DEDUP_MIN = 15;
const STOP_DEDUP_MIN = 60;

export async function isTrailer(vehicleId: string): Promise<boolean> {
  const r = await pool.query('SELECT 1 FROM trailers WHERE vehicle_id = $1', [vehicleId]);
  return (r.rowCount ?? 0) > 0;
}

/**
 * True if there's an unresolved alert of the same (type, optional scope)
 * for this trailer within the last `withinMinutes`. Used for dedup.
 */
async function recentAlertExists(
  trailerId: string,
  alertType: AlertType,
  withinMinutes: number,
  scopeId?: string,
): Promise<boolean> {
  const params: unknown[] = [trailerId, alertType, `${withinMinutes} minutes`];
  let where = 'trailer_id = $1 AND alert_type = $2 AND created_at > NOW() - $3::interval AND NOT resolved';
  if (scopeId) {
    if (alertType === 'risk_zone_entry') where += ' AND risk_zone_id = $4';
    else if (alertType === 'off_route' || alertType === 'route_deviation') where += ' AND route_id = $4';
    params.push(scopeId);
  }
  const r = await pool.query(`SELECT 1 FROM trailer_alerts WHERE ${where} LIMIT 1`, params);
  return (r.rowCount ?? 0) > 0;
}

/**
 * How many minutes the trailer has been at speed=0. Reads gps_logs for the
 * most recent ping with non-zero speed; returns 0 if it has been moving.
 */
async function detectStillness(vehicleId: string): Promise<number> {
  const r = await pool.query<{ minutes: number }>(
    `SELECT EXTRACT(EPOCH FROM (NOW() - timestamp_at)) / 60 AS minutes
     FROM gps_logs
     WHERE vehicle_id = $1 AND speed > 0
     ORDER BY timestamp_at DESC LIMIT 1`,
    [vehicleId],
  );
  if (r.rowCount === 0) return 0;
  return Math.floor(Number(r.rows[0].minutes) || 0);
}

/**
 * Run the trailer rules engine for a fresh GPS ping. Returns the alerts
 * created (possibly empty). Non-trailer vehicles short-circuit cheaply.
 *
 * Idempotent within a dedup window — calling this twice for the same
 * condition won't create duplicate alerts.
 */
export async function evaluateTrailerRules(ctx: GpsContext): Promise<TrailerAlert[]> {
  const { vehicleId, latitude, longitude, speed } = ctx;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || (latitude === 0 && longitude === 0)) {
    return [];
  }
  if (!await isTrailer(vehicleId)) return [];

  const created: TrailerAlert[] = [];
  const [adherence, risk] = await Promise.all([
    checkRouteAdherence(vehicleId, latitude, longitude),
    getRiskAt(latitude, longitude),
  ]);

  // Off-route: only when there's an active route AND we're outside the buffer
  if (adherence.route && !adherence.on_route) {
    if (!await recentAlertExists(vehicleId, 'off_route', ALERT_DEDUP_MIN, adherence.route.id)) {
      created.push(await recordAlert({
        trailerId: vehicleId,
        alertType: 'off_route',
        severity: 'warning',
        latitude, longitude,
        message: `Fuera de ruta a ${adherence.distance_m}m del trazo (buffer ${adherence.buffer_m}m)`,
        metadata: { distance_m: adherence.distance_m, buffer_m: adherence.buffer_m },
        routeId: adherence.route.id,
      }));
    }
  }

  // Risk zone entry: highest-scoring zone that contains the point, dedup per zone
  if (risk.score >= HIGH_RISK_THRESHOLD && risk.zones[0]) {
    const zone = risk.zones[0];
    if (!await recentAlertExists(vehicleId, 'risk_zone_entry', ALERT_DEDUP_MIN, zone.id)) {
      created.push(await recordAlert({
        trailerId: vehicleId,
        alertType: 'risk_zone_entry',
        severity: zone.risk_score >= 70 ? 'critical' : 'warning',
        latitude, longitude,
        message: `Entró a "${zone.name}" (score ${zone.risk_score}, ${zone.category})`,
        metadata: { zone_name: zone.name, score: zone.risk_score, category: zone.category, source: zone.source },
        riskZoneId: zone.id,
      }));
    }
  }

  // Suspicious stop: only checked when the current ping is stationary.
  // Using current ping speed instead of stillness alone avoids querying
  // gps_logs on every moving ping (which is the common case).
  if (speed === 0) {
    const stillnessMin = await detectStillness(vehicleId);
    if (stillnessMin >= STOP_THRESHOLD_MIN && risk.score >= HIGH_RISK_THRESHOLD) {
      if (!await recentAlertExists(vehicleId, 'suspicious_stop', STOP_DEDUP_MIN)) {
        const stopAlert = await recordAlert({
          trailerId: vehicleId,
          alertType: 'suspicious_stop',
          severity: 'critical',
          latitude, longitude,
          message: `Detenido ${stillnessMin}m en zona de riesgo (score ${risk.score})`,
          metadata: {
            stillness_minutes: stillnessMin,
            risk_score: risk.score,
            zone_name: risk.zones[0]?.name,
          },
          riskZoneId: risk.zones[0]?.id,
        });
        created.push(stopAlert);

        // Tip-and-cue: fire-and-forget satellite analysis. Result may
        // appear minutes later as a satellite_anomaly_detected alert.
        tipAndCueSuspiciousStop({
          trailerId: vehicleId,
          latitude,
          longitude,
          parentAlertId: stopAlert.id,
        }).catch((err) => {
          logger.warn(`[tip-and-cue] failed for ${vehicleId}: ${err?.message || err}`);
        });
      }
    }
  }

  return created;
}

// ── Tip-and-cue (satellite validation of suspicious stops) ───────────
//
// When a suspicious_stop fires we ask Google Earth Engine to compare
// 90 days of baseline imagery against the latest pass at this location.
// If terrain anomalies are detected (vegetation loss, soil exposure)
// above a severity threshold, we emit a satellite_anomaly_detected
// alert linked to the parent stop via metadata.parent_alert_id.
//
// Why this matters: a stop in a risk zone is suspicious; a stop in a
// risk zone WITH visible terrain disturbance from space is much more so.
// SAR confirmation (when Sentinel-1 also flags the change) elevates
// confidence further — the gee-service handles that correlation.

const TIP_AND_CUE_COOLDOWN_MS = 6 * 60 * 60 * 1000;     // 6 h per trailer
const TIP_AND_CUE_RADIUS_KM = 1;                         // 1 km AOI around stop
const TIP_AND_CUE_MIN_SEVERITY = 30;                     // skip noise

// In-memory cooldown. Single-instance only — for multi-instance Fly we
// would need a shared store (Redis or a DB row). Acceptable trade-off
// for the current single-machine deployment.
const tipAndCueCooldowns = new Map<string, number>();

function shouldRunTipAndCue(trailerId: string): boolean {
  const last = tipAndCueCooldowns.get(trailerId);
  if (last && Date.now() - last < TIP_AND_CUE_COOLDOWN_MS) return false;
  tipAndCueCooldowns.set(trailerId, Date.now());
  return true;
}

export async function tipAndCueSuspiciousStop(input: {
  trailerId: string;
  latitude: number;
  longitude: number;
  parentAlertId: string;
}): Promise<TrailerAlert | null> {
  if (!isGeeReady()) {
    logger.debug?.('[tip-and-cue] GEE not ready, skipping satellite check');
    return null;
  }
  if (!shouldRunTipAndCue(input.trailerId)) {
    logger.info(`[tip-and-cue] cooldown active for trailer ${input.trailerId} — skipping`);
    return null;
  }

  const today = new Date().toISOString().slice(0, 10);
  logger.info(`[tip-and-cue] running satellite check at ${input.latitude.toFixed(5)},${input.longitude.toFixed(5)} for trailer ${input.trailerId}`);

  try {
    const result = await analyzeTerrainChange(
      input.latitude,
      input.longitude,
      TIP_AND_CUE_RADIUS_KM,
      today,
      undefined,
      'high',                    // higher sensitivity at known suspicious sites
    );

    const significant = result.anomalies.filter((a) => a.severity >= TIP_AND_CUE_MIN_SEVERITY);
    if (significant.length === 0) {
      logger.info(`[tip-and-cue] no significant anomalies for stop ${input.parentAlertId} (sensor: ${result.metadata.sourceSensorDisplay}, ${result.metadata.baselineImages}/${result.metadata.currentImages} images)`);
      return null;
    }

    const top = significant[0];                      // already sorted by severity desc
    const sarConfirmedCount = significant.filter((a) => a.confidence === 'sar_confirmed').length;

    const alert = await recordAlert({
      trailerId: input.trailerId,
      alertType: 'satellite_anomaly_detected',
      severity: top.severity >= 70 ? 'critical' : 'warning',
      latitude: top.latitude,
      longitude: top.longitude,
      message: `Anomalía satelital cerca de parada sospechosa — ${significant.length} cambio(s), severidad máxima ${top.severity}/100${sarConfirmedCount > 0 ? `, ${sarConfirmedCount} confirmada(s) por radar` : ''}`,
      metadata: {
        parent_alert_id: input.parentAlertId,
        anomaly_count: significant.length,
        sar_confirmed_count: sarConfirmedCount,
        top_severity: top.severity,
        top_anomaly_lat: top.latitude,
        top_anomaly_lng: top.longitude,
        top_anomaly_type: top.type,
        top_anomaly_area_m2: top.areaM2,
        sensor: result.metadata.sourceSensorDisplay,
        sensor_pixel_scale_m: result.metadata.sourcePixelScale,
        baseline_images: result.metadata.baselineImages,
        current_images: result.metadata.currentImages,
        sar_available: result.metadata.sarAvailable,
      },
    });
    logger.info(`[tip-and-cue] satellite_anomaly_detected ${alert.id} created for stop ${input.parentAlertId} (top severity ${top.severity}, sar_confirmed ${sarConfirmedCount}/${significant.length})`);
    return alert;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(`[tip-and-cue] GEE eval failed for ${input.trailerId}: ${msg}`);
    return null;
  }
}

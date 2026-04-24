/**
 * SilentEye — Trailer module REST endpoints.
 *
 * Mounted under /api/trailers by routes.ts. All routes require auth;
 * write operations require admin or fleet_owner. Risk-zone management
 * is admin-only.
 */
import { Router, type Request, type Response, type NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { pool } from '../db/pool.js';
import { logger } from '../utils/logger.js';
import {
  CARGO_TYPES,
  RISK_CATEGORIES,
  RISK_SOURCES,
  ROUTE_STATUSES,
  isValidLatLng,
  getRiskAt,
  checkRouteAdherence,
  recordAlert,
  type CargoType,
  type RiskCategory,
  type RiskSource,
  type RouteStatus,
} from '../services/trailer-service.js';

export const trailerRouter = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

const writeLimit = rateLimit({ windowMs: 60_000, max: 60, standardHeaders: true, legacyHeaders: false });
const readLimit = rateLimit({ windowMs: 60_000, max: 300, standardHeaders: true, legacyHeaders: false });

interface AuthedRequest extends Request {
  user?: { userId: string; role: string };
}

function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = (req as AuthedRequest).user?.role;
    if (!role) return res.status(401).json({ error: 'Sesión requerida' });
    if (!roles.includes(role)) return res.status(403).json({ error: 'Permiso insuficiente' });
    next();
  };
}

// ── Trailers list/CRUD ────────────────────────────────────────────────

trailerRouter.get('/', readLimit, asyncHandler(async (req, res) => {
  const role = (req as AuthedRequest).user?.role;
  const userId = (req as AuthedRequest).user?.userId;
  const filterByOwner = role === 'fleet_owner';
  const { rows } = await pool.query(
    `SELECT v.id, v.plate, v.imei, v.name, t.cargo_type, t.capacity_kg, t.trailer_plates,
            t.has_temperature_sensor, t.fleet_owner_id, t.notes,
            t.created_at, t.updated_at
     FROM vehicles v INNER JOIN trailers t ON t.vehicle_id = v.id
     ${filterByOwner ? 'WHERE t.fleet_owner_id = $1' : ''}
     ORDER BY t.created_at DESC LIMIT 200`,
    filterByOwner ? [userId] : [],
  );
  res.json(rows);
}));

trailerRouter.get('/:vehicleId', readLimit, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT v.id, v.plate, v.imei, v.name, v.driver_id,
            t.cargo_type, t.capacity_kg, t.trailer_plates, t.has_temperature_sensor,
            t.fleet_owner_id, t.notes, t.created_at, t.updated_at
     FROM vehicles v INNER JOIN trailers t ON t.vehicle_id = v.id
     WHERE v.id = $1`,
    [req.params.vehicleId],
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Trailer no encontrado' });
  res.json(rows[0]);
}));

trailerRouter.post('/', writeLimit, requireRole('admin', 'fleet_owner'), asyncHandler(async (req, res) => {
  const {
    vehicle_id, cargo_type, capacity_kg, trailer_plates, has_temperature_sensor, notes,
  } = req.body ?? {};
  if (!vehicle_id) return res.status(400).json({ error: 'vehicle_id requerido' });
  if (cargo_type && !(CARGO_TYPES as readonly string[]).includes(cargo_type)) {
    return res.status(400).json({ error: 'cargo_type inválido' });
  }
  const role = (req as AuthedRequest).user!.role;
  const ownerId = role === 'fleet_owner' ? (req as AuthedRequest).user!.userId : (req.body.fleet_owner_id || null);
  const { rows } = await pool.query(
    `INSERT INTO trailers (vehicle_id, cargo_type, capacity_kg, trailer_plates, has_temperature_sensor, fleet_owner_id, notes)
     VALUES ($1, $2, $3, $4, COALESCE($5, FALSE), $6, $7)
     ON CONFLICT (vehicle_id) DO UPDATE SET
       cargo_type = EXCLUDED.cargo_type,
       capacity_kg = EXCLUDED.capacity_kg,
       trailer_plates = EXCLUDED.trailer_plates,
       has_temperature_sensor = EXCLUDED.has_temperature_sensor,
       notes = EXCLUDED.notes,
       updated_at = NOW()
     RETURNING *`,
    [vehicle_id, cargo_type || null, capacity_kg || null, trailer_plates || null,
     !!has_temperature_sensor, ownerId, notes || null],
  );
  res.status(201).json(rows[0]);
}));

// ── Routes (planned trips) ────────────────────────────────────────────

trailerRouter.post('/:vehicleId/routes', writeLimit, requireRole('admin', 'fleet_owner'), asyncHandler(async (req, res) => {
  const { name, origin_lat, origin_lng, destination_lat, destination_lng,
          waypoints, buffer_meters, planned_departure, planned_arrival } = req.body ?? {};
  if (!isValidLatLng(origin_lat, origin_lng) || !isValidLatLng(destination_lat, destination_lng)) {
    return res.status(400).json({ error: 'Coordenadas inválidas' });
  }
  const buf = Number.isFinite(buffer_meters) ? Math.max(50, Math.min(5000, buffer_meters)) : 500;
  const userId = (req as AuthedRequest).user!.userId;

  // Build LineString from waypoints if provided, else origin→destination.
  let pathSql = `ST_SetSRID(ST_MakeLine(ST_MakePoint($3, $2), ST_MakePoint($5, $4)), 4326)`;
  const params: unknown[] = [req.params.vehicleId, origin_lat, origin_lng, destination_lat, destination_lng];
  if (Array.isArray(waypoints) && waypoints.length >= 2 &&
      waypoints.every((w: unknown) => Array.isArray(w) && w.length === 2 && isValidLatLng(w[0], w[1]))) {
    const points = (waypoints as Array<[number, number]>)
      .map((w, i) => `ST_MakePoint($${params.length + i * 2 + 2}, $${params.length + i * 2 + 1})`);
    pathSql = `ST_SetSRID(ST_MakeLine(ARRAY[${points.join(', ')}]), 4326)`;
    for (const [lat, lng] of waypoints as Array<[number, number]>) { params.push(lat, lng); }
  }
  params.push(name?.toString().slice(0, 200) || null, buf,
              planned_departure || null, planned_arrival || null, userId);

  const baseParamCount = 5 + (Array.isArray(waypoints) ? waypoints.length * 2 : 0);
  const { rows } = await pool.query(
    `INSERT INTO trailer_routes (
       trailer_id, origin_lat, origin_lng, destination_lat, destination_lng,
       path, name, buffer_meters, planned_departure, planned_arrival, created_by
     ) VALUES ($1, $2, $3, $4, $5, ${pathSql},
       $${baseParamCount + 1}, $${baseParamCount + 2}, $${baseParamCount + 3}, $${baseParamCount + 4}, $${baseParamCount + 5})
     RETURNING id, trailer_id, name, origin_lat, origin_lng, destination_lat, destination_lng,
               buffer_meters, planned_departure, planned_arrival, status, created_at, updated_at`,
    params,
  );
  res.status(201).json(rows[0]);
}));

trailerRouter.get('/:vehicleId/routes', readLimit, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, trailer_id, name, origin_lat, origin_lng, destination_lat, destination_lng,
            buffer_meters, planned_departure, planned_arrival, status, created_at, updated_at
     FROM trailer_routes WHERE trailer_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [req.params.vehicleId],
  );
  res.json(rows);
}));

trailerRouter.put('/:vehicleId/routes/:routeId/status', writeLimit, requireRole('admin', 'fleet_owner'), asyncHandler(async (req, res) => {
  const { status } = req.body ?? {};
  if (!(ROUTE_STATUSES as readonly string[]).includes(status)) {
    return res.status(400).json({ error: 'status inválido' });
  }
  const { rows } = await pool.query(
    `UPDATE trailer_routes SET status = $1, updated_at = NOW()
     WHERE id = $2 AND trailer_id = $3 RETURNING *`,
    [status, req.params.routeId, req.params.vehicleId],
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Ruta no encontrada' });
  res.json(rows[0]);
}));

// ── Risk zones ────────────────────────────────────────────────────────

trailerRouter.get('/risk-zones', readLimit, asyncHandler(async (req, res) => {
  // Optional bbox filter: ?north=&south=&east=&west=
  const filters: string[] = ['(active_until IS NULL OR active_until > NOW())', 'active_from <= NOW()'];
  const params: unknown[] = [];
  const { north, south, east, west } = req.query;
  if (north && south && east && west) {
    filters.push(`zone && ST_MakeEnvelope($1, $2, $3, $4, 4326)`);
    params.push(parseFloat(west as string), parseFloat(south as string),
                parseFloat(east as string), parseFloat(north as string));
  }
  const { rows } = await pool.query(
    `SELECT id, name, description, source, category, risk_score, active_from, active_until,
            ST_AsGeoJSON(zone) AS zone_geojson
     FROM risk_zones WHERE ${filters.join(' AND ')}
     ORDER BY risk_score DESC LIMIT 200`,
    params,
  );
  res.json(rows.map((r: any) => ({ ...r, zone: JSON.parse(r.zone_geojson), zone_geojson: undefined })));
}));

trailerRouter.post('/risk-zones', writeLimit, requireRole('admin'), asyncHandler(async (req, res) => {
  const { name, description, source, category, risk_score, polygon, active_from, active_until } = req.body ?? {};
  if (!name || typeof name !== 'string') return res.status(400).json({ error: 'name requerido' });
  if (!(RISK_SOURCES as readonly string[]).includes(source || 'manual')) return res.status(400).json({ error: 'source inválido' });
  if (!(RISK_CATEGORIES as readonly string[]).includes(category)) return res.status(400).json({ error: 'category inválido' });
  const score = Number(risk_score);
  if (!Number.isFinite(score) || score < 0 || score > 100) return res.status(400).json({ error: 'risk_score 0-100' });

  // polygon is GeoJSON-style array of [lng, lat] pairs; first and last must match.
  if (!Array.isArray(polygon) || polygon.length < 4) {
    return res.status(400).json({ error: 'polygon requerido (al menos 4 puntos)' });
  }
  const first = polygon[0], last = polygon[polygon.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    return res.status(400).json({ error: 'polygon debe cerrar en el primer punto' });
  }
  const wktPoints = polygon.map((p: [number, number]) => `${p[0]} ${p[1]}`).join(', ');
  const userId = (req as AuthedRequest).user!.userId;

  const { rows } = await pool.query(
    `INSERT INTO risk_zones (name, description, source, category, risk_score, zone, active_from, active_until, created_by)
     VALUES ($1, $2, $3, $4, $5,
             ST_SetSRID(ST_GeomFromText($6), 4326),
             COALESCE($7::timestamptz, NOW()), $8, $9)
     RETURNING id, name, description, source, category, risk_score, active_from, active_until, created_at`,
    [name.slice(0, 200), description || null, source || 'manual', category, score,
     `POLYGON((${wktPoints}))`, active_from || null, active_until || null, userId],
  );
  res.status(201).json(rows[0]);
}));

// ── Risk score lookup (public to authed users) ────────────────────────

trailerRouter.get('/risk-score', readLimit, asyncHandler(async (req, res) => {
  const lat = parseFloat(String(req.query.lat));
  const lng = parseFloat(String(req.query.lng));
  if (!isValidLatLng(lat, lng)) return res.status(400).json({ error: 'lat/lng inválidos' });
  const result = await getRiskAt(lat, lng);
  res.json(result);
}));

// ── Status (combined view: location + adherence + risk) ──────────────

trailerRouter.get('/:vehicleId/status', readLimit, asyncHandler(async (req, res) => {
  const lastGps = await pool.query<{ latitude: number; longitude: number; speed: number; timestamp_at: string }>(
    `SELECT latitude, longitude, speed, timestamp_at
     FROM gps_logs WHERE vehicle_id = $1 ORDER BY timestamp_at DESC LIMIT 1`,
    [req.params.vehicleId],
  );
  if (lastGps.rowCount === 0) return res.status(404).json({ error: 'Sin datos GPS recientes' });
  const { latitude, longitude, speed, timestamp_at } = lastGps.rows[0];
  const [risk, adherence] = await Promise.all([
    getRiskAt(latitude, longitude),
    checkRouteAdherence(req.params.vehicleId, latitude, longitude),
  ]);
  res.json({
    location: { latitude, longitude, speed, timestamp_at },
    risk,
    adherence,
  });
}));

// ── Alerts ────────────────────────────────────────────────────────────

trailerRouter.get('/:vehicleId/alerts', readLimit, asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const onlyUnresolved = req.query.unresolved === '1' || req.query.unresolved === 'true';
  const { rows } = await pool.query(
    `SELECT id, trailer_id, route_id, risk_zone_id, alert_type, severity,
            latitude, longitude, message, metadata, resolved, resolved_at, created_at
     FROM trailer_alerts
     WHERE trailer_id = $1 ${onlyUnresolved ? 'AND NOT resolved' : ''}
     ORDER BY created_at DESC LIMIT ${limit}`,
    [req.params.vehicleId],
  );
  res.json(rows);
}));

trailerRouter.put('/:vehicleId/alerts/:alertId/resolve', writeLimit, requireRole('admin', 'fleet_owner'), asyncHandler(async (req, res) => {
  const userId = (req as AuthedRequest).user!.userId;
  const { rows } = await pool.query(
    `UPDATE trailer_alerts SET resolved = TRUE, resolved_at = NOW(), resolved_by = $1
     WHERE id = $2 AND trailer_id = $3 AND NOT resolved RETURNING *`,
    [userId, req.params.alertId, req.params.vehicleId],
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Alerta no encontrada o ya resuelta' });
  res.json(rows[0]);
}));

trailerRouter.post('/:vehicleId/alerts', writeLimit, requireRole('admin', 'fleet_owner'), asyncHandler(async (req, res) => {
  // Manual alert creation (the GPS pipeline calls recordAlert directly).
  const { alert_type, severity, latitude, longitude, message, metadata } = req.body ?? {};
  try {
    const alert = await recordAlert({
      trailerId: req.params.vehicleId,
      alertType: alert_type,
      severity,
      latitude,
      longitude,
      message,
      metadata,
    });
    res.status(201).json(alert);
  } catch (err) {
    logger.error(`[trailer] alert create failed: ${err instanceof Error ? err.message : err}`);
    res.status(400).json({ error: err instanceof Error ? err.message : 'No se pudo crear la alerta' });
  }
}));

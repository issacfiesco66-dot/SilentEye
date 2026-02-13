import { Router, type Request, type Response, type NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { pool } from '../db/pool.js';
import { hasPostGis } from '../db/postgis-check.js';
import {
  createOtp,
  verifyOtp,
  findOrCreateUser,
  signToken,
  verifyToken,
} from './auth.js';
import { getAlerts, deleteAlerts } from '../services/alert-service.js';
import { broadcastPanic } from '../services/websocket.js';
import { logger } from '../utils/logger.js';
import { runMigrate } from '../db/run-migrate.js';
import { runSeed } from '../db/run-seed.js';

export const api = Router();

// Async error wrapper: catches unhandled promise rejections in route handlers
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

// Stricter rate-limit for auth endpoints (prevent OTP brute-force)
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Demasiados intentos de autenticación. Intenta en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const cfIp = req.headers['cf-connecting-ip'];
    if (typeof cfIp === 'string') return cfIp;
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
    return req.ip || req.socket?.remoteAddress || 'unknown';
  },
});

// Input validation helpers
const PHONE_REGEX = /^\+?[\d\s\-()]{6,20}$/;
const IMEI_REGEX = /^\d{15}$/;

function isValidPhone(phone: string): boolean {
  return typeof phone === 'string' && PHONE_REGEX.test(phone.trim()) && phone.trim().length <= 20;
}

function isValidImeiInput(imei: string): boolean {
  return typeof imei === 'string' && IMEI_REGEX.test(imei.trim());
}

function isValidCoords(lat: unknown, lng: unknown): boolean {
  return typeof lat === 'number' && typeof lng === 'number'
    && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
    && isFinite(lat) && isFinite(lng);
}

// Setup: migrar y seed (requiere ?secret=XXX, MIGRATE_SECRET en Fly Secrets)
const MIGRATE_SECRET = process.env.MIGRATE_SECRET || '';
function checkSetupSecret(req: import('express').Request): boolean {
  const secret = req.query.secret || req.body?.secret;
  return !!MIGRATE_SECRET && MIGRATE_SECRET.length >= 16 && MIGRATE_SECRET === secret;
}

api.post('/setup/migrate', asyncHandler(async (req, res) => {
  if (!checkSetupSecret(req)) {
    res.status(403).json({ error: 'Secret inválido. Define MIGRATE_SECRET en Fly Secrets.' });
    return;
  }
  const result = await runMigrate();
  res.json(result);
}));

api.post('/setup/seed', asyncHandler(async (req, res) => {
  if (!checkSetupSecret(req)) {
    res.status(403).json({ error: 'Secret inválido. Define MIGRATE_SECRET en Fly Secrets.' });
    return;
  }
  const result = await runSeed();
  res.json(result);
}));

// Crear OTP y devolverlo (para primer login en prod cuando no hay SMS)
api.post('/setup/otp', asyncHandler(async (req, res) => {
  if (!checkSetupSecret(req)) {
    res.status(403).json({ error: 'Secret inválido.' });
    return;
  }
  const phone = req.body?.phone || req.query.phone;
  if (!phone || typeof phone !== 'string' || !isValidPhone(phone)) {
    res.status(400).json({ error: 'phone requerido (formato válido, máx 20 caracteres)' });
    return;
  }
  try {
    const code = await createOtp(phone.trim());
    await findOrCreateUser(phone.trim());
    res.json({ ok: true, phone: phone.trim(), code });
  } catch (err) {
    logger.error('setup/otp error:', err);
    res.status(500).json({ ok: false, error: 'Error interno' });
  }
}));

function authMiddleware(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  const payload = token ? verifyToken(token) : null;
  if (!payload) {
    res.status(401).json({ error: 'No autorizado' });
    return;
  }
  (req as any).user = payload;
  next();
}

function requireRole(...roles: string[]) {
  return (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
    const user = (req as any).user;
    if (!user || !roles.includes(user.role)) {
      res.status(403).json({ error: 'Acceso denegado' });
      return;
    }
    next();
  };
}

// Login: conductor con IMEI, admin/helper con teléfono, ciudadano con teléfono+mode
api.post('/auth/otp/request', authRateLimit, asyncHandler(async (req, res) => {
  try {
    const { imei, phone, mode } = req.body;
    const showCode = process.env.OTP_SHOW_IN_PROD === 'true' || process.env.NODE_ENV !== 'production';

    if (imei && typeof imei === 'string') {
      if (!isValidImeiInput(imei)) {
        res.status(400).json({ error: 'IMEI inválido. Debe ser 15 dígitos numéricos.' });
        return;
      }
      // Conductor: ingresa con número de GPS (IMEI). El GPS debe estar registrado por admin.
      const vRow = await pool.query(
        'SELECT v.driver_id, u.phone FROM vehicles v LEFT JOIN users u ON u.id = v.driver_id WHERE v.imei = $1 LIMIT 1',
        [imei.trim()]
      );
      const row = vRow.rows[0];
      if (!row) {
        res.status(400).json({ error: 'GPS no registrado. Contacta al administrador.' });
        return;
      }
      if (!row.driver_id || !row.phone) {
        res.status(400).json({ error: 'GPS sin conductor asignado. Contacta al administrador.' });
        return;
      }
      const code = await createOtp(row.phone);
      res.json(showCode ? { success: true, code } : { success: true });
      return;
    }

    if (phone && typeof phone === 'string') {
      if (!isValidPhone(phone)) {
        res.status(400).json({ error: 'Teléfono inválido. Usa formato: +52 222 123 4567' });
        return;
      }
      // Admin, helper, or citizen: login with phone
      const role = mode === 'citizen' ? 'citizen' : undefined;
      const code = await createOtp(phone.trim());
      await findOrCreateUser(phone.trim(), undefined, role);
      res.json(showCode ? { success: true, code } : { success: true });
      return;
    }

    res.status(400).json({ error: 'Ingresa el número de GPS (IMEI) o teléfono' });
  } catch (err: unknown) {
    logger.error('OTP request error:', err);
    res.status(500).json({ error: 'Error al generar OTP' });
  }
}));

api.post('/auth/otp/verify', authRateLimit, asyncHandler(async (req, res) => {
  try {
    const { imei, phone, code, name, mode } = req.body;
    if (!code) {
      res.status(400).json({ error: 'Código requerido' });
      return;
    }

    if (imei && typeof imei === 'string') {
      // Conductor: verificar por IMEI
      const vRow = await pool.query(
        'SELECT v.driver_id FROM vehicles v WHERE v.imei = $1 LIMIT 1',
        [imei.trim()]
      );
      const row = vRow.rows[0];
      if (!row || !row.driver_id) {
        res.status(400).json({ error: 'GPS no registrado o sin conductor' });
        return;
      }
      const uRow = await pool.query('SELECT id, phone, name, role FROM users WHERE id = $1', [row.driver_id]);
      const user = uRow.rows[0];
      if (!user) {
        res.status(400).json({ error: 'Usuario no encontrado' });
        return;
      }
      const { valid, error: otpError } = await verifyOtp(user.phone, code);
      if (!valid) {
        res.status(401).json({ error: otpError || 'Código inválido o expirado' });
        return;
      }
      const token = signToken({ userId: user.id, role: user.role });
      res.json({ token, user: { id: user.id, phone: user.phone, name: user.name, role: user.role } });
      return;
    }

    if (phone && typeof phone === 'string') {
      if (!isValidPhone(phone)) {
        res.status(400).json({ error: 'Teléfono inválido' });
        return;
      }
      // Admin/citizen: verificar por teléfono
      const { valid, user: existingUser, error: otpError } = await verifyOtp(phone.trim(), code);
      if (!valid) {
        res.status(401).json({ error: otpError || 'Código inválido o expirado' });
        return;
      }
      const role = mode === 'citizen' ? 'citizen' : undefined;
      const user = existingUser ?? await findOrCreateUser(phone, name, role);
      const token = signToken({ userId: user.id, role: user.role });
      res.json({ token, user: { id: user.id, phone: user.phone, name: user.name, role: user.role } });
      return;
    }

    res.status(400).json({ error: 'Ingresa IMEI o teléfono' });
  } catch (err: unknown) {
    logger.error('OTP verify error:', err);
    res.status(500).json({ error: 'Error al verificar OTP' });
  }
}));

api.get('/me', authMiddleware, asyncHandler(async (req, res) => {
  const { userId } = (req as any).user;
  const pg = await hasPostGis();
  const r = await pool.query(
    pg
      ? `SELECT id, phone, name, role, last_location_at, ST_X(last_location) as lng, ST_Y(last_location) as lat FROM users WHERE id = $1`
      : `SELECT id, phone, name, role, last_location_at, last_lat as lat, last_lng as lng FROM users WHERE id = $1`,
    [userId]
  );
  if (!r.rows[0]) {
    res.status(404).json({ error: 'Usuario no encontrado' });
    return;
  }
  const u = r.rows[0];
  const lastLocation = (u.lng != null && u.lat != null) ? { lng: parseFloat(u.lng), lat: parseFloat(u.lat) } : null;
  const { lng, lat, ...rest } = u;
  res.json({ ...rest, lastLocation });
}));

api.put('/me/location', authMiddleware, asyncHandler(async (req, res) => {
  const { userId } = (req as any).user;
  const { latitude, longitude } = req.body;
  if (!isValidCoords(latitude, longitude)) {
    res.status(400).json({ error: 'Latitud (-90..90) y longitud (-180..180) requeridas' });
    return;
  }
  const pg = await hasPostGis();
  await pool.query(
    pg
      ? `UPDATE users SET last_location = ST_SetSRID(ST_MakePoint($2, $1), 4326), last_location_at = NOW(), updated_at = NOW() WHERE id = $3`
      : `UPDATE users SET last_lat = $1, last_lng = $2, last_location_at = NOW(), updated_at = NOW() WHERE id = $3`,
    [latitude, longitude, userId]
  );
  res.json({ success: true });
}));

api.post('/helpers/location', authMiddleware, requireRole('helper', 'driver'), asyncHandler(async (req, res) => {
  const { userId } = (req as any).user;
  const { latitude, longitude } = req.body;
  if (!isValidCoords(latitude, longitude)) {
    res.status(400).json({ error: 'latitude (-90..90) y longitude (-180..180) requeridos' });
    return;
  }
  const pg = await hasPostGis();
  if (pg) {
    await pool.query(
      `INSERT INTO helper_locations (user_id, geom, updated_at) VALUES ($1, ST_SetSRID(ST_MakePoint($3, $2), 4326), NOW())
       ON CONFLICT (user_id) DO UPDATE SET geom = ST_SetSRID(ST_MakePoint($3, $2), 4326), updated_at = NOW()`,
      [userId, latitude, longitude]
    );
    await pool.query(
      `UPDATE users SET last_location = ST_SetSRID(ST_MakePoint($2, $1), 4326), last_location_at = NOW(), updated_at = NOW() WHERE id = $3`,
      [latitude, longitude, userId]
    );
  } else {
    await pool.query(
      `UPDATE users SET last_lat = $1, last_lng = $2, last_location_at = NOW(), updated_at = NOW() WHERE id = $3`,
      [latitude, longitude, userId]
    );
  }
  res.json({ success: true });
}));

api.get('/vehicles', authMiddleware, requireRole('admin', 'helper', 'driver'), asyncHandler(async (req, res) => {
  const r = await pool.query(
    `SELECT v.id, v.plate, v.name, v.imei, v.driver_id, u.name as driver_name
     FROM vehicles v
     LEFT JOIN users u ON v.driver_id = u.id
     ORDER BY v.plate`
  );
  res.json(r.rows);
}));

api.get('/vehicles/:id', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId, role } = (req as any).user;
  const r = await pool.query(
    `SELECT v.*, u.name as driver_name FROM vehicles v
     LEFT JOIN users u ON v.driver_id = u.id WHERE v.id = $1`,
    [id]
  );
  const v = r.rows[0];
  if (!v) {
    res.status(404).json({ error: 'Vehículo no encontrado' });
    return;
  }
  if (role !== 'admin' && v.driver_id !== userId) {
    res.status(403).json({ error: 'Acceso denegado' });
    return;
  }
  res.json(v);
}));

api.post('/vehicles', authMiddleware, requireRole('admin'), asyncHandler(async (req, res) => {
  const { plate, name, imei, driver_id } = req.body;
  if (!plate || !imei) {
    res.status(400).json({ error: 'Placa e IMEI requeridos' });
    return;
  }
  try {
    const r = await pool.query(
      `INSERT INTO vehicles (plate, name, imei, driver_id) VALUES ($1, $2, $3, $4) RETURNING *`,
      [plate, name || null, imei, driver_id || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e?.code === '23505') {
      res.status(409).json({ error: 'Ese IMEI o placa ya existe. Usa otro.' });
      return;
    }
    throw err;
  }
}));

api.put('/vehicles/:id', authMiddleware, requireRole('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { plate, name, imei, driver_id } = req.body;
  const driverId = driver_id === '' || driver_id === undefined ? null : driver_id;
  try {
    await pool.query(
      `UPDATE vehicles SET plate = COALESCE($2, plate), name = COALESCE($3, name),
       imei = COALESCE($4, imei), driver_id = $5, updated_at = NOW()
       WHERE id = $1`,
      [id, plate, name, imei, driverId]
    );
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e?.code === '23505') {
      res.status(409).json({ error: 'Ese IMEI o placa ya existe. Usa otro.' });
      return;
    }
    throw err;
  }
  const r = await pool.query(
    `SELECT v.*, u.name as driver_name FROM vehicles v
     LEFT JOIN users u ON v.driver_id = u.id WHERE v.id = $1`,
    [id]
  );
  if (!r.rows[0]) {
    res.status(404).json({ error: 'Vehículo no encontrado' });
    return;
  }
  res.json(r.rows[0]);
}));

api.delete('/vehicles/:id', authMiddleware, requireRole('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const r = await pool.query('DELETE FROM vehicles WHERE id = $1 RETURNING id', [id]);
  if (!r.rows[0]) {
    res.status(404).json({ error: 'Vehículo no encontrado' });
    return;
  }
  res.json({ success: true });
}));

api.get('/incidents', authMiddleware, asyncHandler(async (req, res) => {
  const { userId, role } = (req as any).user;
  let query = `
    SELECT i.*, v.plate, u.name as driver_name,
           i.longitude, i.latitude
    FROM incidents i
    LEFT JOIN vehicles v ON i.vehicle_id = v.id
    LEFT JOIN users u ON i.driver_id = u.id
  `;
  const params: unknown[] = [];
  if (role === 'helper') {
    query += ` WHERE EXISTS (SELECT 1 FROM incident_followers f WHERE f.incident_id = i.id AND f.user_id = $1)`;
    params.push(userId);
  } else if (role === 'driver') {
    query += ` WHERE i.driver_id = $1 OR EXISTS (SELECT 1 FROM incident_followers f WHERE f.incident_id = i.id AND f.user_id = $1)`;
    params.push(userId);
  } else if (role === 'citizen') {
    query += ` WHERE i.driver_id = $1`;
    params.push(userId);
  }
  query += ` ORDER BY i.started_at DESC LIMIT 50`;
  const r = await pool.query(query, params);
  res.json(r.rows);
}));

// IDOR: admin ve todo; helper solo incidentes en incident_followers; driver solo incidentes de su vehículo
api.get('/incidents/:id', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId, role } = (req as any).user;

  let query = `
    SELECT i.*, v.plate, u.name as driver_name, i.longitude, i.latitude
    FROM incidents i
    LEFT JOIN vehicles v ON i.vehicle_id = v.id
    LEFT JOIN users u ON i.driver_id = u.id
    WHERE i.id = $1`;
  const params: unknown[] = [id];

  if (role === 'helper') {
    query += ` AND EXISTS (SELECT 1 FROM incident_followers f WHERE f.incident_id = i.id AND f.user_id = $2)`;
    params.push(userId);
  } else if (role === 'driver') {
    query += ` AND (i.driver_id = $2 OR EXISTS (SELECT 1 FROM incident_followers f WHERE f.incident_id = i.id AND f.user_id = $2))`;
    params.push(userId);
  }

  const r = await pool.query(query, params);
  const inc = r.rows[0];
  if (!inc) {
    res.status(404).json({ error: 'Incidente no encontrado' });
    return;
  }
  const followers = await pool.query(
    `SELECT f.*, u.name FROM incident_followers f
     JOIN users u ON f.user_id = u.id WHERE f.incident_id = $1`,
    [id]
  );
  res.json({ ...inc, followers: followers.rows });
}));

api.delete('/incidents/:id', authMiddleware, requireRole('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const r = await pool.query('DELETE FROM incidents WHERE id = $1 RETURNING id', [id]);
  if (!r.rows[0]) {
    res.status(404).json({ error: 'Incidente no encontrado' });
    return;
  }
  res.json({ success: true });
}));

// IDOR: admin puede cambiar cualquier incidente; helper/driver solo los que tiene en incident_followers
api.put('/incidents/:id/status', authMiddleware, requireRole('admin', 'helper', 'driver'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const { userId, role } = (req as any).user;

  if (!['active', 'attending', 'resolved', 'cancelled'].includes(status)) {
    res.status(400).json({ error: 'Estado inválido' });
    return;
  }
  // Helper/driver no pueden marcar resolved (solo admin)
  if ((role === 'helper' || role === 'driver') && status === 'resolved') {
    res.status(403).json({ error: 'Solo un administrador puede resolver incidentes' });
    return;
  }

  if ((role === 'helper' || role === 'driver') && status === 'attending') {
    // Auto-asignar: si el helper recibió el panic por WebSocket pero no estaba cerca, añadirlo a incident_followers (solo incidentes active)
    const incCheck = await pool.query('SELECT 1 FROM incidents WHERE id = $1 AND status = $2', [id, 'active']);
    if (incCheck.rowCount) {
      await pool.query(
        `INSERT INTO incident_followers (incident_id, user_id, status) VALUES ($1, $2, 'en_route')
         ON CONFLICT (incident_id, user_id) DO UPDATE SET status = 'en_route'`,
        [id, userId]
      );
    }
  }

  let updateQuery = `UPDATE incidents SET status = $2, updated_at = NOW()`;
  const params: unknown[] = [id, status];
  if (status === 'resolved' || status === 'cancelled') {
    updateQuery += `, resolved_at = NOW()`;
  }
  updateQuery += ` WHERE id = $1`;
  if (role === 'helper' || role === 'driver') {
    updateQuery += ` AND EXISTS (SELECT 1 FROM incident_followers f WHERE f.incident_id = $1 AND f.user_id = $3)`;
    params.push(userId);
  }
  updateQuery += ` RETURNING *`;

  const r = await pool.query(updateQuery, params);
  if (!r.rows[0]) {
    res.status(404).json({ error: 'Incidente no encontrado' });
    return;
  }
  res.json(r.rows[0]);
}));

// Helper/driver: declinar incidente (remover de incident_followers). Idempotente: si no está asignado, 200 OK igual.
api.delete('/incidents/:id/followers/me', authMiddleware, requireRole('helper', 'driver'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId } = (req as any).user;
  await pool.query(
    'DELETE FROM incident_followers WHERE incident_id = $1 AND user_id = $2',
    [id, userId]
  );
  res.json({ success: true });
}));

api.get('/alerts', authMiddleware, requireRole('admin', 'helper', 'driver'), asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(String(req.query.limit || 100), 10) || 100, 500);
  const since = req.query.since ? new Date(String(req.query.since)) : undefined;
  const { userId, role } = (req as any).user;
  const driverUserId = role === 'driver' || role === 'helper' ? userId : undefined;
  const alerts = await getAlerts(limit, since, driverUserId);
  res.json(alerts);
}));

api.delete('/alerts/:id', authMiddleware, requireRole('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const r = await pool.query('DELETE FROM alerts WHERE id = $1 RETURNING id', [id]);
  if (!r.rows[0]) {
    res.status(404).json({ error: 'Alerta no encontrada' });
    return;
  }
  res.json({ success: true, deleted: 1 });
}));

api.delete('/alerts', authMiddleware, requireRole('admin'), asyncHandler(async (req, res) => {
  const days = req.query.days ? parseInt(String(req.query.days), 10) : null;
  const all = req.query.all === '1' || req.query.all === 'true';
  let before: Date | undefined;
  if (all) {
    before = undefined;
  } else if (days != null && days > 0) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    before = d;
  } else {
    res.status(400).json({
      error: 'Especifica ?days=N (borrar alertas anteriores a N días) o ?all=1 (borrar todas)',
    });
    return;
  }
  const { deleted } = await deleteAlerts(before);
  res.json({ success: true, deleted });
}));

// Posiciones de MIS vehículos (solo drivers): vehículos donde driver_id = userId
api.get('/gps/my-positions', authMiddleware, requireRole('driver'), asyncHandler(async (req, res) => {
  const { userId } = (req as any).user;
  const limit = Math.min(parseInt(String(req.query.limit || 20), 10) || 20, 50);
  const pg = await hasPostGis();

  const subq = pg
    ? `SELECT DISTINCT ON (g.imei) g.imei, g.vehicle_id, g.latitude, g.longitude, g.speed, g.timestamp_at, v.plate
       FROM gps_logs g
       JOIN vehicles v ON v.id = g.vehicle_id AND v.driver_id = $1
       ORDER BY g.imei, g.timestamp_at DESC`
    : `SELECT DISTINCT ON (g.imei) g.imei, g.vehicle_id, g.latitude, g.longitude, g.speed, g.timestamp_at, v.plate
       FROM gps_logs g
       JOIN vehicles v ON v.id = g.vehicle_id AND v.driver_id = $1
       ORDER BY g.imei, g.timestamp_at DESC`;

  const r = await pool.query(
    `SELECT * FROM (${subq}) sq WHERE latitude != 0 OR longitude != 0 LIMIT $2`,
    [userId, limit]
  );
  res.json(
    r.rows.map((row: { imei: string; vehicle_id: string; plate: string; latitude: string; longitude: string; speed: number; timestamp_at: string }) => ({
      imei: row.imei,
      vehicleId: row.vehicle_id,
      plate: row.plate,
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
      speed: row.speed ?? 0,
      timestampAt: row.timestamp_at,
    }))
  );
}));

// Últimas posiciones por IMEI (admin) - incluye dispositivos no registrados
api.get('/gps/latest-positions', authMiddleware, requireRole('admin'), asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(String(req.query.limit || 50), 10) || 50, 200);
  const pg = await hasPostGis();

  const subq = pg
    ? `SELECT DISTINCT ON (g.imei) g.imei, g.vehicle_id, g.latitude, g.longitude, g.speed, g.timestamp_at, v.plate
       FROM gps_logs g
       LEFT JOIN vehicles v ON v.id = g.vehicle_id
       ORDER BY g.imei, g.timestamp_at DESC`
    : `SELECT DISTINCT ON (g.imei) g.imei, g.vehicle_id, g.latitude, g.longitude, g.speed, g.timestamp_at, v.plate
       FROM gps_logs g
       LEFT JOIN vehicles v ON v.id = g.vehicle_id
       ORDER BY g.imei, g.timestamp_at DESC`;

  const r = await pool.query(
    `SELECT * FROM (${subq}) sq WHERE latitude != 0 OR longitude != 0 LIMIT $1`,
    [limit]
  );
  res.json(
    r.rows.map((row: { imei: string; vehicle_id: string; plate: string; latitude: string; longitude: string; speed: number; timestamp_at: string }) => ({
      imei: row.imei,
      vehicleId: row.vehicle_id,
      plate: row.plate,
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
      speed: row.speed ?? 0,
      timestampAt: row.timestamp_at,
    }))
  );
}));

api.get('/gps/logs', authMiddleware, asyncHandler(async (req, res) => {
  const { vehicle_id, limit = 100 } = req.query;
  const { userId, role } = (req as any).user;

  if (!vehicle_id || typeof vehicle_id !== 'string') {
    res.status(400).json({ error: 'vehicle_id requerido' });
    return;
  }

  if (role === 'admin') {
    // admin: sin restricción
  } else if (role === 'driver') {
    const vCheck = await pool.query(
      'SELECT 1 FROM vehicles WHERE id = $1 AND driver_id = $2 LIMIT 1',
      [vehicle_id, userId]
    );
    if (vCheck.rowCount === 0) {
      res.status(403).json({ error: 'Acceso denegado a logs de este vehículo' });
      return;
    }
  } else if (role === 'helper') {
    const vCheck = await pool.query(
      `SELECT 1 FROM incidents i
       JOIN incident_followers f ON f.incident_id = i.id AND f.user_id = $2
       WHERE i.vehicle_id = $1 LIMIT 1`,
      [vehicle_id, userId]
    );
    if (vCheck.rowCount === 0) {
      res.status(403).json({ error: 'Acceso denegado: solo puede ver logs de vehículos en incidentes que sigue' });
      return;
    }
  } else {
    res.status(403).json({ error: 'Acceso denegado' });
    return;
  }

  const r = await pool.query(
    `SELECT id, latitude, longitude, speed, timestamp_at, created_at
     FROM gps_logs WHERE vehicle_id = $1 ORDER BY timestamp_at DESC LIMIT $2`,
    [vehicle_id, Math.min(Number(limit), 500)]
  );
  res.json(r.rows);
}));

// Conductores y helpers cercanos (ayuda mutua: cualquiera con vehículo o rol helper)
api.get('/helpers/nearby', authMiddleware, asyncHandler(async (req, res) => {
  const { latitude, longitude, radius_km = 3 } = req.query;
  if (typeof latitude !== 'string' || typeof longitude !== 'string') {
    res.status(400).json({ error: 'latitude y longitude requeridos' });
    return;
  }
  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);
  const radiusM = (parseFloat(String(radius_km)) || 3) * 1000;
  const pg = await hasPostGis();
  const r = pg
    ? await pool.query(
        `SELECT u.id, u.name, u.phone,
                ST_Distance(COALESCE(hl.geom, u.last_location)::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography)::int as distance_m
         FROM users u LEFT JOIN helper_locations hl ON hl.user_id = u.id
         WHERE u.is_active AND COALESCE(hl.geom, u.last_location) IS NOT NULL
           AND (u.role = 'helper' OR EXISTS (SELECT 1 FROM vehicles v WHERE v.driver_id = u.id))
           AND ST_DWithin(COALESCE(hl.geom, u.last_location)::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3)
         ORDER BY distance_m LIMIT 20`,
        [lat, lon, radiusM]
      )
    : await pool.query(
        `SELECT u.id, u.name, u.phone,
                (6371000 * acos(LEAST(1, GREATEST(-1,
                  cos(radians($1)) * cos(radians(u.last_lat)) * cos(radians(u.last_lng) - radians($2)) + sin(radians($1)) * sin(radians(u.last_lat))
                ))))::int as distance_m
         FROM users u
         WHERE u.is_active AND u.last_lat IS NOT NULL AND u.last_lng IS NOT NULL
           AND (u.role = 'helper' OR EXISTS (SELECT 1 FROM vehicles v WHERE v.driver_id = u.id))
           AND (6371000 * acos(LEAST(1, GREATEST(-1,
             cos(radians($1)) * cos(radians(u.last_lat)) * cos(radians(u.last_lng) - radians($2)) + sin(radians($1)) * sin(radians(u.last_lat))
           )))) <= $3
         ORDER BY distance_m LIMIT 20`,
        [lat, lon, radiusM]
      );
  res.json(r.rows);
}));

api.get('/users', authMiddleware, requireRole('admin'), asyncHandler(async (req, res) => {
  const r = await pool.query(
    'SELECT id, phone, name, role, is_active, last_location_at, created_at FROM users ORDER BY name'
  );
  res.json(r.rows);
}));

api.post('/users', authMiddleware, requireRole('admin'), asyncHandler(async (req, res) => {
  const { phone, name, role } = req.body;
  if (!phone || typeof phone !== 'string' || !name || typeof name !== 'string') {
    res.status(400).json({ error: 'Teléfono y nombre requeridos' });
    return;
  }
  const finalRole = ['driver', 'helper', 'admin', 'citizen'].includes(role) ? role : 'driver';
  const existing = await pool.query('SELECT id FROM users WHERE phone = $1', [phone]);
  if (existing.rows[0]) {
    res.status(409).json({ error: 'Ya existe un usuario con ese teléfono' });
    return;
  }
  const r = await pool.query(
    `INSERT INTO users (phone, name, role) VALUES ($1, $2, $3) RETURNING id, phone, name, role, created_at`,
    [phone.trim(), name.trim(), finalRole]
  );
  res.status(201).json(r.rows[0]);
}));

api.put('/users/:id', authMiddleware, requireRole('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, phone } = req.body;
  const updates: string[] = [];
  const params: unknown[] = [];
  let p = 1;
  if (name != null && typeof name === 'string') {
    updates.push(`name = $${p++}`);
    params.push(name.trim());
  }
  if (phone != null && typeof phone === 'string') {
    const existing = await pool.query('SELECT id FROM users WHERE phone = $1 AND id != $2', [phone.trim(), id]);
    if (existing.rows[0]) {
      res.status(409).json({ error: 'Ya existe otro usuario con ese teléfono' });
      return;
    }
    updates.push(`phone = $${p++}`);
    params.push(phone.trim());
  }
  if (updates.length === 0) {
    res.status(400).json({ error: 'Indica name o phone para actualizar' });
    return;
  }
  params.push(id);
  const r = await pool.query(
    `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${p} RETURNING id, phone, name, role, is_active`,
    params
  );
  if (!r.rows[0]) {
    res.status(404).json({ error: 'Usuario no encontrado' });
    return;
  }
  res.json(r.rows[0]);
}));

api.put('/users/:id/role', authMiddleware, requireRole('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  if (!['driver', 'helper', 'admin', 'citizen'].includes(role)) {
    res.status(400).json({ error: 'Rol inválido' });
    return;
  }
  const r = await pool.query(
    'UPDATE users SET role = $2, updated_at = NOW() WHERE id = $1 RETURNING id, phone, name, role',
    [id, role]
  );
  if (!r.rows[0]) {
    res.status(404).json({ error: 'Usuario no encontrado' });
    return;
  }
  res.json(r.rows[0]);
}));

api.put('/users/:id/block', authMiddleware, requireRole('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const r = await pool.query(
    'UPDATE users SET is_active = NOT COALESCE(is_active, true), updated_at = NOW() WHERE id = $1 RETURNING id, phone, name, role, is_active',
    [id]
  );
  if (!r.rows[0]) {
    res.status(404).json({ error: 'Usuario no encontrado' });
    return;
  }
  res.json(r.rows[0]);
}));

// Mobile panic button: any authenticated user can trigger a panic from their phone
const panicRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: { error: 'Demasiadas alertas. Espera 1 minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req as any).user?.userId || req.ip || 'unknown',
});

api.post('/panic', authMiddleware, panicRateLimit, asyncHandler(async (req, res) => {
  const { userId } = (req as any).user;
  const { latitude, longitude } = req.body;

  if (!isValidCoords(latitude, longitude)) {
    res.status(400).json({ error: 'Ubicación GPS requerida (latitude, longitude)' });
    return;
  }

  const pg = await hasPostGis();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Get user info
    const userResult = await client.query(
      'SELECT id, name, phone, role FROM users WHERE id = $1',
      [userId]
    );
    const user = userResult.rows[0];
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    // Check if user has a vehicle (optional)
    const vehicleResult = await client.query(
      'SELECT id, plate, imei FROM vehicles WHERE driver_id = $1 LIMIT 1',
      [userId]
    );
    const vehicle = vehicleResult.rows[0];

    // Create incident
    let incidentResult;
    if (pg) {
      incidentResult = await client.query(
        `INSERT INTO incidents (vehicle_id, driver_id, imei, status, geom, latitude, longitude, started_at, source)
         VALUES ($1, $2, $3, 'active', ST_SetSRID(ST_MakePoint($5, $4), 4326), $4, $5, NOW(), 'mobile')
         RETURNING id`,
        [vehicle?.id ?? null, userId, vehicle?.imei ?? null, latitude, longitude]
      );
    } else {
      incidentResult = await client.query(
        `INSERT INTO incidents (vehicle_id, driver_id, imei, status, latitude, longitude, started_at, source)
         VALUES ($1, $2, $3, 'active', $4, $5, NOW(), 'mobile')
         RETURNING id`,
        [vehicle?.id ?? null, userId, vehicle?.imei ?? null, latitude, longitude]
      );
    }
    const incident = incidentResult.rows[0];

    // Update user location
    if (pg) {
      await client.query(
        `UPDATE users SET last_location = ST_SetSRID(ST_MakePoint($2, $1), 4326), last_location_at = NOW(), updated_at = NOW() WHERE id = $3`,
        [latitude, longitude, userId]
      );
    } else {
      await client.query(
        `UPDATE users SET last_lat = $1, last_lng = $2, last_location_at = NOW(), updated_at = NOW() WHERE id = $3`,
        [latitude, longitude, userId]
      );
    }

    // Find nearby helpers/drivers
    const radiusM = parseInt(process.env.PANIC_ALERT_RADIUS_M || '2000', 10) || 2000;
    let nearbyDrivers: { id: string; phone: string; name: string }[] = [];
    if (pg) {
      const nearbyResult = await client.query(
        `SELECT DISTINCT u.id, u.phone, u.name
         FROM users u
         LEFT JOIN helper_locations hl ON hl.user_id = u.id
         WHERE u.is_active AND u.id != $4
           AND (
             (hl.user_id IS NOT NULL AND ST_DWithin(hl.geom::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3))
             OR (hl.user_id IS NULL AND u.last_location IS NOT NULL AND ST_DWithin(u.last_location::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3))
           )`,
        [latitude, longitude, radiusM, userId]
      );
      nearbyDrivers = nearbyResult.rows;
    } else {
      const nearbyResult = await client.query(
        `SELECT DISTINCT u.id, u.phone, u.name
         FROM users u
         WHERE u.is_active AND u.id != $4
           AND u.last_lat IS NOT NULL AND u.last_lng IS NOT NULL
           AND (6371000 * acos(LEAST(1, GREATEST(-1,
             cos(radians($1)) * cos(radians(u.last_lat)) * cos(radians(u.last_lng) - radians($2)) + sin(radians($1)) * sin(radians(u.last_lat))
           )))) <= $3`,
        [latitude, longitude, radiusM, userId]
      );
      nearbyDrivers = nearbyResult.rows;
    }

    // Add nearby users as incident followers
    for (const driver of nearbyDrivers) {
      await client.query(
        'INSERT INTO incident_followers (incident_id, user_id, status) VALUES ($1, $2, $3) ON CONFLICT (incident_id, user_id) DO NOTHING',
        [incident.id, driver.id, 'notified']
      );
    }

    // Broadcast panic via WebSocket
    broadcastPanic(
      {
        incidentId: incident.id,
        imei: vehicle?.imei ?? 'mobile',
        vehicleId: vehicle?.id,
        plate: vehicle?.plate ?? user.name ?? 'SOS Móvil',
        latitude,
        longitude,
        timestamp: Date.now(),
        nearbyCount: nearbyDrivers.length,
      },
      nearbyDrivers.map((d) => d.id)
    );

    await client.query('COMMIT');

    logger.info(`MOBILE PANIC userId=${userId} name=${user.name} lat=${latitude} lng=${longitude} nearby=${nearbyDrivers.length}`);

    res.json({
      success: true,
      incidentId: incident.id,
      nearbyCount: nearbyDrivers.length,
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}));

// Location update: any authenticated user can report their position
const locationRateLimit = rateLimit({
  windowMs: 10 * 1000,
  max: 5,
  message: { error: 'Demasiadas actualizaciones de ubicación' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req as any).user?.userId || req.ip || 'unknown',
});

api.post('/location', authMiddleware, locationRateLimit, asyncHandler(async (req, res) => {
  const { userId } = (req as any).user;
  const { latitude, longitude } = req.body;

  if (!isValidCoords(latitude, longitude)) {
    res.status(400).json({ error: 'Ubicación GPS requerida (latitude, longitude)' });
    return;
  }

  const pg = await hasPostGis();
  if (pg) {
    await pool.query(
      `UPDATE users SET last_location = ST_SetSRID(ST_MakePoint($2, $1), 4326), last_location_at = NOW(), updated_at = NOW() WHERE id = $3`,
      [latitude, longitude, userId]
    );
  } else {
    await pool.query(
      `UPDATE users SET last_lat = $1, last_lng = $2, last_location_at = NOW(), updated_at = NOW() WHERE id = $3`,
      [latitude, longitude, userId]
    );
  }

  res.json({ success: true });
}));

api.delete('/users/:id', authMiddleware, requireRole('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId } = (req as any).user;
  if (id === userId) {
    res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
    return;
  }
  const r = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
  if (!r.rows[0]) {
    res.status(404).json({ error: 'Usuario no encontrado' });
    return;
  }
  res.json({ success: true });
}));

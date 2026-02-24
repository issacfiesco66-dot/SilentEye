/**
 * SilentEye — Plataforma de Seguridad Vehicular
 * Copyright (c) 2026 Christian Fiesco. All rights reserved.
 * PROPRIETARY AND CONFIDENTIAL — See LICENSE file for details.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { createHmac, timingSafeEqual } from 'crypto';
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
import { broadcastLocation, broadcastPanic, broadcastIncidentUpdate } from '../services/websocket.js';
import { sendPushToUsers, saveSubscription, removeSubscription, getVapidPublicKey } from '../services/push-service.js';
import { sendOtpEmail, isEmailEnabled, sendHelperRespondingEmail, sendIncidentResolvedEmail, sendWitnessRequestEmail } from '../services/email-service.js';
import { sendOtpSms, isSmsEnabled } from '../services/sms-service.js';
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
const CITIZEN_PHONE_REGEX = /^\+?\d[\d\s\-()]{9,19}$/; // min 10 digits for citizens
const IMEI_REGEX = /^\d{15}$/;

function isValidPhone(phone: string): boolean {
  return typeof phone === 'string' && PHONE_REGEX.test(phone.trim()) && phone.trim().length <= 20;
}

/** Stricter validation for citizen registration: requires at least 10 actual digits */
function isValidCitizenPhone(phone: string): boolean {
  if (!isValidPhone(phone)) return false;
  const digits = phone.replace(/[^\d]/g, '');
  return digits.length >= 10 && CITIZEN_PHONE_REGEX.test(phone.trim());
}

/** Per-phone cooldown: returns seconds remaining if too soon, 0 if ok */
async function checkPhoneCooldown(phone: string, cooldownSec: number): Promise<number> {
  try {
    const r = await pool.query(
      `SELECT EXTRACT(EPOCH FROM (NOW() - MAX(created_at)))::int as elapsed
       FROM otp_codes WHERE phone = $1 AND created_at > NOW() - INTERVAL '5 minutes'`,
      [phone]
    );
    const elapsed = r.rows[0]?.elapsed;
    if (elapsed !== null && elapsed < cooldownSec) {
      return cooldownSec - elapsed;
    }
  } catch { /* ignore if column issues */ }
  return 0;
}

/** Per-phone hourly limit */
async function checkPhoneHourlyLimit(phone: string, maxPerHour: number): Promise<boolean> {
  try {
    const r = await pool.query(
      `SELECT COUNT(*)::int as cnt FROM otp_codes WHERE phone = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
      [phone]
    );
    return (r.rows[0]?.cnt ?? 0) < maxPerHour;
  } catch { return true; }
}

function isValidImeiInput(imei: string): boolean {
  return typeof imei === 'string' && IMEI_REGEX.test(imei.trim());
}

function isValidCoords(lat: unknown, lng: unknown): boolean {
  return typeof lat === 'number' && typeof lng === 'number'
    && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
    && isFinite(lat) && isFinite(lng);
}

// HMAC signing for witness response URLs (prevents URL tampering)
function signWitnessToken(incidentId: string, userId: string, response: string): string {
  const secret = process.env.JWT_SECRET!; // Enforced at startup in auth.ts (min 32 chars)
  return createHmac('sha256', secret).update(`${incidentId}:${userId}:${response}`).digest('hex');
}

// Setup: migrar y seed (requiere ?secret=XXX, MIGRATE_SECRET en Fly Secrets)
const MIGRATE_SECRET = process.env.MIGRATE_SECRET || '';
function checkSetupSecret(req: import('express').Request): boolean {
  const secret = String(req.query.secret || req.body?.secret || '');
  if (!MIGRATE_SECRET || MIGRATE_SECRET.length < 16 || secret.length !== MIGRATE_SECRET.length) return false;
  return timingSafeEqual(Buffer.from(secret), Buffer.from(MIGRATE_SECRET));
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

// Login: conductor con IMEI, admin/helper con teléfono, ciudadano con email+mode
api.post('/auth/otp/request', authRateLimit, asyncHandler(async (req, res) => {
  try {
    const { imei, phone, email, mode } = req.body;
    // SECURITY: NEVER return OTP codes in production responses
    const showCode = process.env.NODE_ENV !== 'production';

    if (imei && typeof imei === 'string') {
      if (!isValidImeiInput(imei)) {
        res.status(400).json({ error: 'IMEI inválido. Debe ser 15 dígitos numéricos.' });
        return;
      }
      // Conductor: ingresa con número de GPS (IMEI). El GPS debe estar registrado por admin.
      const vRow = await pool.query(
        'SELECT v.driver_id, u.phone, u.email FROM vehicles v LEFT JOIN users u ON u.id = v.driver_id WHERE v.imei = $1 LIMIT 1',
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

      // Use email if available (saves SMS costs), otherwise fall back to phone
      const otpIdentifier = row.email || row.phone;
      const code = await createOtp(otpIdentifier);

      // Send OTP via email if driver has email registered
      if (row.email && isEmailEnabled()) {
        const sent = await sendOtpEmail(row.email, code);
        if (!sent) {
          res.status(500).json({ error: 'No se pudo enviar el correo. Verifica el email del conductor.' });
          return;
        }
        res.json({ success: true, emailSent: true, emailHint: row.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') });
        return;
      }

      // Fallback: SMS if Twilio configured
      if (isSmsEnabled()) {
        const sent = await sendOtpSms(row.phone, code);
        if (!sent) {
          logger.warn(`SMS fallback: no se pudo enviar OTP a conductor ***${row.phone.slice(-4)}`);
        }
        res.json({ success: true, smsSent: sent });
        return;
      }

      res.json(showCode ? { success: true, code } : { success: true });
      return;
    }

    // Citizen mode: email-based OTP
    if (mode === 'citizen' && email && typeof email === 'string') {
      const cleanEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        res.status(400).json({ error: 'Email inválido. Ingresa un correo real, ej: tu@correo.com' });
        return;
      }

      // Per-email cooldown (60s)
      const remaining = await checkPhoneCooldown(cleanEmail, 60);
      if (remaining > 0) {
        res.status(429).json({ error: `Espera ${remaining} segundos antes de solicitar otro código` });
        return;
      }

      // Per-email hourly limit (5)
      const withinLimit = await checkPhoneHourlyLimit(cleanEmail, 5);
      if (!withinLimit) {
        res.status(429).json({ error: 'Demasiados códigos solicitados. Intenta en 1 hora.' });
        return;
      }

      const code = await createOtp(cleanEmail);

      // Send OTP via email — NEVER return code in response
      if (isEmailEnabled()) {
        const sent = await sendOtpEmail(cleanEmail, code);
        if (!sent) {
          res.status(500).json({ error: 'No se pudo enviar el correo. Verifica tu email e intenta de nuevo.' });
          return;
        }
        res.json({ success: true, emailSent: true });
      } else {
        logger.warn(`OTP citizen sin email: ${cleanEmail}`);
        res.status(503).json({ error: 'Servicio de verificación por email no disponible. Intenta más tarde.' });
      }
      return;
    }

    if (phone && typeof phone === 'string') {
      if (!isValidPhone(phone)) {
        res.status(400).json({ error: 'Teléfono inválido. Usa formato: +52 222 123 4567' });
        return;
      }

      const cleanPhone = phone.trim();

      // Per-phone cooldown (30s for admin/helper)
      const remaining = await checkPhoneCooldown(cleanPhone, 30);
      if (remaining > 0) {
        res.status(429).json({ error: `Espera ${remaining} segundos antes de solicitar otro código` });
        return;
      }

      // Per-phone hourly limit (10 for admin/helper)
      const withinLimit = await checkPhoneHourlyLimit(cleanPhone, 10);
      if (!withinLimit) {
        res.status(429).json({ error: 'Demasiados códigos solicitados. Intenta en 1 hora.' });
        return;
      }

      // SECURITY: phone login is for pre-registered users only (admin/helper/driver).
      // Do NOT auto-create users — admin must register them first.
      const userCheck = await pool.query(
        'SELECT id, phone, role, email, is_active FROM users WHERE phone = $1',
        [cleanPhone]
      );
      if (!userCheck.rows[0]) {
        res.status(403).json({ error: 'Número no registrado. Solo usuarios registrados por el administrador pueden ingresar.' });
        return;
      }
      if (userCheck.rows[0].is_active === false) {
        res.status(403).json({ error: 'Cuenta desactivada. Contacta al administrador.' });
        return;
      }

      const code = await createOtp(cleanPhone);

      // Try email delivery first (for users with email registered)
      const userEmail = userCheck.rows[0].email;
      if (userEmail && isEmailEnabled()) {
        const sent = await sendOtpEmail(userEmail, code);
        if (sent) {
          res.json({ success: true, emailSent: true, emailHint: userEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3') });
          return;
        }
      }

      // Fallback: SMS if Twilio configured
      if (userCheck.rows[0].role === 'admin' && isSmsEnabled()) {
        const sent = await sendOtpSms(cleanPhone, code);
        if (!sent) {
          logger.warn(`SMS fallback: no se pudo enviar OTP a admin ***${cleanPhone.slice(-4)}`);
        }
        res.json({ success: true, smsSent: sent });
        return;
      }

      res.json(showCode ? { success: true, code } : { success: true });
      return;
    }

    res.status(400).json({ error: 'Ingresa el número de GPS (IMEI), teléfono o email' });
  } catch (err: unknown) {
    logger.error('OTP request error:', err);
    res.status(500).json({ error: 'Error al generar OTP' });
  }
}));

api.post('/auth/otp/verify', authRateLimit, asyncHandler(async (req, res) => {
  try {
    const { imei, phone, email, code, name, mode } = req.body;
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
      const uRow = await pool.query('SELECT id, phone, name, role, email FROM users WHERE id = $1', [row.driver_id]);
      const user = uRow.rows[0];
      if (!user) {
        res.status(400).json({ error: 'Usuario no encontrado' });
        return;
      }
      // OTP was created with email if available, otherwise phone
      const otpIdentifier = user.email || user.phone;
      const { valid, error: otpError } = await verifyOtp(otpIdentifier, code);
      if (!valid) {
        res.status(401).json({ error: otpError || 'Código inválido o expirado' });
        return;
      }
      const token = signToken({ userId: user.id, role: user.role });
      res.json({ token, user: { id: user.id, phone: user.phone, name: user.name, role: user.role } });
      return;
    }

    // Citizen: verify by email
    if (mode === 'citizen' && email && typeof email === 'string') {
      const cleanEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        res.status(400).json({ error: 'Email inválido' });
        return;
      }

      const { valid, user: existingUser, error: otpError } = await verifyOtp(cleanEmail, code);
      if (!valid) {
        res.status(401).json({ error: otpError || 'Código inválido o expirado' });
        return;
      }

      // For new citizen accounts: require a real name
      if (!existingUser) {
        if (!name || typeof name !== 'string' || name.trim().length < 2) {
          res.status(400).json({ error: 'Tu nombre es requerido para registrarte (mín. 2 caracteres)' });
          return;
        }
      }

      // Use email as the phone field key (citizens identify by email)
      const user = existingUser ?? await findOrCreateUser(cleanEmail, name?.trim(), 'citizen', cleanEmail);
      const token = signToken({ userId: user.id, role: user.role });
      res.json({ token, user: { id: user.id, phone: user.phone, name: user.name, role: user.role } });
      return;
    }

    // Admin/helper: verify by phone
    if (phone && typeof phone === 'string') {
      if (!isValidPhone(phone)) {
        res.status(400).json({ error: 'Teléfono inválido' });
        return;
      }

      const { valid, user: existingUser, error: otpError } = await verifyOtp(phone.trim(), code);
      if (!valid) {
        res.status(401).json({ error: otpError || 'Código inválido o expirado' });
        return;
      }

      if (!existingUser) {
        res.status(403).json({ error: 'Número no registrado. Contacta al administrador.' });
        return;
      }
      const token = signToken({ userId: existingUser.id, role: existingUser.role });
      res.json({ token, user: { id: existingUser.id, phone: existingUser.phone, name: existingUser.name, role: existingUser.role } });
      return;
    }

    res.status(400).json({ error: 'Ingresa IMEI, teléfono o email' });
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
    `SELECT v.id, v.plate, v.name, v.imei, v.driver_id, v.parked_at, v.parked_lat, v.parked_lng, u.name as driver_name
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
  if (typeof plate !== 'string' || plate.trim().length > 20) {
    res.status(400).json({ error: 'Placa máximo 20 caracteres' });
    return;
  }
  if (typeof imei !== 'string' || !IMEI_REGEX.test(imei.trim())) {
    res.status(400).json({ error: 'IMEI inválido (15 dígitos)' });
    return;
  }
  if (name && (typeof name !== 'string' || name.trim().length > 100)) {
    res.status(400).json({ error: 'Nombre máximo 100 caracteres' });
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

// Park vehicle: activate theft detection mode
api.post('/vehicles/:id/park', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId, role } = (req as any).user;

  // Verify ownership or admin
  const v = await pool.query('SELECT id, driver_id, plate, parked_at FROM vehicles WHERE id = $1', [id]);
  if (!v.rows[0]) {
    res.status(404).json({ error: 'Vehículo no encontrado' });
    return;
  }
  if (role !== 'admin' && v.rows[0].driver_id !== userId) {
    res.status(403).json({ error: 'Solo el conductor asignado o un admin puede estacionar este vehículo' });
    return;
  }
  if (v.rows[0].parked_at) {
    res.json({ success: true, message: 'Vehículo ya estacionado', parked_at: v.rows[0].parked_at });
    return;
  }

  // Get last known position from gps_logs
  const lastPos = await pool.query(
    `SELECT latitude, longitude FROM gps_logs WHERE vehicle_id = $1 AND latitude != 0 ORDER BY timestamp_at DESC LIMIT 1`,
    [id]
  );
  const lat = lastPos.rows[0]?.latitude ?? null;
  const lng = lastPos.rows[0]?.longitude ?? null;

  await pool.query(
    `UPDATE vehicles SET parked_at = NOW(), parked_lat = $2, parked_lng = $3, updated_at = NOW() WHERE id = $1`,
    [id, lat, lng]
  );

  logger.info(`VEHICLE PARKED id=${id} plate=${v.rows[0].plate} by userId=${userId} at=${lat},${lng}`);
  res.json({ success: true, parked_at: new Date().toISOString(), parked_lat: lat, parked_lng: lng });
}));

// Unpark vehicle: deactivate theft detection mode
api.post('/vehicles/:id/unpark', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId, role } = (req as any).user;

  const v = await pool.query('SELECT id, driver_id, plate, parked_at FROM vehicles WHERE id = $1', [id]);
  if (!v.rows[0]) {
    res.status(404).json({ error: 'Vehículo no encontrado' });
    return;
  }
  if (role !== 'admin' && v.rows[0].driver_id !== userId) {
    res.status(403).json({ error: 'Solo el conductor asignado o un admin puede desestacionar este vehículo' });
    return;
  }
  if (!v.rows[0].parked_at) {
    res.json({ success: true, message: 'Vehículo no estaba estacionado' });
    return;
  }

  await pool.query(
    `UPDATE vehicles SET parked_at = NULL, parked_lat = NULL, parked_lng = NULL, updated_at = NOW() WHERE id = $1`,
    [id]
  );

  logger.info(`VEHICLE UNPARKED id=${id} plate=${v.rows[0].plate} by userId=${userId}`);
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
    query += ` WHERE i.status IN ('active', 'attending', 'localizado') OR EXISTS (SELECT 1 FROM incident_followers f WHERE f.incident_id = i.id AND f.user_id = $1)`;
    params.push(userId);
  } else if (role === 'driver') {
    query += ` WHERE i.status IN ('active', 'attending', 'localizado') OR i.driver_id = $1 OR EXISTS (SELECT 1 FROM incident_followers f WHERE f.incident_id = i.id AND f.user_id = $1)`;
    params.push(userId);
  } else if (role === 'citizen') {
    query += ` WHERE i.driver_id = $1 OR EXISTS (SELECT 1 FROM incident_followers f WHERE f.incident_id = i.id AND f.user_id = $1)`;
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
  } else if (role === 'driver' || role === 'citizen') {
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
const VALID_INCIDENT_STATUSES = ['active', 'attending', 'localizado', 'recuperado', 'resolved', 'falsa_alarma', 'cancelled'];
const TERMINAL_STATUSES = ['resolved', 'recuperado', 'falsa_alarma', 'cancelled'];
const ADMIN_ONLY_STATUSES = ['resolved'];

api.put('/incidents/:id/status', authMiddleware, requireRole('admin', 'helper', 'driver'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const { userId, role } = (req as any).user;

  if (!VALID_INCIDENT_STATUSES.includes(status)) {
    res.status(400).json({ error: `Estado inválido. Válidos: ${VALID_INCIDENT_STATUSES.join(', ')}` });
    return;
  }
  // Solo admin puede marcar resolved
  if ((role === 'helper' || role === 'driver') && ADMIN_ONLY_STATUSES.includes(status)) {
    res.status(403).json({ error: 'Solo un administrador puede marcar ese estado' });
    return;
  }

  if ((role === 'helper' || role === 'driver') && status === 'attending') {
    const incCheck = await pool.query('SELECT 1 FROM incidents WHERE id = $1 AND status IN ($2, $3)', [id, 'active', 'attending']);
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
  if (TERMINAL_STATUSES.includes(status)) {
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

  const incident = r.rows[0];

  // Get all incident followers to broadcast + notify
  const followersResult = await pool.query(
    'SELECT user_id FROM incident_followers WHERE incident_id = $1',
    [id]
  );
  const followerIds = followersResult.rows.map((f: { user_id: string }) => f.user_id);

  // Include incident creator (driver_id) so citizen who sent the panic also receives updates
  if (incident.driver_id && !followerIds.includes(incident.driver_id)) {
    followerIds.push(incident.driver_id);
  }

  // Get name of user who changed status
  const updaterResult = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
  const updaterName = updaterResult.rows[0]?.name || 'Usuario';

  // Broadcast status change via WebSocket to all followers + admins
  broadcastIncidentUpdate(
    { id, status, updatedBy: userId, updatedByName: updaterName },
    followerIds
  );

  // Push notification to followers on important status changes
  const statusLabels: Record<string, string> = {
    attending: `${updaterName} va en camino`,
    localizado: `Vehículo localizado por ${updaterName}`,
    recuperado: `Vehículo recuperado por ${updaterName}`,
    resolved: 'Incidente resuelto por administrador',
    falsa_alarma: 'Incidente marcado como falsa alarma',
    cancelled: 'Incidente cancelado',
  };
  if (statusLabels[status]) {
    const plate = incident.plate || incident.imei || id.slice(0, 8).toUpperCase();
    sendPushToUsers(
      followerIds.filter((fId: string) => fId !== userId),
      {
        title: `Incidente ${plate}`,
        body: statusLabels[status],
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: `incident-${id}`,
        data: { url: '/dashboard', incidentId: id },
      }
    ).catch(err => logger.error('Push incident status error:', err));
  }

  // Email citizen on status changes (non-blocking)
  if (incident.driver_id && isEmailEnabled()) {
    const citizenResult = await pool.query('SELECT email, role FROM users WHERE id = $1', [incident.driver_id]);
    const citizen = citizenResult.rows[0];
    if (citizen?.email && citizen.role === 'citizen') {
      if (status === 'attending') {
        sendHelperRespondingEmail(citizen.email, updaterName, id).catch(err => logger.error('Email helper responding error:', err));
      } else if (status === 'resolved' || status === 'recuperado') {
        sendIncidentResolvedEmail(citizen.email, id).catch(err => logger.error('Email incident resolved error:', err));
      }
    }
  }

  res.json(incident);
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

// Admin: get incident responders with witness status
api.get('/incidents/:id/responders', authMiddleware, requireRole('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const r = await pool.query(
    `SELECT f.user_id, f.status, f.joined_at, f.witness_volunteer, f.witness_requested_at, f.witness_responded_at,
            u.name, u.phone, u.email, u.role
     FROM incident_followers f
     JOIN users u ON f.user_id = u.id
     WHERE f.incident_id = $1
     ORDER BY f.joined_at ASC`,
    [id]
  );
  res.json(r.rows);
}));

// Admin: generate PDF report for an incident
api.get('/incidents/:id/report.pdf', authMiddleware, requireRole('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Fetch incident details
  const incResult = await pool.query(
    `SELECT i.*, v.plate, v.imei as vehicle_imei,
            u.name as reporter_name, u.phone as reporter_phone, u.email as reporter_email, u.role as reporter_role
     FROM incidents i
     LEFT JOIN vehicles v ON i.vehicle_id = v.id
     LEFT JOIN users u ON i.driver_id = u.id
     WHERE i.id = $1`,
    [id]
  );
  const incident = incResult.rows[0];
  if (!incident) {
    res.status(404).json({ error: 'Incidente no encontrado' });
    return;
  }

  // Fetch responders
  const respResult = await pool.query(
    `SELECT f.status, f.joined_at, f.witness_volunteer, f.witness_responded_at,
            u.name, u.phone, u.email, u.role
     FROM incident_followers f
     JOIN users u ON f.user_id = u.id
     WHERE f.incident_id = $1
     ORDER BY f.joined_at ASC`,
    [id]
  );
  const responders = respResult.rows;

  // Generate PDF with pdfkit
  const PDFDocument = (await import('pdfkit')).default;
  const doc = new PDFDocument({ size: 'LETTER', margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="reporte-incidente-${id.slice(0, 8)}.pdf"`);
  doc.pipe(res);

  // Header
  doc.fontSize(22).font('Helvetica-Bold').text('SilentEye', { align: 'center' });
  doc.fontSize(11).font('Helvetica').fillColor('#666').text('Reporte de Incidente', { align: 'center' });
  doc.moveDown(0.5);
  doc.strokeColor('#e0e0e0').lineWidth(1).moveTo(50, doc.y).lineTo(562, doc.y).stroke();
  doc.moveDown(1);

  // Incident details
  doc.fillColor('#000').fontSize(14).font('Helvetica-Bold').text('Datos del Incidente');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }) : 'N/A';

  const details = [
    ['ID', id.slice(0, 8).toUpperCase()],
    ['Estado', incident.status],
    ['Fuente', incident.source || 'gps'],
    ['Ubicación', `${incident.latitude?.toFixed(6)}, ${incident.longitude?.toFixed(6)}`],
    ['Inicio', fmtDate(incident.started_at)],
    ['Resolución', fmtDate(incident.resolved_at)],
    ['Vehículo', incident.plate || 'N/A'],
    ['IMEI', incident.vehicle_imei || incident.imei || 'N/A'],
  ];
  for (const [label, value] of details) {
    doc.font('Helvetica-Bold').text(`${label}: `, { continued: true }).font('Helvetica').text(String(value));
  }

  // Reporter info
  doc.moveDown(1);
  doc.fontSize(14).font('Helvetica-Bold').text('Persona que Reportó');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.font('Helvetica-Bold').text('Nombre: ', { continued: true }).font('Helvetica').text(incident.reporter_name || 'N/A');
  doc.font('Helvetica-Bold').text('Rol: ', { continued: true }).font('Helvetica').text(incident.reporter_role || 'N/A');
  if (incident.reporter_email) {
    doc.font('Helvetica-Bold').text('Email: ', { continued: true }).font('Helvetica').text(incident.reporter_email);
  }
  if (incident.reporter_phone) {
    doc.font('Helvetica-Bold').text('Teléfono: ', { continued: true }).font('Helvetica').text(incident.reporter_phone);
  }

  // Responders table
  doc.moveDown(1);
  doc.fontSize(14).font('Helvetica-Bold').text(`Personas que Respondieron (${responders.length})`);
  doc.moveDown(0.3);

  if (responders.length === 0) {
    doc.fontSize(10).font('Helvetica').fillColor('#999').text('No hubo responders registrados.');
  } else {
    // Table header
    const tableTop = doc.y;
    const colWidths = [140, 80, 120, 80, 90];
    const headers = ['Nombre', 'Rol', 'Se unió', 'Estado', 'Testigo'];
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#333');
    let x = 50;
    for (let i = 0; i < headers.length; i++) {
      doc.text(headers[i], x, tableTop, { width: colWidths[i] });
      x += colWidths[i];
    }
    doc.moveDown(0.3);
    doc.strokeColor('#ccc').lineWidth(0.5).moveTo(50, doc.y).lineTo(562, doc.y).stroke();
    doc.moveDown(0.3);

    doc.font('Helvetica').fillColor('#000');
    for (const r of responders) {
      if (doc.y > 700) {
        doc.addPage();
      }
      const y = doc.y;
      x = 50;
      doc.text(r.name || 'Sin nombre', x, y, { width: colWidths[0] }); x += colWidths[0];
      doc.text(r.role || '', x, y, { width: colWidths[1] }); x += colWidths[1];
      doc.text(fmtDate(r.joined_at), x, y, { width: colWidths[2] }); x += colWidths[2];
      doc.text(r.status || '', x, y, { width: colWidths[3] }); x += colWidths[3];
      const witnessText = r.witness_volunteer === true ? 'Sí' : r.witness_volunteer === false ? 'No' : 'Pendiente';
      doc.text(witnessText, x, y, { width: colWidths[4] });
      doc.moveDown(0.5);
    }
  }

  // Witnesses section
  const witnesses = responders.filter(r => r.witness_volunteer === true);
  if (witnesses.length > 0) {
    doc.moveDown(1);
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#000').text(`Testigos Voluntarios (${witnesses.length})`);
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica');
    for (const w of witnesses) {
      doc.font('Helvetica-Bold').text(`• ${w.name}`, { continued: true });
      doc.font('Helvetica').text(` — ${w.email || w.phone || 'Sin contacto'} — Aceptó: ${fmtDate(w.witness_responded_at)}`);
    }
  }

  // Footer
  doc.moveDown(2);
  doc.strokeColor('#e0e0e0').lineWidth(1).moveTo(50, doc.y).lineTo(562, doc.y).stroke();
  doc.moveDown(0.5);
  doc.fontSize(8).fillColor('#999').text(`Generado por SilentEye el ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}`, { align: 'center' });
  doc.text('Este documento es para uso interno y puede contener información sensible.', { align: 'center' });

  doc.end();
}));

// Admin: send witness request to all responders of an incident
api.post('/incidents/:id/witness-request', authMiddleware, requireRole('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isEmailEnabled()) {
    res.status(503).json({ error: 'Servicio de email no configurado' });
    return;
  }

  // Get responders who haven't been asked yet
  const r = await pool.query(
    `SELECT f.user_id, u.name, u.email, u.phone
     FROM incident_followers f
     JOIN users u ON f.user_id = u.id
     WHERE f.incident_id = $1 AND f.witness_requested_at IS NULL`,
    [id]
  );

  if (r.rows.length === 0) {
    res.json({ success: true, sent: 0, message: 'Todos los responders ya fueron contactados' });
    return;
  }

  const API_URL = process.env.PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://silenteye-3rrwnq.fly.dev';
  let sent = 0;

  for (const responder of r.rows) {
    const email = responder.email || responder.phone; // phone might be an email for citizens
    if (!email || !email.includes('@')) continue;

    const acceptSig = signWitnessToken(id, responder.user_id, 'accept');
    const declineSig = signWitnessToken(id, responder.user_id, 'decline');
    const acceptUrl = `${API_URL}/api/incidents/${id}/witness-response?user=${responder.user_id}&response=accept&sig=${acceptSig}`;
    const declineUrl = `${API_URL}/api/incidents/${id}/witness-response?user=${responder.user_id}&response=decline&sig=${declineSig}`;

    const emailSent = await sendWitnessRequestEmail(email, responder.name || 'Responder', id, acceptUrl, declineUrl);
    if (emailSent) {
      await pool.query(
        `UPDATE incident_followers SET witness_requested_at = NOW() WHERE incident_id = $1 AND user_id = $2`,
        [id, responder.user_id]
      );
      sent++;
    }
  }

  res.json({ success: true, sent, total: r.rows.length });
}));

// Public: witness accept/decline (accessed via signed email link — HMAC prevents tampering)
api.get('/incidents/:id/witness-response', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { user, response, sig } = req.query;

  if (!user || !response || !['accept', 'decline'].includes(String(response))) {
    res.status(400).send('<html><body><h2>Enlace inv\u00e1lido</h2></body></html>');
    return;
  }

  // Verify HMAC signature (timing-safe to prevent side-channel attacks)
  const expectedSig = signWitnessToken(id, String(user), String(response));
  const sigStr = String(sig || '');
  const sigMatch = sigStr.length === expectedSig.length &&
    timingSafeEqual(Buffer.from(sigStr), Buffer.from(expectedSig));
  if (!sigMatch) {
    res.status(403).send('<html><body><h2>Enlace inv\u00e1lido o expirado</h2></body></html>');
    return;
  }

  const isAccept = response === 'accept';
  const r = await pool.query(
    `UPDATE incident_followers
     SET witness_volunteer = $3, witness_responded_at = NOW()
     WHERE incident_id = $1 AND user_id = $2
     RETURNING id`,
    [id, user, isAccept]
  );

  if (!r.rows[0]) {
    res.status(404).send('<html><body><h2>No se encontró tu registro para este incidente.</h2></body></html>');
    return;
  }

  const message = isAccept
    ? 'Gracias por aceptar ser testigo voluntario. El administrador podr\u00e1 contactarte si es necesario.'
    : 'Has declinado la solicitud. No se requiere ninguna acci\u00f3n adicional.';
  const color = isAccept ? '#16a34a' : '#6b7280';
  const safeId = id.replace(/[^a-f0-9-]/gi, '').slice(0, 36);

  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");
  res.send(`
    <html>
    <head><meta name="viewport" content="width=device-width, initial-scale=1"><title>SilentEye</title></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f9fafb;">
      <div style="max-width: 400px; text-align: center; padding: 40px 24px; background: white; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h1 style="font-size: 20px; color: #18181b; margin: 0 0 8px;">SilentEye</h1>
        <div style="width: 48px; height: 48px; border-radius: 50%; background: ${color}; margin: 16px auto; display: flex; align-items: center; justify-content: center;">
          <span style="color: white; font-size: 24px;">${isAccept ? '\u2713' : '\u2014'}</span>
        </div>
        <p style="font-size: 15px; color: #374151; line-height: 1.5;">${message}</p>
        <p style="font-size: 12px; color: #9ca3af; margin-top: 16px;">Incidente: ${safeId.slice(0, 8).toUpperCase()}</p>
      </div>
    </body>
    </html>
  `);
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
    ? `SELECT DISTINCT ON (g.imei) g.imei, g.vehicle_id, g.latitude, g.longitude, g.speed, g.timestamp_at, v.plate, v.parked_at
       FROM gps_logs g
       JOIN vehicles v ON v.id = g.vehicle_id AND v.driver_id = $1
       ORDER BY g.imei, g.timestamp_at DESC`
    : `SELECT DISTINCT ON (g.imei) g.imei, g.vehicle_id, g.latitude, g.longitude, g.speed, g.timestamp_at, v.plate, v.parked_at
       FROM gps_logs g
       JOIN vehicles v ON v.id = g.vehicle_id AND v.driver_id = $1
       ORDER BY g.imei, g.timestamp_at DESC`;

  const r = await pool.query(
    `SELECT * FROM (${subq}) sq WHERE latitude != 0 OR longitude != 0 LIMIT $2`,
    [userId, limit]
  );
  res.json(
    r.rows.map((row: { imei: string; vehicle_id: string; plate: string; latitude: string; longitude: string; speed: number; timestamp_at: string; parked_at: string | null }) => ({
      imei: row.imei,
      vehicleId: row.vehicle_id,
      plate: row.plate,
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
      speed: row.speed ?? 0,
      timestampAt: row.timestamp_at,
      parkedAt: row.parked_at,
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

// Últimos N registros GPS (admin) — para ver actividad en tiempo real del dispositivo
api.get('/gps/activity', authMiddleware, requireRole('admin'), asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(String(req.query.limit || 20), 10) || 20, 100);
  const r = await pool.query(
    `SELECT g.imei, g.vehicle_id, g.latitude, g.longitude, g.speed, g.altitude, g.satellites,
            g.timestamp_at, g.din1_value, g.priority, v.plate
     FROM gps_logs g
     LEFT JOIN vehicles v ON v.id = g.vehicle_id
     ORDER BY g.timestamp_at DESC
     LIMIT $1`,
    [limit]
  );
  res.json(
    r.rows.map((row: { imei: string; vehicle_id: string; plate: string; latitude: string; longitude: string; speed: number; altitude: number; satellites: number; timestamp_at: string; din1_value: number; priority: number }) => ({
      imei: row.imei,
      vehicleId: row.vehicle_id,
      plate: row.plate,
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
      speed: row.speed ?? 0,
      altitude: row.altitude ?? 0,
      satellites: row.satellites ?? 0,
      timestampAt: row.timestamp_at,
      din1: row.din1_value,
      priority: row.priority ?? 0,
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
        `SELECT u.id, u.name,
                ST_Distance(COALESCE(hl.geom, u.last_location)::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography)::int as distance_m
         FROM users u LEFT JOIN helper_locations hl ON hl.user_id = u.id
         WHERE u.is_active AND COALESCE(hl.geom, u.last_location) IS NOT NULL
           AND (u.role = 'helper' OR EXISTS (SELECT 1 FROM vehicles v WHERE v.driver_id = u.id))
           AND ST_DWithin(COALESCE(hl.geom, u.last_location)::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3)
         ORDER BY distance_m LIMIT 20`,
        [lat, lon, radiusM]
      )
    : await pool.query(
        `SELECT u.id, u.name,
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
    'SELECT id, phone, name, role, email, is_active, last_location_at, created_at FROM users ORDER BY name'
  );
  res.json(r.rows);
}));

api.get('/users/:id', authMiddleware, requireRole('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const r = await pool.query(
      'SELECT id, phone, name, role, email, is_active, last_location_at, created_at FROM users WHERE id = $1',
      [id]
    );
    if (!r.rows[0]) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }
    res.json(r.rows[0]);
  } catch (err) {
    logger.error('GET /users/:id error:', err);
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
}));

api.post('/users', authMiddleware, requireRole('admin'), asyncHandler(async (req, res) => {
  const { phone, name, role, email } = req.body;
  if (!phone || typeof phone !== 'string' || !name || typeof name !== 'string') {
    res.status(400).json({ error: 'Teléfono y nombre requeridos' });
    return;
  }
  if (name.trim().length > 100) {
    res.status(400).json({ error: 'Nombre máximo 100 caracteres' });
    return;
  }
  if (!isValidPhone(phone)) {
    res.status(400).json({ error: 'Teléfono inválido (máx 20 caracteres)' });
    return;
  }
  if (email && (typeof email !== 'string' || email.trim().length > 255)) {
    res.status(400).json({ error: 'Email máximo 255 caracteres' });
    return;
  }
  const finalRole = ['driver', 'helper', 'admin', 'citizen'].includes(role) ? role : 'driver';
  const existing = await pool.query('SELECT id FROM users WHERE phone = $1', [phone]);
  if (existing.rows[0]) {
    res.status(409).json({ error: 'Ya existe un usuario con ese teléfono' });
    return;
  }
  const cleanEmail = email && typeof email === 'string' ? email.trim().toLowerCase() : null;
  const r = await pool.query(
    `INSERT INTO users (phone, name, role, email) VALUES ($1, $2, $3, $4) RETURNING id, phone, name, role, email, created_at`,
    [phone.trim(), name.trim(), finalRole, cleanEmail]
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
  if (req.body.email !== undefined) {
    const cleanEmail = req.body.email && typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : null;
    updates.push(`email = $${p++}`);
    params.push(cleanEmail);
  }
  if (updates.length === 0) {
    res.status(400).json({ error: 'Indica name, phone o email para actualizar' });
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
        imei: vehicle?.imei ?? `mobile-${userId}`,
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

    // Send push notifications (non-blocking, after commit)
    sendPushToUsers(
      nearbyDrivers.map((d) => d.id),
      {
        title: 'ALERTA DE PÁNICO',
        body: `${vehicle?.plate ?? user.name ?? 'SOS Móvil'} necesita ayuda`,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: `panic-${incident.id}`,
        data: { url: '/sos', incidentId: incident.id, latitude, longitude },
      }
    ).catch((err) => logger.error('Push send error (mobile panic):', err));

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

  // Broadcast location update via WebSocket for real-time tracking
  try {
    const userRow = await pool.query(
      `SELECT u.name, u.role, v.id as vehicle_id, v.imei, v.plate
       FROM users u LEFT JOIN vehicles v ON v.driver_id = u.id
       WHERE u.id = $1 LIMIT 1`,
      [userId]
    );
    const u = userRow.rows[0];
    if (u) {
      // Find followers of active incidents involving this user (as driver/creator)
      const fRes = await pool.query(
        `SELECT DISTINCT f.user_id FROM incident_followers f
         JOIN incidents i ON i.id = f.incident_id
         WHERE i.driver_id = $1 AND i.status = 'active'`,
        [userId]
      );
      const followerIds = fRes.rows.map((r: { user_id: string }) => r.user_id);

      broadcastLocation(
        {
          imei: u.imei || `mobile-${userId}`,
          vehicleId: u.vehicle_id || undefined,
          latitude,
          longitude,
          speed: 0,
          timestamp: Date.now(),
          plate: u.plate || u.name || 'SOS Móvil',
        },
        followerIds
      );
    }
  } catch (err) {
    logger.warn('Location broadcast error (non-fatal):', err);
  }

  res.json({ success: true });
}));

// ── Push Notifications ──────────────────────────────────────────────────────

api.get('/push/vapid-key', (_req, res) => {
  const key = getVapidPublicKey();
  if (!key) {
    res.status(503).json({ error: 'Push notifications no configuradas' });
    return;
  }
  res.json({ publicKey: key });
});

api.post('/push/subscribe', authMiddleware, asyncHandler(async (req, res) => {
  const { userId } = (req as any).user;
  const { subscription } = req.body;
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    res.status(400).json({ error: 'Subscription inválida' });
    return;
  }
  try {
    await saveSubscription(userId, subscription);
    res.json({ success: true });
  } catch (err) {
    logger.error('POST /push/subscribe error:', err);
    res.status(500).json({ error: 'Error al guardar subscription' });
  }
}));

api.post('/push/unsubscribe', authMiddleware, asyncHandler(async (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) {
    res.status(400).json({ error: 'Endpoint requerido' });
    return;
  }
  try {
    await removeSubscription(endpoint);
    res.json({ success: true });
  } catch (err) {
    logger.error('POST /push/unsubscribe error:', err);
    res.status(500).json({ error: 'Error al eliminar subscription' });
  }
}));

// ── Delete user ─────────────────────────────────────────────────────────────

api.delete('/users/:id', authMiddleware, requireRole('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId } = (req as any).user;
  if (id === userId) {
    res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
    return;
  }
  try {
    // Unassign user from vehicles first (FK has no ON DELETE CASCADE)
    await pool.query('UPDATE vehicles SET driver_id = NULL WHERE driver_id = $1', [id]);
    const r = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    if (!r.rows[0]) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    logger.error('DELETE /users/:id error:', err);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
}));

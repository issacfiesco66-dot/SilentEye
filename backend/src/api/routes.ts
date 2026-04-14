/**
 * SilentEye — Plataforma de Seguridad Vehicular
 * Copyright (c) 2026 Christian Fiesco. All rights reserved.
 * PROPRIETARY AND CONFIDENTIAL — See LICENSE file for details.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { createHmac, timingSafeEqual, randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';
import { hasPostGis } from '../db/postgis-check.js';
import {
  createOtp,
  verifyOtp,
  findOrCreateUser,
  signToken,
  verifyToken,
  revokeToken,
  isTokenRevoked,
} from './auth.js';
import { getAlerts, deleteAlerts } from '../services/alert-service.js';
import { broadcastLocation, broadcastPanic, broadcastIncidentUpdate, broadcastToAdmins } from '../services/websocket.js';
import { sendPushToUsers, saveSubscription, removeSubscription, getVapidPublicKey } from '../services/push-service.js';
import { sendEmail, sendOtpEmail, isEmailEnabled, sendHelperRespondingEmail, sendIncidentResolvedEmail, sendWitnessRequestEmail } from '../services/email-service.js';
import { sendOtpSms, isSmsEnabled } from '../services/sms-service.js';
import { logger } from '../utils/logger.js';
import { t } from '../i18n.js';
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

// HMAC signing for witness response URLs (prevents URL tampering + expiration)
const WITNESS_URL_EXPIRY_MS = 72 * 3600 * 1000; // 72 hours
function signWitnessToken(incidentId: string, userId: string, response: string, timestamp?: number): string {
  const secret = process.env.JWT_SECRET!;
  const ts = timestamp ?? Date.now();
  return createHmac('sha256', secret).update(`${incidentId}:${userId}:${response}:${ts}`).digest('hex');
}

// UUID format validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUuid(id: string): boolean {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

// ── Permissions: maps internal role → capabilities (frontend never sees role names) ──
interface Permissions {
  viewAdminPanel: boolean;
  manageUsers: boolean;
  manageAllVehicles: boolean;
  viewOwnVehicles: boolean;
  manageGeofences: boolean;
  manageFleet: boolean;
  respondIncidents: boolean;
  viewGpsActivity: boolean;
  viewAlerts: boolean;
  triggerPanic: boolean;
  /** Which dashboard layout to render */
  dashboardType: 'admin' | 'fleet' | 'field' | 'sos';
}

function getPermissions(role: string): Permissions {
  switch (role) {
    case 'admin':
      return {
        viewAdminPanel: true, manageUsers: true, manageAllVehicles: true,
        viewOwnVehicles: true, manageGeofences: true, manageFleet: false,
        respondIncidents: true, viewGpsActivity: true, viewAlerts: true,
        triggerPanic: true, dashboardType: 'admin',
      };
    case 'fleet_owner':
      return {
        viewAdminPanel: false, manageUsers: false, manageAllVehicles: false,
        viewOwnVehicles: true, manageGeofences: true, manageFleet: true,
        respondIncidents: false, viewGpsActivity: false, viewAlerts: true,
        triggerPanic: true, dashboardType: 'fleet',
      };
    case 'helper':
      return {
        viewAdminPanel: false, manageUsers: false, manageAllVehicles: false,
        viewOwnVehicles: false, manageGeofences: false, manageFleet: false,
        respondIncidents: true, viewGpsActivity: false, viewAlerts: true,
        triggerPanic: true, dashboardType: 'field',
      };
    case 'driver':
      return {
        viewAdminPanel: false, manageUsers: false, manageAllVehicles: false,
        viewOwnVehicles: true, manageGeofences: true, manageFleet: false,
        respondIncidents: true, viewGpsActivity: false, viewAlerts: true,
        triggerPanic: true, dashboardType: 'field',
      };
    case 'citizen':
    default:
      return {
        viewAdminPanel: false, manageUsers: false, manageAllVehicles: false,
        viewOwnVehicles: false, manageGeofences: false, manageFleet: false,
        respondIncidents: false, viewGpsActivity: false, viewAlerts: false,
        triggerPanic: true, dashboardType: 'sos',
      };
  }
}

// Setup: migrar y seed (requiere ?secret=XXX, MIGRATE_SECRET en Fly Secrets)
const MIGRATE_SECRET = process.env.MIGRATE_SECRET || '';
function checkSetupSecret(req: import('express').Request): boolean {
  const secret = String(req.query.secret || req.body?.secret || '');
  if (!MIGRATE_SECRET || MIGRATE_SECRET.length < 16 || secret.length !== MIGRATE_SECRET.length) return false;
  return timingSafeEqual(Buffer.from(secret), Buffer.from(MIGRATE_SECRET));
}

api.post('/setup/migrate', asyncHandler(async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({ error: t(req, 'setupDisabled') });
    return;
  }
  if (!checkSetupSecret(req)) {
    res.status(403).json({ error: t(req, 'secretInvalid') });
    return;
  }
  const result = await runMigrate();
  res.json(result);
}));

api.post('/setup/seed', asyncHandler(async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({ error: t(req, 'setupDisabled') });
    return;
  }
  if (!checkSetupSecret(req)) {
    res.status(403).json({ error: t(req, 'secretInvalid') });
    return;
  }
  const result = await runSeed();
  res.json(result);
}));

api.post('/setup/cleanup', asyncHandler(async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({ error: t(req, 'setupDisabled') });
    return;
  }
  if (!checkSetupSecret(req)) {
    res.status(403).json({ error: t(req, 'secretInvalidShort') });
    return;
  }
  const allowedTables = new Set([
    'geofence_alerts', 'gps_logs', 'alerts', 'incident_followers', 'incidents',
    'helper_locations', 'push_subscriptions', 'otp_codes', 'geofences', 'vehicles',
  ]);
  for (const t of allowedTables) {
    if (!/^[a-z_]+$/.test(t)) throw new Error(`Invalid table name: ${t}`);
    await pool.query(`TRUNCATE TABLE ${t} CASCADE`);
  }
  const del = await pool.query(`DELETE FROM users WHERE role != 'admin'`);
  res.json({
    ok: true,
    message: `Limpieza completada. Tablas truncadas: ${[...allowedTables].join(', ')}. Usuarios eliminados (no-admin): ${del.rowCount}`,
  });
}));

// Crear OTP (only in development — disabled in production for security)
api.post('/setup/otp', asyncHandler(async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  if (!checkSetupSecret(req)) {
    res.status(403).json({ error: t(req, 'secretInvalidShort') });
    return;
  }
  const phone = req.body?.phone || req.query.phone;
  if (!phone || typeof phone !== 'string' || !isValidPhone(phone)) {
    res.status(400).json({ error: t(req, 'phoneRequired') });
    return;
  }
  try {
    const code = await createOtp(phone.trim());
    await findOrCreateUser(phone.trim());
    res.json({ ok: true, phone: phone.trim(), code });
  } catch (err) {
    logger.error('setup/otp error:', err);
    res.status(500).json({ ok: false, error: t(req, 'internalError') });
  }
}));

function authMiddleware(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction): void {
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  const payload = token ? verifyToken(token) : null;
  if (!payload) {
    res.status(401).json({ error: t(req, 'unauthorized') });
    return;
  }
  // Check blacklist (fire-and-return path). Tokens without a jti bypass
  // this check — they are legacy tokens signed before the revocation
  // migration. Once the grace period ends we will reject them outright.
  isTokenRevoked(payload).then((revoked) => {
    if (revoked) {
      res.status(401).json({ error: t(req, 'unauthorized') });
      return;
    }
    (req as any).user = payload;
    next();
  }).catch(() => {
    (req as any).user = payload;
    next();
  });
}

function requireRole(...roles: string[]) {
  return (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
    const user = (req as any).user;
    if (!user || !roles.includes(user.role)) {
      res.status(403).json({ error: t(req, 'accessDenied') });
      return;
    }
    next();
  };
}

// ── Audit log helper ────────────────────────────────────────────────────────
// Records privileged actions to the audit_log table. Best-effort: never
// throws, never blocks the caller's response. Instrument at the point of
// mutation (after the write succeeds, before the HTTP response).
interface AuditEntry {
  action: string;
  targetType?: string;
  targetId?: string | null;
  details?: Record<string, unknown>;
}
async function writeAuditLog(req: import('express').Request, entry: AuditEntry): Promise<void> {
  try {
    const user = (req as any).user as { userId?: string; role?: string } | undefined;
    const ip = (req.headers['cf-connecting-ip'] as string)
      || (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.ip
      || null;
    const ua = (req.headers['user-agent'] as string) || null;
    await pool.query(
      `INSERT INTO audit_log (user_id, user_role, action, target_type, target_id, ip, user_agent, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        user?.userId ?? null,
        user?.role ?? null,
        entry.action.slice(0, 64),
        entry.targetType?.slice(0, 32) ?? null,
        entry.targetId != null ? String(entry.targetId).slice(0, 128) : null,
        ip?.slice(0, 64) ?? null,
        ua?.slice(0, 512) ?? null,
        entry.details ? JSON.stringify(entry.details) : null,
      ]
    );
  } catch (err) {
    // Never break the request flow because of audit. Log at warn level.
    logger.warn('audit log write failed:', err);
  }
}

// Login: conductor con IMEI, admin/helper con teléfono, ciudadano con email+mode
api.post('/auth/otp/request', authRateLimit, asyncHandler(async (req, res) => {
  try {
    const { imei, phone, email, mode } = req.body;
    // SECURITY: OTP codes are logged via Winston for debugging — never returned in responses

    if (imei && typeof imei === 'string') {
      if (!isValidImeiInput(imei)) {
        res.status(400).json({ error: t(req, 'invalidImeiFormat') });
        return;
      }
      // Conductor: ingresa con número de GPS (IMEI). El GPS debe estar registrado por admin.
      const vRow = await pool.query(
        'SELECT v.driver_id, u.phone, u.email FROM vehicles v LEFT JOIN users u ON u.id = v.driver_id WHERE v.imei = $1 LIMIT 1',
        [imei.trim()]
      );
      const row = vRow.rows[0];
      if (!row) {
        res.status(400).json({ error: t(req, 'gpsNotRegistered') });
        return;
      }
      if (!row.driver_id || !row.phone) {
        res.status(400).json({ error: t(req, 'gpsNoDriver') });
        return;
      }

      // Use email if available (saves SMS costs), otherwise fall back to phone
      const otpIdentifier = row.email || row.phone;
      const code = await createOtp(otpIdentifier);

      // Send OTP via email if driver has email registered
      if (row.email && isEmailEnabled()) {
        const sent = await sendOtpEmail(row.email, code);
        if (!sent) {
          res.status(500).json({ error: t(req, 'emailSendFail') });
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

      res.json({ success: true });
      return;
    }

    // Citizen or GPS self-service mode: email-based OTP
    if ((mode === 'citizen' || mode === 'gps') && email && typeof email === 'string') {
      const cleanEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        res.status(400).json({ error: t(req, 'invalidEmailFormat') });
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
        res.status(429).json({ error: t(req, 'tooManyOtp') });
        return;
      }

      const code = await createOtp(cleanEmail);

      // Send OTP via email — NEVER return code in response
      if (isEmailEnabled()) {
        const sent = await sendOtpEmail(cleanEmail, code);
        if (!sent) {
          res.status(500).json({ error: t(req, 'emailSendFail2') });
          return;
        }
        res.json({ success: true, emailSent: true });
      } else {
        logger.warn(`OTP citizen sin email: ${cleanEmail}`);
        res.status(503).json({ error: t(req, 'emailNotConfigured') });
      }
      return;
    }

    if (phone && typeof phone === 'string') {
      if (!isValidPhone(phone)) {
        res.status(400).json({ error: t(req, 'invalidPhoneFormat') });
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
        res.status(429).json({ error: t(req, 'tooManyOtp') });
        return;
      }

      // SECURITY: phone login is for pre-registered users only (admin/helper/driver).
      // Do NOT auto-create users — admin must register them first.
      const userCheck = await pool.query(
        'SELECT id, phone, role, email, is_active FROM users WHERE phone = $1',
        [cleanPhone]
      );
      if (!userCheck.rows[0]) {
        res.status(403).json({ error: t(req, 'phoneNotRegistered') });
        return;
      }
      if (userCheck.rows[0].is_active === false) {
        res.status(403).json({ error: t(req, 'accountDisabled') });
        return;
      }

      const code = await createOtp(cleanPhone);

      // Try email delivery first (for users with email registered)
      const userEmail = userCheck.rows[0].email;
      let emailOk = false;
      let smsOk = false;

      if (userEmail && isEmailEnabled()) {
        emailOk = await sendOtpEmail(userEmail, code);
      }

      // Fallback: SMS if email not sent
      if (!emailOk && isSmsEnabled()) {
        smsOk = await sendOtpSms(cleanPhone, code);
      }

      const result: Record<string, unknown> = { success: true };
      if (emailOk) {
        result.emailSent = true;
        result.emailHint = userEmail!.replace(/(.{2})(.*)(@.*)/, '$1***$3');
      } else if (smsOk) {
        result.smsSent = true;
      }
      res.json(result);
      return;
    }

    res.status(400).json({ error: t(req, 'identifierRequired') });
  } catch (err: unknown) {
    logger.error('OTP request error:', err);
    res.status(500).json({ error: t(req, 'otpGenError') });
  }
}));

api.post('/auth/otp/verify', authRateLimit, asyncHandler(async (req, res) => {
  try {
    const { imei, phone, email, code, name, mode } = req.body;
    if (!code) {
      res.status(400).json({ error: t(req, 'codeRequired') });
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
        res.status(400).json({ error: t(req, 'gpsNotRegOrDriver') });
        return;
      }
      const uRow = await pool.query('SELECT id, phone, name, role, email FROM users WHERE id = $1', [row.driver_id]);
      const user = uRow.rows[0];
      if (!user) {
        res.status(400).json({ error: t(req, 'userNotFound') });
        return;
      }
      // OTP was created with email if available, otherwise phone
      const otpIdentifier = user.email || user.phone;
      const { valid, error: otpError } = await verifyOtp(otpIdentifier, code);
      if (!valid) {
        res.status(401).json({ error: otpError || t(req, 'invalidCode') });
        return;
      }
      const token = signToken({ userId: user.id, role: user.role });
      res.json({ token, user: { id: user.id, phone: user.phone, name: user.name, role: user.role, permissions: getPermissions(user.role) } });
      return;
    }

    // Citizen or GPS self-service: verify by email
    if ((mode === 'citizen' || mode === 'gps') && email && typeof email === 'string') {
      const cleanEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        res.status(400).json({ error: t(req, 'invalidEmail') });
        return;
      }

      const { valid, user: existingUser, error: otpError } = await verifyOtp(cleanEmail, code);
      if (!valid) {
        res.status(401).json({ error: otpError || t(req, 'invalidCode') });
        return;
      }

      // For new accounts: require a real name
      if (!existingUser) {
        if (!name || typeof name !== 'string' || name.trim().length < 2) {
          res.status(400).json({ error: t(req, 'nameRequired') });
          return;
        }
      }

      // New accounts are ALWAYS created as citizens. The driver role must be
      // earned by actually associating a GPS device / vehicle — it is not
      // granted by passing mode=gps in the request body. Promotion to driver
      // happens later in /vehicles when a real vehicle (with IMEI) is added
      // and ownership is confirmed.
      let user = existingUser;
      user = user ?? await findOrCreateUser(cleanEmail, name?.trim(), 'citizen', cleanEmail);
      const token = signToken({ userId: user.id, role: user.role });
      res.json({ token, user: { id: user.id, phone: user.phone, name: user.name, role: user.role, email: user.email, plan: user.plan || 'free', permissions: getPermissions(user.role) } });
      return;
    }

    // Admin/helper: verify by phone
    if (phone && typeof phone === 'string') {
      if (!isValidPhone(phone)) {
        res.status(400).json({ error: t(req, 'invalidPhone') });
        return;
      }

      const { valid, user: existingUser, error: otpError } = await verifyOtp(phone.trim(), code);
      if (!valid) {
        res.status(401).json({ error: otpError || t(req, 'invalidCode') });
        return;
      }

      if (!existingUser) {
        res.status(403).json({ error: t(req, 'phoneNotRegContact') });
        return;
      }
      const token = signToken({ userId: existingUser.id, role: existingUser.role });
      res.json({ token, user: { id: existingUser.id, phone: existingUser.phone, name: existingUser.name, role: existingUser.role, permissions: getPermissions(existingUser.role) } });
      return;
    }

    res.status(400).json({ error: t(req, 'verifyIdentifier') });
  } catch (err: unknown) {
    logger.error('OTP verify error:', err);
    res.status(500).json({ error: t(req, 'otpVerifyError') });
  }
}));

// ── Email + Password login (for admin / fleet_owner) ──
api.post('/auth/login', authRateLimit, asyncHandler(async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      res.status(400).json({ error: t(req, 'emailPassRequired') });
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    const userResult = await pool.query(
      'SELECT id, phone, name, role, email, password_hash, is_active FROM users WHERE email = $1',
      [cleanEmail]
    );
    const user = userResult.rows[0];
    if (!user || !user.password_hash) {
      res.status(401).json({ error: t(req, 'wrongCredentials') });
      return;
    }
    if (user.is_active === false) {
      res.status(403).json({ error: t(req, 'accountDisabled') });
      return;
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: t(req, 'wrongCredentials') });
      return;
    }
    const token = signToken({ userId: user.id, role: user.role });
    res.json({
      token,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        email: user.email,
        permissions: getPermissions(user.role),
      },
    });
  } catch (err) {
    logger.error('Login error:', err);
    res.status(500).json({ error: t(req, 'loginError') });
  }
}));

// ── Logout — revoke the current JWT server-side ─────────────────────────────
// Takes the Bearer token from the caller and writes its jti into
// token_blacklist. Subsequent requests with the same token are rejected by
// authMiddleware. Idempotent — calling twice is a no-op.
api.post('/auth/logout', asyncHandler(async (req, res) => {
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  const decoded = token ? verifyToken(token) : null;
  if (decoded) {
    await revokeToken(decoded, 'logout');
    try {
      await writeAuditLog(req, {
        action: 'auth.logout',
        targetType: 'user',
        targetId: decoded.userId,
      });
    } catch { /* audit is best-effort */ }
  }
  // Always return 200 — do not leak whether the token was valid
  res.json({ ok: true });
}));

api.get('/me', authMiddleware, asyncHandler(async (req, res) => {
  const { userId } = (req as any).user;
  const pg = await hasPostGis();
  const r = await pool.query(
    pg
      ? `SELECT id, phone, name, role, email, last_location_at, ST_X(last_location) as lng, ST_Y(last_location) as lat FROM users WHERE id = $1`
      : `SELECT id, phone, name, role, email, last_location_at, last_lat as lat, last_lng as lng FROM users WHERE id = $1`,
    [userId]
  );
  if (!r.rows[0]) {
    res.status(404).json({ error: t(req, 'userNotFound') });
    return;
  }
  const u = r.rows[0];
  const lastLocation = (u.lng != null && u.lat != null) ? { lng: parseFloat(u.lng), lat: parseFloat(u.lat) } : null;
  const { lng, lat, ...rest } = u;
  res.json({ ...rest, lastLocation, permissions: getPermissions(u.role) });
}));

// ── Profile: update name / email ──
api.put('/me/profile', authMiddleware, asyncHandler(async (req, res) => {
  const { userId } = (req as any).user;
  const { name, email } = req.body;
  const updates: string[] = [];
  const params: unknown[] = [];
  let p = 1;

  if (name != null && typeof name === 'string' && name.trim().length >= 2) {
    if (name.trim().length > 100) {
      res.status(400).json({ error: t(req, 'nameMax') });
      return;
    }
    updates.push(`name = $${p++}`);
    params.push(name.trim());
  }
  if (email !== undefined) {
    if (email && typeof email === 'string') {
      const cleanEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        res.status(400).json({ error: t(req, 'invalidEmail') });
        return;
      }
      const dup = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [cleanEmail, userId]);
      if (dup.rows[0]) {
        res.status(409).json({ error: 'Ya existe otro usuario con ese email' });
        return;
      }
      updates.push(`email = $${p++}`);
      params.push(cleanEmail);
    } else {
      updates.push(`email = $${p++}`);
      params.push(null);
    }
  }
  if (updates.length === 0) {
    res.status(400).json({ error: 'Indica name o email para actualizar' });
    return;
  }
  params.push(userId);
  const r = await pool.query(
    `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${p} RETURNING id, phone, name, role, email`,
    params
  );
  if (!r.rows[0]) {
    res.status(404).json({ error: t(req, 'userNotFound') });
    return;
  }
  res.json({ ...r.rows[0], permissions: getPermissions(r.rows[0].role) });
}));

// ── Profile: change password ──
api.put('/me/password', authMiddleware, asyncHandler(async (req, res) => {
  const { userId } = (req as any).user;
  const { currentPassword, newPassword } = req.body;

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 12) {
    res.status(400).json({ error: 'La nueva contraseña debe tener al menos 12 caracteres' });
    return;
  }
  if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword)) {
    res.status(400).json({ error: 'La contraseña debe contener mayúsculas, minúsculas y números' });
    return;
  }

  // If user already has a password, require the current one
  const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
  const user = userResult.rows[0];
  if (!user) {
    res.status(404).json({ error: t(req, 'userNotFound') });
    return;
  }
  if (user.password_hash) {
    if (!currentPassword || typeof currentPassword !== 'string') {
      res.status(400).json({ error: 'Contraseña actual requerida' });
      return;
    }
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Contraseña actual incorrecta' });
      return;
    }
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, userId]);
  res.json({ success: true, message: 'Contraseña actualizada' });
}));

api.put('/me/location', authMiddleware, asyncHandler(async (req, res) => {
  const { userId } = (req as any).user;
  const { latitude, longitude } = req.body;
  if (!isValidCoords(latitude, longitude)) {
    res.status(400).json({ error: t(req, 'latLonRequired') });
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
    res.status(400).json({ error: t(req, 'latLonRequired2') });
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

  // Broadcast helper location via WS so the SOS user sees the helper approaching
  try {
    const uRow = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
    // Find incidents where this helper is a follower → broadcast to other followers + incident creator
    const iRes = await pool.query(
      `SELECT DISTINCT i.driver_id, f2.user_id AS follower_id
       FROM incidents i
       JOIN incident_followers f ON f.incident_id = i.id AND f.user_id = $1
       LEFT JOIN incident_followers f2 ON f2.incident_id = i.id
       WHERE i.status IN ('active', 'attending', 'localizado')`,
      [userId]
    );
    const targetIds: string[] = [];
    for (const row of iRes.rows) {
      if (row.driver_id && !targetIds.includes(row.driver_id)) targetIds.push(row.driver_id);
      if (row.follower_id && row.follower_id !== userId && !targetIds.includes(row.follower_id)) targetIds.push(row.follower_id);
    }
    broadcastLocation(
      {
        imei: `helper-${userId}`,
        latitude,
        longitude,
        speed: 0,
        timestamp: Date.now(),
        plate: uRow.rows[0]?.name || 'Helper',
      },
      targetIds
    );
  } catch (err) {
    logger.warn('Helper location broadcast error (non-fatal):', err);
  }

  res.json({ success: true });
}));

api.get('/vehicles', authMiddleware, requireRole('admin', 'helper', 'driver', 'fleet_owner'), asyncHandler(async (req, res) => {
  const { userId, role } = (req as any).user;
  if (role === 'fleet_owner') {
    const r = await pool.query(
      `SELECT v.id, v.plate, v.name, v.imei, v.driver_id, v.owner_id, v.parked_at, v.parked_lat, v.parked_lng,
              u.name as driver_name, o.name as owner_name
       FROM vehicles v
       LEFT JOIN users u ON v.driver_id = u.id
       LEFT JOIN users o ON v.owner_id = o.id
       WHERE v.owner_id = $1
       ORDER BY v.plate`,
      [userId]
    );
    res.json(r.rows);
    return;
  }
  if (role === 'driver') {
    const r = await pool.query(
      `SELECT v.id, v.plate, v.name, v.imei, v.driver_id, v.owner_id, v.parked_at, v.parked_lat, v.parked_lng,
              u.name as driver_name, o.name as owner_name
       FROM vehicles v
       LEFT JOIN users u ON v.driver_id = u.id
       LEFT JOIN users o ON v.owner_id = o.id
       WHERE v.driver_id = $1 OR v.owner_id = $1
       ORDER BY v.plate`,
      [userId]
    );
    res.json(r.rows);
    return;
  }
  // admin, helper — see all
  const r = await pool.query(
    `SELECT v.id, v.plate, v.name, v.imei, v.driver_id, v.owner_id, v.parked_at, v.parked_lat, v.parked_lng,
            u.name as driver_name, o.name as owner_name
     FROM vehicles v
     LEFT JOIN users u ON v.driver_id = u.id
     LEFT JOIN users o ON v.owner_id = o.id
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
    res.status(404).json({ error: t(req, 'vehicleNotFound') });
    return;
  }
  if (role !== 'admin' && v.driver_id !== userId && v.owner_id !== userId) {
    res.status(403).json({ error: t(req, 'accessDenied') });
    return;
  }
  res.json(v);
}));

// Plan vehicle limits
const PLAN_LIMITS: Record<string, number> = { free: 1, personal: 3, flotillas: 999 };

api.post('/vehicles', authMiddleware, requireRole('admin', 'driver', 'fleet_owner', 'citizen'), asyncHandler(async (req, res) => {
  const { userId, role } = (req as any).user;
  const { plate, name, imei, driver_id } = req.body;
  if (!plate || !imei) {
    res.status(400).json({ error: t(req, 'plateImeiRequired') });
    return;
  }
  if (typeof plate !== 'string' || plate.trim().length > 20) {
    res.status(400).json({ error: t(req, 'plateMax') });
    return;
  }
  if (typeof imei !== 'string' || !IMEI_REGEX.test(imei.trim())) {
    res.status(400).json({ error: t(req, 'invalidImei') });
    return;
  }
  if (name && (typeof name !== 'string' || name.trim().length > 100)) {
    res.status(400).json({ error: t(req, 'nameMax') });
    return;
  }

  // Enforce vehicle limit by plan (skip for admin)
  if (role !== 'admin') {
    const planResult = await pool.query('SELECT plan FROM users WHERE id = $1', [userId]);
    const userPlan = planResult.rows[0]?.plan || 'free';
    const maxVehicles = PLAN_LIMITS[userPlan] ?? 1;

    const countResult = await pool.query('SELECT COUNT(*) FROM vehicles WHERE owner_id = $1', [userId]);
    const currentCount = parseInt(countResult.rows[0].count, 10);

    if (currentCount >= maxVehicles) {
      res.status(403).json({
        error: 'plan_limit',
        message: `Tu plan ${userPlan} permite máximo ${maxVehicles} vehículo${maxVehicles > 1 ? 's' : ''}. Mejora tu plan para agregar más.`,
        plan: userPlan,
        limit: maxVehicles,
        current: currentCount,
      });
      return;
    }
  }

  // Determine owner_id and driver_id based on role
  let ownerId: string | null = null;
  let assignedDriverId: string | null = driver_id || null;

  if (role === 'fleet_owner') {
    ownerId = userId;
    // fleet_owner can optionally assign a sub-driver
  } else if (role === 'driver' || role === 'citizen') {
    // citizen registering their first vehicle is implicitly becoming a driver
    ownerId = userId;
    assignedDriverId = userId; // driver is both owner and driver
  }
  // admin: owner_id stays null unless explicitly set, driver_id from body

  try {
    const r = await pool.query(
      `INSERT INTO vehicles (plate, name, imei, driver_id, owner_id) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [plate, name || null, imei, assignedDriverId, ownerId]
    );

    // Promote citizen → driver after successful vehicle registration. The
    // IMEI is the gating condition: anyone registering a GPS device owns
    // the panic-response flow for that vehicle. This is the only supported
    // path from citizen to driver — it cannot be done via the OTP body.
    if (role === 'citizen') {
      await pool.query(
        `UPDATE users SET role = 'driver', updated_at = NOW() WHERE id = $1 AND role = 'citizen'`,
        [userId]
      );
      logger.info(`User ${userId} promoted citizen→driver after registering vehicle ${r.rows[0].id}`);
      writeAuditLog(req, {
        action: 'user.role_change',
        targetType: 'user',
        targetId: userId,
        details: { from: 'citizen', to: 'driver', reason: 'vehicle_registration', vehicle_id: r.rows[0].id },
      });
    }

    writeAuditLog(req, {
      action: 'vehicle.create',
      targetType: 'vehicle',
      targetId: r.rows[0].id,
      details: { plate, imei: imei ? `***${String(imei).slice(-4)}` : null },
    });
    res.status(201).json(r.rows[0]);
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e?.code === '23505') {
      res.status(409).json({ error: t(req, 'imeiOrPlateExists') });
      return;
    }
    throw err;
  }
}));

api.put('/vehicles/:id', authMiddleware, requireRole('admin', 'fleet_owner'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId, role } = (req as any).user;
  const { plate, name, imei, driver_id } = req.body;

  // Fleet owner can only edit their own vehicles
  if (role === 'fleet_owner') {
    const check = await pool.query('SELECT owner_id FROM vehicles WHERE id = $1', [id]);
    if (!check.rows[0] || check.rows[0].owner_id !== userId) {
      res.status(403).json({ error: t(req, 'onlyOwnVehiclesEdit') });
      return;
    }
  }

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
      res.status(409).json({ error: t(req, 'imeiOrPlateExists') });
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
    res.status(404).json({ error: t(req, 'vehicleNotFound') });
    return;
  }
  writeAuditLog(req, {
    action: 'vehicle.update',
    targetType: 'vehicle',
    targetId: id,
    details: {
      plate: plate ?? undefined,
      driver_id: driverId,
      imei_masked: imei ? `***${String(imei).slice(-4)}` : undefined,
    },
  });
  res.json(r.rows[0]);
}));

api.delete('/vehicles/:id', authMiddleware, requireRole('admin', 'fleet_owner'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId, role } = (req as any).user;

  if (role === 'fleet_owner') {
    const check = await pool.query('SELECT owner_id FROM vehicles WHERE id = $1', [id]);
    if (!check.rows[0] || check.rows[0].owner_id !== userId) {
      res.status(403).json({ error: t(req, 'onlyOwnVehiclesDel') });
      return;
    }
  }

  const r = await pool.query('DELETE FROM vehicles WHERE id = $1 RETURNING id, plate', [id]);
  if (!r.rows[0]) {
    res.status(404).json({ error: t(req, 'vehicleNotFound') });
    return;
  }
  writeAuditLog(req, {
    action: 'vehicle.delete',
    targetType: 'vehicle',
    targetId: id,
    details: { plate: r.rows[0].plate },
  });
  res.json({ success: true });
}));

// ── Fleet owner: manage sub-drivers ─────────────────────────────────────────

// List drivers assigned to fleet_owner's vehicles
api.get('/fleet/drivers', authMiddleware, requireRole('fleet_owner'), asyncHandler(async (req, res) => {
  const { userId } = (req as any).user;
  const r = await pool.query(
    `SELECT DISTINCT u.id, u.phone, u.name, u.role, u.email
     FROM users u
     JOIN vehicles v ON v.driver_id = u.id AND v.owner_id = $1
     ORDER BY u.name`,
    [userId]
  );
  res.json(r.rows);
}));

// Create a sub-driver (fleet_owner only)
api.post('/fleet/drivers', authMiddleware, requireRole('fleet_owner'), asyncHandler(async (req, res) => {
  const { phone, name, email } = req.body;
  if (!phone || typeof phone !== 'string' || !name || typeof name !== 'string') {
    res.status(400).json({ error: t(req, 'phoneAndNameReq') });
    return;
  }
  if (!isValidPhone(phone)) {
    res.status(400).json({ error: t(req, 'invalidPhone') });
    return;
  }
  // Check if user already exists
  const existing = await pool.query('SELECT id, phone, name, role FROM users WHERE phone = $1', [phone.trim()]);
  if (existing.rows[0]) {
    // Return existing user (fleet_owner can assign them)
    res.json(existing.rows[0]);
    return;
  }
  const cleanEmail = email && typeof email === 'string' ? email.trim().toLowerCase() : null;
  const r = await pool.query(
    `INSERT INTO users (phone, name, role, email) VALUES ($1, $2, 'driver', $3) RETURNING id, phone, name, role`,
    [phone.trim(), name.trim(), cleanEmail]
  );
  res.status(201).json(r.rows[0]);
}));

// Assign or unassign a driver to a fleet_owner's vehicle
api.put('/fleet/vehicles/:id/driver', authMiddleware, requireRole('fleet_owner'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId } = (req as any).user;
  const { driver_id } = req.body;

  // Verify vehicle ownership
  const check = await pool.query('SELECT id, owner_id FROM vehicles WHERE id = $1', [id]);
  if (!check.rows[0] || check.rows[0].owner_id !== userId) {
    res.status(403).json({ error: t(req, 'onlyOwnVehiclesMgr') });
    return;
  }

  const driverId = driver_id === '' || driver_id === null || driver_id === undefined ? null : driver_id;

  // Security: validate that driver_id is actually a driver
  if (driverId) {
    const driverCheck = await pool.query('SELECT role FROM users WHERE id = $1', [driverId]);
    if (!driverCheck.rows[0] || driverCheck.rows[0].role !== 'driver') {
      res.status(400).json({ error: 'Solo se pueden asignar usuarios con rol driver' });
      return;
    }
  }

  await pool.query('UPDATE vehicles SET driver_id = $2, updated_at = NOW() WHERE id = $1', [id, driverId]);

  const r = await pool.query(
    `SELECT v.*, u.name as driver_name FROM vehicles v
     LEFT JOIN users u ON v.driver_id = u.id WHERE v.id = $1`,
    [id]
  );
  res.json(r.rows[0]);
}));

// Park vehicle: activate theft detection mode
api.post('/vehicles/:id/park', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId, role } = (req as any).user;

  // Verify ownership or admin
  const v = await pool.query('SELECT id, driver_id, owner_id, plate, parked_at FROM vehicles WHERE id = $1', [id]);
  if (!v.rows[0]) {
    res.status(404).json({ error: t(req, 'vehicleNotFound') });
    return;
  }
  if (role !== 'admin' && v.rows[0].driver_id !== userId && v.rows[0].owner_id !== userId) {
    res.status(403).json({ error: t(req, 'onlyDriverOwnerPark') });
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

  const v = await pool.query('SELECT id, driver_id, owner_id, plate, parked_at FROM vehicles WHERE id = $1', [id]);
  if (!v.rows[0]) {
    res.status(404).json({ error: t(req, 'vehicleNotFound') });
    return;
  }
  if (role !== 'admin' && v.rows[0].driver_id !== userId && v.rows[0].owner_id !== userId) {
    res.status(403).json({ error: t(req, 'onlyDriverOwnerUnpark') });
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

// ── Trip History ─────────────────────────────────────────────────────────────

api.get('/vehicles/:id/history', authMiddleware, requireRole('admin', 'helper', 'driver', 'fleet_owner'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId, role } = (req as any).user;

  // Verify access
  const v = await pool.query('SELECT id, driver_id, owner_id FROM vehicles WHERE id = $1', [id]);
  if (!v.rows[0]) { res.status(404).json({ error: t(req, 'vehicleNotFound') }); return; }
  if (role !== 'admin' && role !== 'helper' && v.rows[0].driver_id !== userId && v.rows[0].owner_id !== userId) {
    res.status(403).json({ error: t(req, 'accessDenied') }); return;
  }

  const date = String(req.query.date || '');
  const from = String(req.query.from || '');
  const to = String(req.query.to || '');

  let whereDate = '';
  const params: unknown[] = [id];

  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    whereDate = `AND timestamp_at >= $2::date AND timestamp_at < ($2::date + interval '1 day')`;
    params.push(date);
  } else if (from) {
    whereDate = `AND timestamp_at >= $2::timestamptz`;
    params.push(from);
    if (to) { whereDate += ` AND timestamp_at <= $${params.length + 1}::timestamptz`; params.push(to); }
  } else {
    // Default: today
    whereDate = `AND timestamp_at >= CURRENT_DATE AND timestamp_at < CURRENT_DATE + interval '1 day'`;
  }

  const r = await pool.query(
    `SELECT latitude, longitude, speed, altitude, timestamp_at
     FROM gps_logs
     WHERE vehicle_id = $1 AND latitude != 0 AND longitude != 0 ${whereDate}
     ORDER BY timestamp_at ASC
     LIMIT 5000`,
    params
  );

  // Compute summary
  let totalDistanceM = 0;
  let maxSpeed = 0;
  for (let i = 1; i < r.rows.length; i++) {
    const prev = r.rows[i - 1];
    const curr = r.rows[i];
    const R = 6371000;
    const toRad = (d: number) => d * Math.PI / 180;
    const dLat = toRad(curr.latitude - prev.latitude);
    const dLon = toRad(curr.longitude - prev.longitude);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(prev.latitude)) * Math.cos(toRad(curr.latitude)) * Math.sin(dLon/2)**2;
    totalDistanceM += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    if (curr.speed > maxSpeed) maxSpeed = curr.speed;
  }

  res.json({
    vehicleId: id,
    points: r.rows.map((row: { latitude: number; longitude: number; speed: number; altitude: number; timestamp_at: string }) => ({
      lat: row.latitude,
      lng: row.longitude,
      speed: row.speed,
      altitude: row.altitude,
      time: row.timestamp_at,
    })),
    summary: {
      totalPoints: r.rows.length,
      distanceKm: Math.round(totalDistanceM / 100) / 10,
      maxSpeed,
      startTime: r.rows[0]?.timestamp_at || null,
      endTime: r.rows[r.rows.length - 1]?.timestamp_at || null,
    },
  });
}));

// ── Geofences CRUD ──────────────────────────────────────────────────────────

api.get('/geofences', authMiddleware, requireRole('admin', 'fleet_owner', 'driver'), asyncHandler(async (req, res) => {
  const { userId, role } = (req as any).user;
  if (role === 'admin') {
    const r = await pool.query('SELECT g.*, u.name as user_name FROM geofences g LEFT JOIN users u ON g.user_id = u.id ORDER BY g.created_at DESC');
    res.json(r.rows);
  } else {
    const r = await pool.query('SELECT * FROM geofences WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    res.json(r.rows);
  }
}));

api.post('/geofences', authMiddleware, requireRole('admin', 'fleet_owner', 'driver'), asyncHandler(async (req, res) => {
  const { userId } = (req as any).user;
  const { name, latitude, longitude, radius_m, alert_on_exit, alert_on_enter } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 100) {
    res.status(400).json({ error: t(req, 'nameReqMax') }); return;
  }
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    res.status(400).json({ error: t(req, 'coordsRequired') }); return;
  }
  const radius = Math.min(Math.max(parseInt(String(radius_m || 500), 10) || 500, 50), 50000);

  const r = await pool.query(
    `INSERT INTO geofences (user_id, name, latitude, longitude, radius_m, alert_on_exit, alert_on_enter)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [userId, name.trim(), latitude, longitude, radius, alert_on_exit !== false, alert_on_enter === true]
  );
  res.status(201).json(r.rows[0]);
}));

api.put('/geofences/:id', authMiddleware, requireRole('admin', 'fleet_owner', 'driver'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId, role } = (req as any).user;

  const check = await pool.query('SELECT user_id FROM geofences WHERE id = $1', [id]);
  if (!check.rows[0]) { res.status(404).json({ error: t(req, 'geofenceNotFound') }); return; }
  if (role !== 'admin' && check.rows[0].user_id !== userId) { res.status(403).json({ error: t(req, 'accessDenied') }); return; }

  const { name, latitude, longitude, radius_m, alert_on_exit, alert_on_enter, is_active } = req.body;
  const r = await pool.query(
    `UPDATE geofences SET
       name = COALESCE($2, name),
       latitude = COALESCE($3, latitude),
       longitude = COALESCE($4, longitude),
       radius_m = COALESCE($5, radius_m),
       alert_on_exit = COALESCE($6, alert_on_exit),
       alert_on_enter = COALESCE($7, alert_on_enter),
       is_active = COALESCE($8, is_active)
     WHERE id = $1 RETURNING *`,
    [id, name?.trim() || null, latitude ?? null, longitude ?? null, radius_m ?? null,
     alert_on_exit ?? null, alert_on_enter ?? null, is_active ?? null]
  );
  res.json(r.rows[0]);
}));

api.delete('/geofences/:id', authMiddleware, requireRole('admin', 'fleet_owner', 'driver'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId, role } = (req as any).user;

  const check = await pool.query('SELECT user_id FROM geofences WHERE id = $1', [id]);
  if (!check.rows[0]) { res.status(404).json({ error: t(req, 'geofenceNotFound') }); return; }
  if (role !== 'admin' && check.rows[0].user_id !== userId) { res.status(403).json({ error: t(req, 'accessDenied') }); return; }

  await pool.query('DELETE FROM geofences WHERE id = $1', [id]);
  res.json({ success: true });
}));

// Speed limit config
api.put('/me/speed-limit', authMiddleware, requireRole('admin', 'fleet_owner', 'driver'), asyncHandler(async (req, res) => {
  const { userId } = (req as any).user;
  const { speed_limit } = req.body;
  const limit = Math.min(Math.max(parseInt(String(speed_limit || 0), 10) || 0, 0), 300);
  await pool.query('UPDATE users SET speed_limit = $2, updated_at = NOW() WHERE id = $1', [userId, limit]);
  res.json({ success: true, speed_limit: limit });
}));

api.get('/me/speed-limit', authMiddleware, asyncHandler(async (req, res) => {
  const { userId } = (req as any).user;
  const r = await pool.query('SELECT speed_limit FROM users WHERE id = $1', [userId]);
  res.json({ speed_limit: r.rows[0]?.speed_limit || 0 });
}));

// ── Plan info + vehicle usage ──
api.get('/me/plan', authMiddleware, asyncHandler(async (req, res) => {
  const { userId } = (req as any).user;
  const userResult = await pool.query('SELECT plan FROM users WHERE id = $1', [userId]);
  const plan = userResult.rows[0]?.plan || 'free';
  const limit = PLAN_LIMITS[plan] ?? 1;
  const countResult = await pool.query('SELECT COUNT(*) FROM vehicles WHERE owner_id = $1', [userId]);
  const current = parseInt(countResult.rows[0].count, 10);
  res.json({ plan, limit, current, canAdd: current < limit });
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
    res.status(404).json({ error: t(req, 'incidentNotFound') });
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
    res.status(404).json({ error: t(req, 'incidentNotFound') });
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
    res.status(403).json({ error: t(req, 'adminOnlyStatus') });
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
    res.status(404).json({ error: t(req, 'incidentNotFound') });
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
    res.status(404).json({ error: t(req, 'incidentNotFound') });
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
    res.status(503).json({ error: t(req, 'emailServiceDown') });
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

    const ts = Date.now();
    const acceptSig = signWitnessToken(id, responder.user_id, 'accept', ts);
    const declineSig = signWitnessToken(id, responder.user_id, 'decline', ts);
    const acceptUrl = `${API_URL}/api/incidents/${id}/witness-response?user=${responder.user_id}&response=accept&sig=${acceptSig}&ts=${ts}`;
    const declineUrl = `${API_URL}/api/incidents/${id}/witness-response?user=${responder.user_id}&response=decline&sig=${declineSig}&ts=${ts}`;

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
  const { user, response, sig, ts } = req.query;

  if (!user || !response || !['accept', 'decline'].includes(String(response))) {
    res.status(400).send('<html><body><h2>Enlace inv\u00e1lido</h2></body></html>');
    return;
  }

  // Check URL expiration (72 hours)
  const tsNum = parseInt(String(ts || '0'), 10);
  if (!tsNum || Date.now() - tsNum > WITNESS_URL_EXPIRY_MS) {
    res.status(403).send('<html><body><h2>Este enlace ha expirado. Contacta al administrador.</h2></body></html>');
    return;
  }

  // Verify HMAC signature (timing-safe to prevent side-channel attacks)
  const expectedSig = signWitnessToken(id, String(user), String(response), tsNum);
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
    res.status(404).json({ error: t(req, 'alertNotFound') });
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

// Posiciones de MIS vehículos (drivers + fleet_owners): vehículos donde driver_id = userId OR owner_id = userId
api.get('/gps/my-positions', authMiddleware, requireRole('driver', 'fleet_owner'), asyncHandler(async (req, res) => {
  const { userId } = (req as any).user;
  const limit = Math.min(parseInt(String(req.query.limit || 50), 10) || 50, 100);
  const pg = await hasPostGis();

  const subq = pg
    ? `SELECT DISTINCT ON (g.imei) g.imei, g.vehicle_id, g.latitude, g.longitude, g.speed, g.timestamp_at, v.plate, v.parked_at
       FROM gps_logs g
       JOIN vehicles v ON v.id = g.vehicle_id AND (v.driver_id = $1 OR v.owner_id = $1)
       ORDER BY g.imei, g.timestamp_at DESC`
    : `SELECT DISTINCT ON (g.imei) g.imei, g.vehicle_id, g.latitude, g.longitude, g.speed, g.timestamp_at, v.plate, v.parked_at
       FROM gps_logs g
       JOIN vehicles v ON v.id = g.vehicle_id AND (v.driver_id = $1 OR v.owner_id = $1)
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
    res.status(400).json({ error: t(req, 'vehicleIdRequired') });
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
      res.status(403).json({ error: t(req, 'logsAccessDenied') });
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
      res.status(403).json({ error: t(req, 'logsAccessIncident') });
      return;
    }
  } else {
    res.status(403).json({ error: t(req, 'accessDenied') });
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
api.get('/helpers/nearby', authMiddleware, requireRole('admin', 'helper', 'driver'), asyncHandler(async (req, res) => {
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
      res.status(404).json({ error: t(req, 'userNotFound') });
      return;
    }
    res.json(r.rows[0]);
  } catch (err) {
    logger.error('GET /users/:id error:', err);
    res.status(500).json({ error: t(req, 'userFetchError') });
  }
}));

api.post('/users', authMiddleware, requireRole('admin'), asyncHandler(async (req, res) => {
  const { phone, name, role, email } = req.body;
  if (!phone || typeof phone !== 'string' || !name || typeof name !== 'string') {
    res.status(400).json({ error: t(req, 'phoneAndNameReq') });
    return;
  }
  if (name.trim().length > 100) {
    res.status(400).json({ error: t(req, 'nameMax') });
    return;
  }
  if (!isValidPhone(phone)) {
    res.status(400).json({ error: t(req, 'invalidPhoneMax') });
    return;
  }
  if (email && (typeof email !== 'string' || email.trim().length > 255)) {
    res.status(400).json({ error: t(req, 'emailMax') });
    return;
  }
  const finalRole = ['driver', 'helper', 'admin', 'citizen', 'fleet_owner'].includes(role) ? role : 'driver';
  const existing = await pool.query('SELECT id FROM users WHERE phone = $1', [phone]);
  if (existing.rows[0]) {
    res.status(409).json({ error: t(req, 'phoneDuplicate') });
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
      res.status(409).json({ error: t(req, 'phoneDuplicate2') });
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
    res.status(400).json({ error: t(req, 'updateFieldRequired') });
    return;
  }
  params.push(id);
  const r = await pool.query(
    `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${p} RETURNING id, phone, name, role, is_active`,
    params
  );
  if (!r.rows[0]) {
    res.status(404).json({ error: t(req, 'userNotFound') });
    return;
  }
  res.json(r.rows[0]);
}));

api.put('/users/:id/role', authMiddleware, requireRole('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  if (!['driver', 'helper', 'admin', 'citizen', 'fleet_owner'].includes(role)) {
    res.status(400).json({ error: t(req, 'invalidRole') });
    return;
  }
  const r = await pool.query(
    'UPDATE users SET role = $2, updated_at = NOW() WHERE id = $1 RETURNING id, phone, name, role',
    [id, role]
  );
  if (!r.rows[0]) {
    res.status(404).json({ error: t(req, 'userNotFound') });
    return;
  }
  res.json(r.rows[0]);
}));

api.put('/users/:id/block', authMiddleware, requireRole('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId } = (req as any).user;
  if (id === userId) {
    res.status(400).json({ error: t(req, 'cannotBlockSelf') });
    return;
  }
  // Prevent blocking the last active admin
  const adminCount = await pool.query(
    "SELECT COUNT(*)::int as cnt FROM users WHERE role = 'admin' AND COALESCE(is_active, true) = true AND id != $1",
    [id]
  );
  const target = await pool.query('SELECT role FROM users WHERE id = $1', [id]);
  if (target.rows[0]?.role === 'admin' && (adminCount.rows[0]?.cnt ?? 0) === 0) {
    res.status(400).json({ error: t(req, 'cannotBlockLastAdmin') });
    return;
  }
  const r = await pool.query(
    'UPDATE users SET is_active = NOT COALESCE(is_active, true), updated_at = NOW() WHERE id = $1 RETURNING id, phone, name, role, is_active',
    [id]
  );
  if (!r.rows[0]) {
    res.status(404).json({ error: t(req, 'userNotFound') });
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
    res.status(400).json({ error: t(req, 'gpsLocRequired') });
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
      res.status(404).json({ error: t(req, 'userNotFound') });
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
    res.status(400).json({ error: t(req, 'gpsLocRequired') });
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
         WHERE i.driver_id = $1 AND i.status IN ('active', 'attending', 'localizado')`,
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

// ── Terrain Analysis (Google Earth Engine) ───────────────────────────────────

const terrainRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiadas solicitudes de análisis. Intenta en 15 minutos.' },
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

api.post('/terrain/analyze', terrainRateLimit, authMiddleware, asyncHandler(async (req, res) => {
  const { analyzeTerrainChange, isGeeReady } = await import('../services/gee-service.js');

  if (!isGeeReady()) {
    res.status(503).json({ error: 'Terrain analysis service not configured. Set GEE_SERVICE_ACCOUNT_EMAIL and GEE_PRIVATE_KEY.' });
    return;
  }

  const { latitude, longitude, radiusKm, eventDate, afterDate, sensitivity } = req.body;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    res.status(400).json({ error: 'latitude and longitude are required (numbers)' });
    return;
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    res.status(400).json({ error: 'Invalid coordinates' });
    return;
  }
  if (!eventDate || isNaN(Date.parse(eventDate))) {
    res.status(400).json({ error: 'eventDate is required (ISO date string)' });
    return;
  }
  if (afterDate && isNaN(Date.parse(afterDate))) {
    res.status(400).json({ error: 'afterDate must be a valid ISO date string' });
    return;
  }
  const radius = typeof radiusKm === 'number' && radiusKm > 0 && radiusKm <= 20 ? radiusKm : 2;

  try {
    const validSensitivities = ['low', 'normal', 'high', 'max'];
    const sens = validSensitivities.includes(sensitivity) ? sensitivity : 'normal';
    const result = await analyzeTerrainChange(latitude, longitude, radius, eventDate, afterDate || undefined, sens);
    res.json(result);
  } catch (err: any) {
    if (err.message === 'NO_IMAGES_FOUND') {
      res.status(404).json({ error: 'No satellite images found for the selected dates and location' });
      return;
    }
    logger.error('POST /terrain/analyze error:', err);
    res.status(500).json({ error: 'Terrain analysis failed' });
  }
}));

api.get('/terrain/pois', authMiddleware, asyncHandler(async (req, res) => {
  const { userId } = (req as any).user;
  const r = await pool.query(
    `SELECT id, name, notes, latitude, longitude, event_date, created_at
     FROM terrain_pois WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [userId],
  );
  res.json(r.rows);
}));

api.post('/terrain/pois', authMiddleware, asyncHandler(async (req, res) => {
  const { userId } = (req as any).user;
  const { name, notes, latitude, longitude, eventDate } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    res.status(400).json({ error: 'latitude and longitude are required' });
    return;
  }

  const pgHasPostGis = await hasPostGis();
  const geomExpr = pgHasPostGis ? 'ST_SetSRID(ST_MakePoint($4, $3), 4326)' : 'NULL';

  const r = await pool.query(
    `INSERT INTO terrain_pois (user_id, name, notes, latitude, longitude, event_date, geom)
     VALUES ($1, $2, $5, $3, $4, $6, ${geomExpr})
     RETURNING id, name, notes, latitude, longitude, event_date, created_at`,
    [userId, name.trim().slice(0, 200), latitude, longitude, typeof notes === 'string' ? notes.trim().slice(0, 2000) : null, eventDate ? new Date(eventDate) : null],
  );
  res.status(201).json(r.rows[0]);
}));

api.delete('/terrain/pois/:id', authMiddleware, asyncHandler(async (req, res) => {
  const { userId } = (req as any).user;
  const { id } = req.params;
  const r = await pool.query('DELETE FROM terrain_pois WHERE id = $1 AND user_id = $2', [id, userId]);
  if ((r.rowCount ?? 0) === 0) {
    res.status(404).json({ error: 'POI not found' });
    return;
  }
  res.json({ success: true });
}));

// ── Push Notifications ──────────────────────────────────────────────────────

api.get('/push/vapid-key', (_req, res) => {
  const key = getVapidPublicKey();
  if (!key) {
    res.status(503).json({ error: t(_req, 'pushNotConfigured') });
    return;
  }
  res.json({ publicKey: key });
});

api.post('/push/subscribe', authMiddleware, asyncHandler(async (req, res) => {
  const { userId } = (req as any).user;
  const { subscription } = req.body;
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    res.status(400).json({ error: t(req, 'invalidSubscription') });
    return;
  }
  try {
    await saveSubscription(userId, subscription);
    res.json({ success: true });
  } catch (err) {
    logger.error('POST /push/subscribe error:', err);
    res.status(500).json({ error: t(req, 'savePushError') });
  }
}));

api.post('/push/unsubscribe', authMiddleware, asyncHandler(async (req, res) => {
  const { userId } = (req as any).user;
  const { endpoint } = req.body;
  if (!endpoint) {
    res.status(400).json({ error: t(req, 'endpointRequired') });
    return;
  }
  try {
    await removeSubscription(endpoint, userId);
    res.json({ success: true });
  } catch (err) {
    logger.error('POST /push/unsubscribe error:', err);
    res.status(500).json({ error: t(req, 'removePushError') });
  }
}));

// ── Delete user ─────────────────────────────────────────────────────────────

api.delete('/users/:id', authMiddleware, requireRole('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId } = (req as any).user;
  if (id === userId) {
    res.status(400).json({ error: t(req, 'cannotDeleteSelf') });
    return;
  }
  try {
    // Unassign user from vehicles first (FK has no ON DELETE CASCADE)
    await pool.query('UPDATE vehicles SET driver_id = NULL WHERE driver_id = $1', [id]);
    const r = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    if (!r.rows[0]) {
      res.status(404).json({ error: t(req, 'userNotFound') });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    logger.error('DELETE /users/:id error:', err);
    res.status(500).json({ error: t(req, 'deleteUserError') });
  }
}));

// ══════════════════════════════════════════════════════════════════════════════
// ██  SISTEMA DE DETECCIÓN DE FLOTAS Y PROSPECCIÓN AUTOMATIZADA
// ══════════════════════════════════════════════════════════════════════════════

const INGEST_TOKEN = process.env.SILENTEYE_SECRET_TOKEN || '';
const SITE_URL = process.env.PUBLIC_SITE_URL || 'https://silenteye.mx';

function generateFolio(): string {
  const prefix = 'SE';
  const ts = Date.now().toString(36).toUpperCase();
  const rand = randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}

// ── Webhook: Ingest prospects from scraper (Bearer token auth) ──
const ingestRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Demasiadas solicitudes de ingesta' },
  keyGenerator: (req) => req.ip || 'unknown',
});

api.post('/ingest-prospects', ingestRateLimit, asyncHandler(async (req, res) => {
  // Bearer token validation
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!INGEST_TOKEN || INGEST_TOKEN.length < 16) {
    logger.error('SILENTEYE_SECRET_TOKEN no configurado o muy corto');
    res.status(503).json({ error: t(req, 'serviceNotConfigured') });
    return;
  }
  if (!token || token.length !== INGEST_TOKEN.length || !timingSafeEqual(Buffer.from(token), Buffer.from(INGEST_TOKEN))) {
    res.status(401).json({ error: t(req, 'invalidToken') });
    return;
  }

  const { razonSocial, telefono, ubicacion, tipoTransporte, latitud, longitud } = req.body;
  if (!razonSocial || typeof razonSocial !== 'string' || razonSocial.trim().length < 2) {
    res.status(400).json({ error: t(req, 'razonSocialRequired') });
    return;
  }

  const folio = generateFolio();
  const baseSlug = slugify(razonSocial.trim());
  const slug = `${baseSlug}-${folio.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  const tipo = ['Fletes', 'Mudanzas', 'Materiales', 'Paquetería', 'Carga General'].includes(tipoTransporte) ? tipoTransporte : 'Fletes';

  try {
    const r = await pool.query(
      `INSERT INTO fleet_prospects (folio, razon_social, telefono_whatsapp, ubicacion_patio, latitud, longitud, tipo_transporte, slug)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, folio, slug, razon_social, status_seguridad, created_at`,
      [folio, razonSocial.trim(), telefono?.trim() || null, ubicacion?.trim() || null, latitud || null, longitud || null, tipo, slug]
    );

    const prospect = r.rows[0];
    const demoUrl = `${SITE_URL}/monitoreo-demo/${prospect.slug}`;

    // WhatsApp alert message — Protocolo Alerta
    const empresa = razonSocial.trim();
    const zona = ubicacion?.trim() || 'su zona';
    const whatsappMessage = `🚨 *ALERTA DE SEGURIDAD PATRIMONIAL - SILENT EYE*\n\nHemos detectado actividad logística de la empresa *${empresa}* en la zona de *${zona}*. Según nuestros registros de zona, sus unidades podrían estar operando sin Blindaje Digital Activo.\n\nHemos generado un Protocolo de Monitoreo Virtual para su flota aquí:\n🔗 ${demoUrl}\n\n*Acciones disponibles en el panel:*\n• Simulación de Paro de Motor Remoto\n• Reporte de Extracción de Combustible (Huachicoleo)\n• Geocerca de Seguridad Activa\n\nEvite pérdidas hoy mismo. Un asesor de seguridad está pendiente de su conexión.\n\n📋 Folio: ${folio}`;

    res.status(201).json({
      ok: true,
      prospect: {
        id: prospect.id,
        folio: prospect.folio,
        slug: prospect.slug,
        demoUrl,
        statusSeguridad: prospect.status_seguridad,
      },
      whatsappMessage,
    });
  } catch (err) {
    logger.error('POST /ingest-prospects error:', err);
    res.status(500).json({ error: t(req, 'prospectRegError') });
  }
}));

// ── Public: Get prospect data for demo page (increments view count) ──
const prospectDemoRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Demasiadas solicitudes. Intenta en 1 minuto.' },
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
api.get('/prospects/demo/:slug', prospectDemoRateLimit, asyncHandler(async (req, res) => {
  const { slug } = req.params;
  if (!slug || typeof slug !== 'string' || slug.length > 120) {
    res.status(400).json({ error: t(req, 'slugInvalid') });
    return;
  }

  try {
    const r = await pool.query(
      `UPDATE fleet_prospects SET vistas_demo = vistas_demo + 1, updated_at = NOW()
       WHERE slug = $1
       RETURNING id, folio, razon_social, ubicacion_patio, latitud, longitud, tipo_transporte, vistas_demo, status_seguridad, telefono_whatsapp, created_at`,
      [slug]
    );
    if (!r.rows[0]) {
      res.status(404).json({ error: t(req, 'prospectNotFound') });
      return;
    }
    const p = r.rows[0];

    // ── Task 3: Notify admin in real-time when prospect views demo ──
    broadcastToAdmins('prospect_viewing', {
      prospectId: p.id,
      razonSocial: p.razon_social,
      folio: p.folio,
      vistasDemo: p.vistas_demo,
      telefono: p.telefono_whatsapp,
      timestamp: new Date().toISOString(),
    });

    // Send email alert to admin (fire-and-forget)
    const adminResult = await pool.query("SELECT email FROM users WHERE role = 'admin' AND email IS NOT NULL LIMIT 1");
    if (adminResult.rows[0]?.email && isEmailEnabled()) {
      const adminEmail = adminResult.rows[0].email;
      sendEmail(
        adminEmail,
        `⚠️ ${p.razon_social} ESTÁ VIENDO EL MONITOREO AHORA`,
        `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:500px;margin:0 auto;padding:32px 24px;background:#0a0a0a;color:#fff;border-radius:12px">
          <div style="text-align:center;margin-bottom:24px">
            <span style="display:inline-block;background:#dc2626;color:#fff;font-weight:900;font-size:13px;padding:6px 16px;border-radius:20px;letter-spacing:1px">⚠️ ALERTA PROSPECT</span>
          </div>
          <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#fff">El gerente de ${p.razon_social} está viendo el monitoreo AHORA</h2>
          <p style="color:#a1a1aa;font-size:14px;margin:0 0 20px">Folio: ${p.folio} · Vista #${p.vistas_demo} · ${p.ubicacion_patio || 'Sin ubicación'}</p>
          <div style="background:#18181b;border:1px solid #dc2626;border-radius:8px;padding:16px;text-align:center;margin-bottom:20px">
            <p style="color:#fca5a5;font-size:24px;font-weight:900;margin:0">Llama en 3 minutos</p>
            ${p.telefono_whatsapp ? `<a href="tel:${p.telefono_whatsapp}" style="display:inline-block;margin-top:12px;background:#22c55e;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">📞 Llamar a ${p.telefono_whatsapp}</a>` : '<p style="color:#71717a;font-size:13px;margin:8px 0 0">Sin teléfono registrado</p>'}
          </div>
          <p style="color:#52525b;font-size:11px;text-align:center;margin:0">SilentEye — Sistema de Prospección Automatizada</p>
        </div>`
      ).catch(() => {});
    }

    res.json({
      folio: p.folio,
      razonSocial: p.razon_social,
      ubicacionPatio: p.ubicacion_patio,
      latitud: p.latitud,
      longitud: p.longitud,
      tipoTransporte: p.tipo_transporte,
      vistasDemo: p.vistas_demo,
      statusSeguridad: p.status_seguridad,
      createdAt: p.created_at,
    });
  } catch (err) {
    logger.error('GET /prospects/demo/:slug error:', err);
    res.status(500).json({ error: t(req, 'internalError') });
  }
}));

// ── Admin: List all prospects (Comandancia) ──
api.get('/prospects', authMiddleware, requireRole('admin'), asyncHandler(async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, folio, razon_social, telefono_whatsapp, ubicacion_patio, tipo_transporte,
              vistas_demo, status_seguridad, slug, notas, created_at, updated_at
       FROM fleet_prospects ORDER BY created_at DESC`
    );
    res.json(r.rows);
  } catch (err) {
    logger.error('GET /prospects error:', err);
    res.status(500).json({ error: t(req, 'prospectFetchError') });
  }
}));

// ── Admin: Update prospect status/notes ──
api.put('/prospects/:id', authMiddleware, requireRole('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { statusSeguridad, notas } = req.body;
  const validStatuses = ['detectado', 'demo_enviada', 'interesado', 'contactado', 'cliente', 'descartado'];
  const updates: string[] = [];
  const params: unknown[] = [];
  let p = 1;

  if (statusSeguridad && typeof statusSeguridad === 'string') {
    if (!validStatuses.includes(statusSeguridad)) {
      res.status(400).json({ error: `Status inválido. Permitidos: ${validStatuses.join(', ')}` });
      return;
    }
    updates.push(`status_seguridad = $${p++}`);
    params.push(statusSeguridad);
  }
  if (notas !== undefined) {
    updates.push(`notas = $${p++}`);
    params.push(typeof notas === 'string' ? notas.trim() : null);
  }
  if (updates.length === 0) {
    res.status(400).json({ error: t(req, 'prospectUpdateReq') });
    return;
  }
  params.push(id);
  try {
    const r = await pool.query(
      `UPDATE fleet_prospects SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${p} RETURNING *`,
      params
    );
    if (!r.rows[0]) {
      res.status(404).json({ error: t(req, 'prospectNotFound') });
      return;
    }
    res.json(r.rows[0]);
  } catch (err) {
    logger.error('PUT /prospects/:id error:', err);
    res.status(500).json({ error: t(req, 'prospectUpdateError') });
  }
}));

// ── Admin: Delete prospect ──
api.delete('/prospects/:id', authMiddleware, requireRole('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const r = await pool.query('DELETE FROM fleet_prospects WHERE id = $1 RETURNING id', [id]);
    if (!r.rows[0]) {
      res.status(404).json({ error: t(req, 'prospectNotFound') });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    logger.error('DELETE /prospects/:id error:', err);
    res.status(500).json({ error: t(req, 'prospectDeleteError') });
  }
}));

// ── Admin: Search Google Maps via SerpAPI ──
const SERPAPI_KEY = process.env.SERPAPI_KEY || '';

api.post('/prospects/search-maps', authMiddleware, requireRole('admin'), asyncHandler(async (req, res) => {
  const { query } = req.body;
  if (!query || typeof query !== 'string' || query.trim().length < 3) {
    res.status(400).json({ error: t(req, 'searchMinChars') });
    return;
  }
  if (!SERPAPI_KEY) {
    res.status(503).json({ error: t(req, 'serpApiNotConfigured') });
    return;
  }

  try {
    const params = new URLSearchParams({
      engine: 'google_maps',
      q: query.trim(),
      type: 'search',
      api_key: SERPAPI_KEY,
    });

    const serpRes = await fetch(`https://serpapi.com/search.json?${params.toString()}`);
    if (!serpRes.ok) {
      const errText = await serpRes.text();
      logger.error(`SerpAPI error ${serpRes.status}: ${errText}`);
      res.status(502).json({ error: t(req, 'googleMapsError') });
      return;
    }

    const data = await serpRes.json() as {
      local_results?: Array<{
        title?: string;
        phone?: string;
        address?: string;
        gps_coordinates?: { latitude?: number; longitude?: number };
        rating?: number;
        reviews?: number;
        type?: string;
        website?: string;
        place_id?: string;
      }>;
    };

    const results = (data.local_results || []).map(r => ({
      name: r.title || 'Sin nombre',
      phone: r.phone || null,
      address: r.address || null,
      lat: r.gps_coordinates?.latitude || null,
      lng: r.gps_coordinates?.longitude || null,
      rating: r.rating || null,
      reviews: r.reviews || null,
      type: r.type || null,
      website: r.website || null,
      placeId: r.place_id || null,
    }));

    res.json({ query: query.trim(), count: results.length, results });
  } catch (err) {
    logger.error('POST /prospects/search-maps error:', err);
    res.status(500).json({ error: t(req, 'internalSearchError') });
  }
}));

// ── Admin: Bulk ingest prospects from search results ──
api.post('/prospects/bulk-ingest', authMiddleware, requireRole('admin'), asyncHandler(async (req, res) => {
  const { prospects } = req.body;
  if (!Array.isArray(prospects) || prospects.length === 0) {
    res.status(400).json({ error: t(req, 'prospectArrayReq') });
    return;
  }
  if (prospects.length > 50) {
    res.status(400).json({ error: t(req, 'prospectMaxBatch') });
    return;
  }

  const results: Array<{ folio: string; slug: string; demoUrl: string; razonSocial: string; telefono: string | null; whatsappMessage: string; whatsappLink: string }> = [];

  try {
    for (const p of prospects) {
      const razonSocial = typeof p.name === 'string' ? p.name.trim() : 'Sin nombre';
      const telefono = typeof p.phone === 'string' ? p.phone.replace(/[^+\d]/g, '') : null;
      const ubicacion = typeof p.address === 'string' ? p.address.trim() : null;
      const tipo = typeof p.type === 'string' ? p.type.trim() : 'Transporte';
      const latitud = typeof p.lat === 'number' ? p.lat : null;
      const longitud = typeof p.lng === 'number' ? p.lng : null;

      const folio = generateFolio();
      const baseSlug = slugify(razonSocial);
      const slug = `${baseSlug}-${folio.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

      // Check for duplicate by phone or name+location
      if (telefono) {
        const dup = await pool.query('SELECT id FROM fleet_prospects WHERE telefono_whatsapp = $1 LIMIT 1', [telefono]);
        if (dup.rows[0]) continue;
      }

      const r = await pool.query(
        `INSERT INTO fleet_prospects (folio, razon_social, telefono_whatsapp, ubicacion_patio, latitud, longitud, tipo_transporte, slug)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, folio, slug`,
        [folio, razonSocial, telefono, ubicacion, latitud, longitud, tipo, slug]
      );

      const row = r.rows[0];
      const demoUrl = `${SITE_URL}/monitoreo-demo/${row.slug}`;
      const empresa = razonSocial;
      const zona = ubicacion || 'su zona';
      const whatsappMessage = `🚨 *ALERTA DE SEGURIDAD PATRIMONIAL - SILENT EYE*\n\nHemos detectado actividad logística de la empresa *${empresa}* en la zona de *${zona}*. Según nuestros registros de zona, sus unidades podrían estar operando sin Blindaje Digital Activo.\n\nHemos generado un Protocolo de Monitoreo Virtual para su flota aquí:\n🔗 ${demoUrl}\n\n*Acciones disponibles en el panel:*\n• Simulación de Paro de Motor Remoto\n• Reporte de Extracción de Combustible (Huachicoleo)\n• Geocerca de Seguridad Activa\n\nEvite pérdidas hoy mismo. Un asesor de seguridad está pendiente de su conexión.\n\n📋 Folio: ${folio}`;

      const whatsappLink = telefono
        ? `https://wa.me/${telefono.replace(/^\+/, '')}?text=${encodeURIComponent(whatsappMessage.replace(/\\n/g, '\n'))}`
        : '';

      results.push({ folio, slug: row.slug, demoUrl, razonSocial: empresa, telefono, whatsappMessage, whatsappLink });
    }

    res.json({ ok: true, ingested: results.length, results });
  } catch (err) {
    logger.error('POST /prospects/bulk-ingest error:', err);
    res.status(500).json({ error: t(req, 'prospectIngestError') });
  }
}));

// ══════════════════════════════════════════════════════════════════════════════
// ── Facial Recognition & Suspect Tracking ─────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// Cosine similarity between two face encoding vectors
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

const FACE_MATCH_THRESHOLD = 0.75; // cosine similarity threshold for suspect matching (raised from 0.6 to reduce false positives)

// Rate limit media uploads (prevent abuse)
const mediaUploadLimit = rateLimit({ windowMs: 60_000, max: 30, message: { error: 'Too many uploads' } });
const suspectCreateLimit = rateLimit({ windowMs: 60_000, max: 10, message: { error: 'Too many suspect operations' } });

// Validate base64 payload is actually a JPEG (magic bytes 0xFF 0xD8 0xFF)
function isValidJpegBase64(b64: string): boolean {
  try {
    const head = Buffer.from(b64.slice(0, 16), 'base64');
    return head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  } catch {
    return false;
  }
}

// Verify the caller has access to an incident (driver, follower, or admin).
// Returns true if authorized, sends 403 and returns false otherwise.
async function requireIncidentAccess(req: any, res: any, incidentId: string): Promise<boolean> {
  const { userId, role } = req.user;
  if (role === 'admin') return true;
  const r = await pool.query(
    `SELECT 1 FROM incidents
     WHERE id = $1
       AND (driver_id = $2
            OR EXISTS (SELECT 1 FROM incident_followers WHERE incident_id = $1 AND user_id = $2))`,
    [incidentId, userId]
  );
  if (!r.rows[0]) {
    res.status(403).json({ error: 'Access denied' });
    return false;
  }
  return true;
}

// ── Upload incident media (photo/video frame from phone camera) ──────────────
api.post('/incidents/:id/media', authMiddleware, mediaUploadLimit, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId } = (req as any).user;
  if (!isValidUuid(id)) { res.status(400).json({ error: 'Invalid incident ID' }); return; }

  const { image_data, media_type, latitude, longitude } = req.body;
  if (!image_data || typeof image_data !== 'string') {
    res.status(400).json({ error: 'image_data (base64) required' }); return;
  }
  // Limit size: ~500KB base64 max
  if (image_data.length > 700_000) {
    res.status(400).json({ error: 'Image too large (max 500KB)' }); return;
  }
  // Validate JPEG magic bytes — reject anything that is not a real JPEG
  if (!isValidJpegBase64(image_data)) {
    res.status(400).json({ error: 'image_data must be a valid JPEG' }); return;
  }

  if (!(await requireIncidentAccess(req, res, id))) return;

  const r = await pool.query(
    `INSERT INTO incident_media (incident_id, user_id, media_type, image_data, latitude, longitude)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, media_type, captured_at`,
    [id, userId, media_type || 'photo', image_data, latitude || null, longitude || null]
  );

  res.json(r.rows[0]);
}));

// ── Get media for an incident ────────────────────────────────────────────────
api.get('/incidents/:id/media', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidUuid(id)) { res.status(400).json({ error: 'Invalid incident ID' }); return; }

  if (!(await requireIncidentAccess(req, res, id))) return;

  const r = await pool.query(
    `SELECT id, media_type, image_data, latitude, longitude, captured_at
     FROM incident_media WHERE incident_id = $1 ORDER BY captured_at ASC`,
    [id]
  );
  res.json(r.rows);
}));

// ── Save detected face (encoding + crop from browser face-api.js) ────────────
api.post('/incidents/:id/faces', authMiddleware, mediaUploadLimit, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId } = (req as any).user;
  if (!isValidUuid(id)) { res.status(400).json({ error: 'Invalid incident ID' }); return; }

  const { media_id, face_crop, encoding, confidence, box } = req.body;
  if (!media_id || !isValidUuid(media_id) || !face_crop || !encoding || !Array.isArray(encoding)) {
    res.status(400).json({ error: 'media_id (uuid), face_crop, encoding[] required' }); return;
  }
  if (encoding.length < 64 || encoding.length > 512) {
    res.status(400).json({ error: 'encoding must be 64-512 dimensions' }); return;
  }
  // Validate face crop is a real JPEG
  if (typeof face_crop !== 'string' || face_crop.length > 700_000 || !isValidJpegBase64(face_crop)) {
    res.status(400).json({ error: 'face_crop must be a valid JPEG (max 500KB)' }); return;
  }
  // Validate encoding values are finite numbers in [-2, 2] (normalized descriptors)
  for (const v of encoding) {
    if (typeof v !== 'number' || !Number.isFinite(v) || v < -2 || v > 2) {
      res.status(400).json({ error: 'encoding must contain finite numbers in [-2, 2]' }); return;
    }
  }

  if (!(await requireIncidentAccess(req, res, id))) return;

  // Verify media_id belongs to this incident — prevent cross-incident contamination
  const mediaCheck = await pool.query(
    `SELECT 1 FROM incident_media WHERE id = $1 AND incident_id = $2`,
    [media_id, id]
  );
  if (!mediaCheck.rows[0]) {
    res.status(400).json({ error: 'media_id does not belong to this incident' });
    return;
  }

  const r = await pool.query(
    `INSERT INTO face_detections (incident_id, media_id, user_id, face_crop, encoding, confidence, box_x, box_y, box_w, box_h)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id, confidence, created_at`,
    [id, media_id, userId, face_crop, encoding, confidence || 0, box?.x || null, box?.y || null, box?.w || null, box?.h || null]
  );

  // Auto-match against existing suspects
  const suspects = await pool.query(
    `SELECT id, alias, primary_encoding FROM suspects WHERE status = 'active'`
  );
  const matches: { suspect_id: string; alias: string | null; similarity: number }[] = [];
  for (const suspect of suspects.rows) {
    const sim = cosineSimilarity(encoding, suspect.primary_encoding);
    if (sim >= FACE_MATCH_THRESHOLD) {
      matches.push({ suspect_id: suspect.id, alias: suspect.alias, similarity: Math.round(sim * 100) / 100 });

      // Auto-create sighting if not already linked
      await pool.query(
        `INSERT INTO suspect_sightings (suspect_id, incident_id, face_detection_id, similarity_score, latitude, longitude)
         SELECT $1, $2, $3, $4, i.latitude, i.longitude FROM incidents i WHERE i.id = $2
         ON CONFLICT (suspect_id, incident_id) DO UPDATE SET similarity_score = GREATEST(suspect_sightings.similarity_score, $4)`,
        [suspect.id, id, r.rows[0].id, sim]
      );

      // Update suspect stats
      await pool.query(
        `UPDATE suspects SET last_seen_at = NOW(), incident_count = (SELECT COUNT(DISTINCT incident_id) FROM suspect_sightings WHERE suspect_id = $1), updated_at = NOW() WHERE id = $1`,
        [suspect.id]
      );
    }
  }

  res.json({
    ...r.rows[0],
    matches: matches.length > 0 ? matches : undefined,
    matchCount: matches.length,
  });
}));

// ── Get faces for an incident ────────────────────────────────────────────────
api.get('/incidents/:id/faces', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidUuid(id)) { res.status(400).json({ error: 'Invalid incident ID' }); return; }

  if (!(await requireIncidentAccess(req, res, id))) return;

  const r = await pool.query(
    `SELECT fd.id, fd.face_crop, fd.confidence, fd.box_x, fd.box_y, fd.box_w, fd.box_h, fd.created_at,
            s.id as suspect_id, s.alias as suspect_alias, ss.similarity_score
     FROM face_detections fd
     LEFT JOIN suspect_sightings ss ON ss.face_detection_id = fd.id
     LEFT JOIN suspects s ON ss.suspect_id = s.id
     WHERE fd.incident_id = $1
     ORDER BY fd.created_at ASC`,
    [id]
  );
  res.json(r.rows);
}));

// ── User self-service: delete a captured face ───────────────────────────────
// Right to erasure (GDPR Art. 17 / LFPDPPP). A user can delete a face
// detection tied to one of their incidents — typically a bystander who was
// captured by accident during an SOS. The row is dropped outright; any
// suspect_sightings pointing to it are left intact (face_detection_id →
// NULL via ON DELETE SET NULL). Admins can delete any face.
api.delete('/faces/:id', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId, role } = (req as any).user;
  if (!isValidUuid(id)) { res.status(400).json({ error: 'Invalid face ID' }); return; }

  // Fetch face + incident owner
  const r = await pool.query(
    `SELECT fd.id, fd.incident_id, i.driver_id
     FROM face_detections fd
     JOIN incidents i ON i.id = fd.incident_id
     WHERE fd.id = $1`,
    [id]
  );
  const face = r.rows[0];
  if (!face) { res.status(404).json({ error: 'Face not found' }); return; }

  // Authorization: admin, incident driver, or incident follower.
  if (role !== 'admin') {
    if (face.driver_id !== userId) {
      const follow = await pool.query(
        `SELECT 1 FROM incident_followers WHERE incident_id = $1 AND user_id = $2`,
        [face.incident_id, userId]
      );
      if (!follow.rows[0]) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
    }
  }

  await pool.query(`DELETE FROM face_detections WHERE id = $1`, [id]);
  writeAuditLog(req, {
    action: 'face.delete',
    targetType: 'face_detection',
    targetId: id,
    details: { incident_id: face.incident_id, reason: 'user_request' },
  });
  res.json({ ok: true });
}));

// ── List all faces detected across the user's incidents (admin sees all) ────
api.get('/faces/my', authMiddleware, asyncHandler(async (req, res) => {
  const { userId, role } = (req as any).user;
  const isAdmin = role === 'admin';
  const r = await pool.query(
    `SELECT fd.id, fd.incident_id, fd.face_crop, fd.confidence, fd.created_at,
            i.started_at as inc_date, i.status as inc_status, i.source as inc_source,
            i.latitude as inc_lat, i.longitude as inc_lng,
            v.plate,
            s.id as suspect_id, s.alias as suspect_alias, ss.similarity_score
     FROM face_detections fd
     JOIN incidents i ON i.id = fd.incident_id
     LEFT JOIN vehicles v ON v.id = i.vehicle_id
     LEFT JOIN suspect_sightings ss ON ss.face_detection_id = fd.id
     LEFT JOIN suspects s ON ss.suspect_id = s.id
     WHERE $2::boolean
        OR i.driver_id = $1
        OR EXISTS (SELECT 1 FROM incident_followers WHERE incident_id = i.id AND user_id = $1)
     ORDER BY fd.created_at DESC
     LIMIT 500`,
    [userId, isAdmin]
  );
  res.json(r.rows);
}));

// ── Mark a face detection as suspect ─────────────────────────────────────────
// Only admin/helper can mark suspects — creating system-wide suspect records
// is a privileged operation that affects every future face auto-match.
api.post('/suspects', authMiddleware, requireRole('admin', 'helper'), suspectCreateLimit, asyncHandler(async (req, res) => {
  const { userId } = (req as any).user;
  const { face_detection_id, alias, notes } = req.body;
  if (!face_detection_id || !isValidUuid(face_detection_id)) {
    res.status(400).json({ error: 'face_detection_id required' }); return;
  }

  // Get the face detection
  const fd = await pool.query(
    `SELECT fd.*, i.latitude, i.longitude, i.id as incident_id
     FROM face_detections fd JOIN incidents i ON i.id = fd.incident_id
     WHERE fd.id = $1`,
    [face_detection_id]
  );
  if (!fd.rows[0]) { res.status(404).json({ error: 'Face detection not found' }); return; }
  const face = fd.rows[0];

  // Check if this face already matches an existing suspect
  const existingSuspects = await pool.query(
    `SELECT id, alias, primary_encoding FROM suspects WHERE status = 'active'`
  );
  let matchedSuspect: { id: string; similarity: number } | null = null;
  for (const s of existingSuspects.rows) {
    const sim = cosineSimilarity(face.encoding, s.primary_encoding);
    if (sim >= FACE_MATCH_THRESHOLD) {
      matchedSuspect = { id: s.id, similarity: sim };
      break;
    }
  }

  if (matchedSuspect) {
    // Link to existing suspect — new sighting
    await pool.query(
      `INSERT INTO suspect_sightings (suspect_id, incident_id, face_detection_id, similarity_score, latitude, longitude, confirmed_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (suspect_id, incident_id) DO UPDATE SET similarity_score = GREATEST(suspect_sightings.similarity_score, $4), confirmed_by = $7`,
      [matchedSuspect.id, face.incident_id, face_detection_id, matchedSuspect.similarity, face.latitude, face.longitude, userId]
    );
    await pool.query(
      `UPDATE suspects SET last_seen_at = NOW(), incident_count = (SELECT COUNT(DISTINCT incident_id) FROM suspect_sightings WHERE suspect_id = $1), updated_at = NOW(), notes = COALESCE($2, notes) WHERE id = $1`,
      [matchedSuspect.id, notes || null]
    );

    const updated = await pool.query(
      `SELECT id, alias, primary_face_crop, status, notes, incident_count,
              first_seen_at, last_seen_at, created_at, created_by
       FROM suspects WHERE id = $1`,
      [matchedSuspect.id]
    );
    writeAuditLog(req, {
      action: 'suspect.link',
      targetType: 'suspect',
      targetId: matchedSuspect.id,
      details: { face_detection_id, similarity: Math.round(matchedSuspect.similarity * 100) / 100 },
    });
    res.json({ ...updated.rows[0], linked_to_existing: true, similarity: Math.round(matchedSuspect.similarity * 100) / 100 });
  } else {
    // Create new suspect
    const r = await pool.query(
      `INSERT INTO suspects (alias, primary_encoding, primary_face_crop, notes, created_by, first_seen_at, last_seen_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, alias, primary_face_crop, status, notes, incident_count,
                 first_seen_at, last_seen_at, created_at, created_by`,
      [alias || null, face.encoding, face.face_crop, notes || null, userId]
    );
    const suspect = r.rows[0];

    // Create first sighting
    await pool.query(
      `INSERT INTO suspect_sightings (suspect_id, incident_id, face_detection_id, similarity_score, latitude, longitude, confirmed_by)
       VALUES ($1, $2, $3, 1.0, $4, $5, $6)`,
      [suspect.id, face.incident_id, face_detection_id, face.latitude, face.longitude, userId]
    );

    writeAuditLog(req, {
      action: 'suspect.create',
      targetType: 'suspect',
      targetId: suspect.id,
      details: { face_detection_id, alias: alias || null },
    });
    res.json({ ...suspect, linked_to_existing: false });
  }
}));

// ── List all suspects with sighting stats ────────────────────────────────────
// Restricted to admin/helper — the suspect database is sensitive and should
// not be enumerable by regular users.
api.get('/suspects', authMiddleware, requireRole('admin', 'helper'), asyncHandler(async (req, res) => {
  const r = await pool.query(
    `SELECT s.id, s.alias, s.primary_face_crop, s.status, s.notes, s.incident_count,
            s.first_seen_at, s.last_seen_at, s.created_at,
            u.name as created_by_name
     FROM suspects s
     LEFT JOIN users u ON s.created_by = u.id
     ORDER BY s.last_seen_at DESC`
  );
  res.json(r.rows);
}));

// ── Get suspect detail with full incident history ────────────────────────────
api.get('/suspects/:id', authMiddleware, requireRole('admin', 'helper'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidUuid(id)) { res.status(400).json({ error: 'Invalid suspect ID' }); return; }

  // Explicit column list — NEVER return primary_encoding (128-dim face
  // descriptor). Leaking the encoding would give an attacker a face-lookup
  // oracle they could run offline against arbitrary photos.
  const suspect = await pool.query(
    `SELECT id, alias, primary_face_crop, status, notes, incident_count,
            first_seen_at, last_seen_at, created_at, updated_at, created_by
     FROM suspects WHERE id = $1`,
    [id]
  );
  if (!suspect.rows[0]) { res.status(404).json({ error: 'Suspect not found' }); return; }

  // Get all sightings with incident details
  const sightings = await pool.query(
    `SELECT ss.*, i.latitude as inc_lat, i.longitude as inc_lng, i.started_at as inc_date,
            i.status as inc_status, i.source as inc_source,
            v.plate, fd.face_crop, fd.confidence,
            u.name as confirmed_by_name
     FROM suspect_sightings ss
     JOIN incidents i ON i.id = ss.incident_id
     LEFT JOIN vehicles v ON v.id = i.vehicle_id
     LEFT JOIN face_detections fd ON fd.id = ss.face_detection_id
     LEFT JOIN users u ON u.id = ss.confirmed_by
     WHERE ss.suspect_id = $1
     ORDER BY i.started_at DESC`,
    [id]
  );

  // Build pattern analysis
  const locations = sightings.rows
    .filter((s: any) => s.latitude && s.longitude)
    .map((s: any) => ({ lat: s.latitude || s.inc_lat, lng: s.longitude || s.inc_lng, date: s.inc_date }));

  res.json({
    ...suspect.rows[0],
    sightings: sightings.rows,
    pattern: {
      total_incidents: sightings.rows.length,
      locations,
      date_range: sightings.rows.length > 0
        ? { first: sightings.rows[sightings.rows.length - 1].inc_date, last: sightings.rows[0].inc_date }
        : null,
    },
  });
}));

// ── Update suspect (alias, status, notes) ────────────────────────────────────
api.put('/suspects/:id', authMiddleware, requireRole('admin', 'helper'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidUuid(id)) { res.status(400).json({ error: 'Invalid suspect ID' }); return; }

  const { alias, status, notes } = req.body;
  const validStatuses = ['active', 'captured', 'cleared', 'archived'];
  if (status && !validStatuses.includes(status)) {
    res.status(400).json({ error: `Invalid status. Valid: ${validStatuses.join(', ')}` }); return;
  }

  const r = await pool.query(
    `UPDATE suspects SET
       alias = COALESCE($2, alias),
       status = COALESCE($3, status),
       notes = COALESCE($4, notes),
       updated_at = NOW()
     WHERE id = $1
     RETURNING id, alias, primary_face_crop, status, notes, incident_count,
               first_seen_at, last_seen_at, created_at, updated_at, created_by`,
    [id, alias || null, status || null, notes || null]
  );
  if (!r.rows[0]) { res.status(404).json({ error: 'Suspect not found' }); return; }
  writeAuditLog(req, {
    action: 'suspect.update',
    targetType: 'suspect',
    targetId: id,
    details: { alias: alias || null, status: status || null, has_notes: !!notes },
  });
  res.json(r.rows[0]);
}));

// ── Match a face encoding against all suspects ──────────────────────────────
api.post('/suspects/match', authMiddleware, requireRole('admin', 'helper'), asyncHandler(async (req, res) => {
  const { encoding } = req.body;
  if (!encoding || !Array.isArray(encoding) || encoding.length < 64) {
    res.status(400).json({ error: 'encoding[] required (64-512 dims)' }); return;
  }

  const suspects = await pool.query(
    `SELECT id, alias, primary_encoding, primary_face_crop, status, incident_count, last_seen_at
     FROM suspects WHERE status = 'active'`
  );

  const matches = suspects.rows
    .map((s: any) => ({
      suspect_id: s.id,
      alias: s.alias,
      face_crop: s.primary_face_crop,
      incident_count: s.incident_count,
      last_seen_at: s.last_seen_at,
      similarity: Math.round(cosineSimilarity(encoding, s.primary_encoding) * 100) / 100,
    }))
    .filter((m: any) => m.similarity >= FACE_MATCH_THRESHOLD)
    .sort((a: any, b: any) => b.similarity - a.similarity);

  res.json({ matches, threshold: FACE_MATCH_THRESHOLD });
}));

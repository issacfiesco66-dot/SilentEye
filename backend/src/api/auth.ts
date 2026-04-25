/**
 * SilentEye — Plataforma de Seguridad Vehicular
 * Copyright (c) 2026 Christian Fiesco. All rights reserved.
 * PROPRIETARY AND CONFIDENTIAL — See LICENSE file for details.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import jwt from 'jsonwebtoken';
import { randomInt, randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import { pool } from '../db/pool.js';
import { logger } from '../utils/logger.js';
import { t as _t } from '../i18n.js';

// Seguridad: JWT_SECRET obligatorio. Sin valor por defecto.
const _rawSecret = process.env.JWT_SECRET;
if (!_rawSecret || _rawSecret.length < 32) {
  throw new Error(
    'JWT_SECRET es obligatorio y debe tener al menos 32 caracteres. Configure en .env antes de arrancar.'
  );
}
const JWT_SECRET: string = _rawSecret;
const OTP_EXPIRY_MINUTES = 10;
const OTP_LENGTH = 6;

const MAX_OTP_ATTEMPTS = 5;

export function generateOtp(): string {
  return randomInt(100000, 999999).toString();
}

export async function createOtp(phone: string): Promise<string> {
  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  await pool.query(
    'UPDATE otp_codes SET used = true WHERE phone = $1 AND NOT used',
    [phone]
  );
  await pool.query(
    'INSERT INTO otp_codes (phone, code, expires_at) VALUES ($1, $2, $3)',
    [phone, code, expiresAt]
  );
  logger.info(`OTP creado para ***${phone.slice(-4)} (expira en ${OTP_EXPIRY_MINUTES} min)`);
  return code;
}

export async function verifyOtp(phone: string, code: string): Promise<{ valid: boolean; user: { id: string; phone: string; name: string; role: string; email: string | null; plan: string } | null; error?: string }> {
  // Brute-force protection (graceful: skip if 'attempts' column doesn't exist yet)
  let hasAttemptsCol = true;
  try {
    const attempts = await pool.query(
      `SELECT COUNT(*)::int as cnt FROM otp_codes
       WHERE phone = $1 AND NOT used AND expires_at > NOW() AND attempts >= $2`,
      [phone, MAX_OTP_ATTEMPTS]
    );
    if ((attempts.rows[0]?.cnt ?? 0) > 0) {
      logger.warn(`OTP bloqueado por intentos excesivos: ***${phone.slice(-4)}`);
      return { valid: false, user: null, error: 'Too many attempts / Demasiados intentos' };
    }
    await pool.query(
      `UPDATE otp_codes SET attempts = COALESCE(attempts, 0) + 1
       WHERE phone = $1 AND NOT used AND expires_at > NOW()`,
      [phone]
    );
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err?.code === '42703') {
      // Column "attempts" does not exist — skip brute-force protection
      hasAttemptsCol = false;
    } else {
      throw e;
    }
  }

  const result = hasAttemptsCol
    ? await pool.query(
        `UPDATE otp_codes SET used = true
         WHERE phone = $1 AND code = $2 AND expires_at > NOW() AND NOT used AND COALESCE(attempts, 0) <= $3
         RETURNING id`,
        [phone, code, MAX_OTP_ATTEMPTS]
      )
    : await pool.query(
        `UPDATE otp_codes SET used = true
         WHERE phone = $1 AND code = $2 AND expires_at > NOW() AND NOT used
         RETURNING id`,
        [phone, code]
      );
  if (result.rowCount === 0) return { valid: false, user: null };

  // Look up user by phone OR by email (for citizen email login)
  let userResult = await pool.query(
    'SELECT id, phone, name, role, email, COALESCE(plan, \'free\') as plan, is_active FROM users WHERE phone = $1',
    [phone]
  );
  if (userResult.rows.length === 0 && phone.includes('@')) {
    userResult = await pool.query(
      'SELECT id, phone, name, role, email, COALESCE(plan, \'free\') as plan, is_active FROM users WHERE email = $1',
      [phone]
    );
  }
  const user = userResult.rows[0] ?? null;
  if (user && user.is_active === false) {
    logger.warn(`Login bloqueado: usuario desactivado ***${phone.slice(-4)}`);
    return { valid: false, user: null, error: 'Account disabled / Cuenta desactivada' };
  }
  return { valid: true, user: user ? { id: user.id, phone: user.phone, name: user.name, role: user.role, email: user.email, plan: user.plan } : null };
}

// Cleanup expired OTPs periodically (every 30 min)
let _otpCleanupStarted = false;
export function startOtpCleanup(): void {
  if (_otpCleanupStarted) return;
  _otpCleanupStarted = true;
  setInterval(async () => {
    try {
      const r = await pool.query("DELETE FROM otp_codes WHERE expires_at < NOW() - INTERVAL '1 hour'");
      if ((r.rowCount ?? 0) > 0) logger.info(`OTP cleanup: ${r.rowCount} códigos expirados eliminados`);
    } catch (err) {
      logger.warn('OTP cleanup error:', err);
    }
  }, 30 * 60 * 1000);
}

export async function findOrCreateUser(phone: string, name?: string, role?: string, email?: string): Promise<{ id: string; phone: string; name: string; role: string; email: string | null; plan: string }> {
  // Look up by phone first, then by email if provided
  const existing = await pool.query('SELECT id, phone, name, role, email, COALESCE(plan, \'free\') as plan FROM users WHERE phone = $1', [phone]);
  if (existing.rows[0]) {
    return existing.rows[0];
  }
  if (email) {
    const byEmail = await pool.query('SELECT id, phone, name, role, email, COALESCE(plan, \'free\') as plan FROM users WHERE email = $1', [email]);
    if (byEmail.rows[0]) {
      return byEmail.rows[0];
    }
  }
  // Default to 'citizen' for any path that doesn't supply a role — safe fallback.
  const validRoles = ['driver', 'helper', 'admin', 'citizen', 'fleet_owner'];
  const finalRole = role && validRoles.includes(role) ? role : 'citizen';
  const insert = await pool.query(
    `INSERT INTO users (phone, name, role, email) VALUES ($1, $2, $3, $4)
     RETURNING id, phone, name, role, email, COALESCE(plan, 'free') as plan`,
    [phone, name || phone, finalRole, email || null]
  );
  return insert.rows[0];
}

// Duración de sesión: JWT_EXPIRES_IN (ej. "24h", "8h", "86400"). Por defecto 24h.
function getJwtExpiresInSeconds(): number {
  const raw = process.env.JWT_EXPIRES_IN || '24h';
  if (raw.endsWith('h')) return (parseInt(raw, 10) || 24) * 3600;
  if (raw.endsWith('m')) return (parseInt(raw, 10) || 60) * 60;
  const n = parseInt(raw, 10);
  return !isNaN(n) && n > 0 ? n : 86400;
}

export function signToken(payload: { userId: string; role: string }): string {
  // Every token carries a unique jti claim so it can be revoked server-side
  // (token_blacklist table). Without a jti, logout would require rotating
  // JWT_SECRET which invalidates every session globally.
  return jwt.sign(
    { ...payload, jti: randomUUID() },
    JWT_SECRET,
    { algorithm: 'HS256', expiresIn: getJwtExpiresInSeconds() }
  );
}

export interface DecodedToken {
  userId: string;
  role: string;
  jti?: string;
  exp?: number;
  iat?: number;
}

export function verifyToken(token: string): DecodedToken | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as DecodedToken;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Revoke a decoded token by inserting its jti into token_blacklist. Safe to
 * call multiple times for the same token (idempotent via ON CONFLICT).
 * Tokens without a jti (legacy, pre-migration) cannot be revoked and the
 * caller should handle that case.
 */
export async function revokeToken(decoded: DecodedToken, reason: string = 'logout'): Promise<boolean> {
  if (!decoded?.jti || !decoded?.exp) return false;
  const expiresAt = new Date(decoded.exp * 1000);
  try {
    await pool.query(
      `INSERT INTO token_blacklist (jti, user_id, reason, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (jti) DO NOTHING`,
      [decoded.jti, decoded.userId, reason.slice(0, 32), expiresAt]
    );
    return true;
  } catch (err) {
    logger.warn('revokeToken error:', err);
    return false;
  }
}

/**
 * Returns true if the token has been revoked (jti in blacklist).
 * Legacy tokens without a jti are treated as NOT revocable and the check
 * returns false — caller may choose to reject legacy tokens outright once
 * the grace period is over.
 */
export async function isTokenRevoked(decoded: DecodedToken): Promise<boolean> {
  if (!decoded?.jti) return false;
  try {
    const r = await pool.query(
      `SELECT 1 FROM token_blacklist WHERE jti = $1 AND expires_at > NOW() LIMIT 1`,
      [decoded.jti]
    );
    return (r.rowCount ?? 0) > 0;
  } catch {
    // Table may not exist yet during the migration window — fail open so
    // existing sessions don't break. Once migrated, this is never reached.
    return false;
  }
}

// ── Auth cookie helpers ─────────────────────────────────────────────────────
// We store the JWT in an HttpOnly cookie named `jwt`. This cannot be read
// by JavaScript on the page, neutralising the XSS-token-theft attack.
//
// Architecture note: the frontend (silenteye.mx, *.vercel.app) talks to
// its own /api/* path, which Next.js rewrites server-side to the Fly.io
// backend. From the browser's perspective every request is same-site, so
// the cookie can be SameSite=Lax. We do NOT need SameSite=None.
//
// SameSite=Lax is preferable because it provides automatic CSRF protection
// for state-changing requests from arbitrary cross-site contexts. Combined
// with the Origin/Referer checks Next.js adds to its rewrites, it is a
// strong default.
//
// iOS Safari ITP note: SameSite=Lax + same-site requests are NOT affected
// by ITP. The WebSocket flow could be cross-site (it connects directly to
// fly.dev), but we sidestep that entirely with the ticket system: the
// ticket is fetched via the same-site /api proxy and embedded in the WS
// URL, so the WS upgrade itself never depends on cookies. We still log
// every cookie set/read so we can correlate any "had to log in again"
// reports from iOS users.

export const AUTH_COOKIE_NAME = 'jwt';

export function setAuthCookie(res: Response, token: string): void {
  const isProd = process.env.NODE_ENV === 'production';
  const maxAge = getJwtExpiresInSeconds() * 1000;
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge,
    // Do NOT set domain — let the browser scope to the exact origin so
    // cookies don't leak to *.fly.dev neighbours.
  });
  logger.info(`[auth-cookie] issued sameSite=lax secure=${isProd} maxAgeSec=${maxAge / 1000}`);
}

export function clearAuthCookie(res: Response): void {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
  });
  logger.info('[auth-cookie] cleared');
}

// ── Killswitch: STRICT_COOKIE_AUTH ──────────────────────────────────────────
// When set to "true", the backend REFUSES to read the JWT from the
// Authorization: Bearer header. Only the HttpOnly `jwt` cookie is honoured.
// Use this once you've confirmed the cookie flow is healthy in production.
//
// Rollback procedure (10 seconds):
//   fly secrets unset STRICT_COOKIE_AUTH -a silenteye-3rrwnq
//   # Or: fly secrets set STRICT_COOKIE_AUTH=false -a silenteye-3rrwnq
//
// The legacy header code path is kept intact in this file — the flag only
// gates the read inside extractToken(). This is intentional: a config
// change must be enough to fully revert, no redeploy required.
export function isStrictCookieAuth(): boolean {
  const v = (process.env.STRICT_COOKIE_AUTH || '').toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
}

// ── Killswitch: STRIP_TOKEN_FROM_BODY ───────────────────────────────────────
// Independent of STRICT_COOKIE_AUTH. When "true", login / OTP-verify
// responses no longer include the `token` field in the JSON body. The
// token only ever lives in the HttpOnly cookie, so a script-injection
// attack has nothing to read even at the moment of issuance.
//
// Recommended rollout order:
//   1. Deploy with both flags OFF (compat baseline).
//   2. Enable STRICT_COOKIE_AUTH=true. Watch logs for 24h.
//   3. If clean, enable STRIP_TOKEN_FROM_BODY=true. Watch another 24h.
//   4. Either flag can be flipped back independently with `fly secrets`.
//
// The frontend has been hardened to tolerate a missing body token —
// saveSession() and getSession() both gracefully handle the cookie-only
// case. Existing Bearer fetches become no-ops because their header is
// silently ignored under STRICT_COOKIE_AUTH while the cookie path takes
// over via the global fetch credentials patch.
export function isStripTokenFromBody(): boolean {
  const v = (process.env.STRIP_TOKEN_FROM_BODY || '').toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
}

/**
 * Extract a token from either the HttpOnly cookie (preferred) or the
 * Authorization: Bearer header (legacy fallback during the dual-mode
 * grace period). Returns the raw JWT string or null.
 *
 * When STRICT_COOKIE_AUTH=true is set in the environment, the
 * Authorization: Bearer header is COMPLETELY IGNORED — only the cookie
 * is accepted. This is the production "lockdown" mode.
 */
export function extractToken(req: Request): { token: string | null; source: 'cookie' | 'header' | null } {
  // Prefer the cookie — it's tamper-resistant and not visible to JS.
  const cookieToken = (req as any).cookies?.[AUTH_COOKIE_NAME];
  if (typeof cookieToken === 'string' && cookieToken.length > 0) {
    return { token: cookieToken, source: 'cookie' };
  }
  // Killswitch: in strict mode, never touch the header. The legacy code
  // path stays in source so we can flip the flag back without a redeploy.
  if (isStrictCookieAuth()) {
    return { token: null, source: null };
  }
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    const headerToken = auth.slice(7);
    if (headerToken.length > 0) return { token: headerToken, source: 'header' };
  }
  return { token: null, source: null };
}

// Periodic cleanup of expired blacklist entries
let _blacklistCleanupStarted = false;
export function startBlacklistCleanup(): void {
  if (_blacklistCleanupStarted) return;
  _blacklistCleanupStarted = true;
  setInterval(async () => {
    try {
      await pool.query('SELECT purge_expired_blacklist()');
    } catch {
      /* purge function may not exist yet — ignore */
    }
  }, 60 * 60 * 1000); // hourly
}

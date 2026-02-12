import jwt from 'jsonwebtoken';
import { randomInt } from 'crypto';
import { pool } from '../db/pool.js';
import { logger } from '../utils/logger.js';

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
    'INSERT INTO otp_codes (phone, code, expires_at) VALUES ($1, $2, $3)',
    [phone, code, expiresAt]
  );
  logger.info(`OTP creado para ***${phone.slice(-4)} (expira en ${OTP_EXPIRY_MINUTES} min)`);
  return code;
}

export async function verifyOtp(phone: string, code: string): Promise<{ valid: boolean; user: { id: string; phone: string; name: string; role: string } | null; error?: string }> {
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
      return { valid: false, user: null, error: 'Demasiados intentos. Solicita un nuevo código.' };
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

  const userResult = await pool.query(
    'SELECT id, phone, name, role, is_active FROM users WHERE phone = $1',
    [phone]
  );
  const user = userResult.rows[0] ?? null;
  if (user && user.is_active === false) {
    logger.warn(`Login bloqueado: usuario desactivado ***${phone.slice(-4)}`);
    return { valid: false, user: null, error: 'Cuenta desactivada. Contacta al administrador.' };
  }
  return { valid: true, user: user ? { id: user.id, phone: user.phone, name: user.name, role: user.role } : null };
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

export async function findOrCreateUser(phone: string, name?: string, role?: string): Promise<{ id: string; phone: string; name: string; role: string }> {
  const existing = await pool.query('SELECT id, phone, name, role FROM users WHERE phone = $1', [phone]);
  if (existing.rows[0]) {
    return existing.rows[0];
  }
  const validRoles = ['driver', 'helper', 'admin', 'citizen'];
  const finalRole = role && validRoles.includes(role) ? role : 'driver';
  const insert = await pool.query(
    `INSERT INTO users (phone, name, role) VALUES ($1, $2, $3)
     RETURNING id, phone, name, role`,
    [phone, name || phone, finalRole]
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
  return jwt.sign(payload, JWT_SECRET, { expiresIn: getJwtExpiresInSeconds() });
}

export function verifyToken(token: string): { userId: string; role: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
    return decoded;
  } catch {
    return null;
  }
}

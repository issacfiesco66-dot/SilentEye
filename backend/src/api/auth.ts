import jwt from 'jsonwebtoken';
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

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createOtp(phone: string): Promise<string> {
  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  await pool.query(
    'INSERT INTO otp_codes (phone, code, expires_at) VALUES ($1, $2, $3)',
    [phone, code, expiresAt]
  );
  logger.info(`OTP creado para ${phone} (expira en ${OTP_EXPIRY_MINUTES} min)`);
  return code;
}

export async function verifyOtp(phone: string, code: string): Promise<{ valid: boolean; user: { id: string; phone: string; name: string; role: string } | null }> {
  const result = await pool.query(
    `UPDATE otp_codes SET used = true
     WHERE phone = $1 AND code = $2 AND expires_at > NOW() AND NOT used
     RETURNING id`,
    [phone, code]
  );
  if (result.rowCount === 0) return { valid: false, user: null };

  const userResult = await pool.query(
    'SELECT id, phone, name, role FROM users WHERE phone = $1',
    [phone]
  );
  return { valid: true, user: userResult.rows[0] ?? null };
}

export async function findOrCreateUser(phone: string, name?: string): Promise<{ id: string; phone: string; name: string; role: string }> {
  const existing = await pool.query('SELECT id, phone, name, role FROM users WHERE phone = $1', [phone]);
  if (existing.rows[0]) {
    return existing.rows[0];
  }
  const insert = await pool.query(
    `INSERT INTO users (phone, name, role) VALUES ($1, $2, 'driver')
     RETURNING id, phone, name, role`,
    [phone, name || phone]
  );
  return insert.rows[0];
}

// Duración de sesión: JWT_EXPIRES_IN (ej. 24h, 8h). Por defecto 24h.
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export function signToken(payload: { userId: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): { userId: string; role: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
    return decoded;
  } catch {
    return null;
  }
}

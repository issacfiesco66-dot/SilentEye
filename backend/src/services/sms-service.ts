import twilio from 'twilio';
import { logger } from '../utils/logger.js';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '';

let client: ReturnType<typeof twilio> | null = null;

export function isSmsEnabled(): boolean {
  return !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER);
}

function getClient() {
  if (!client) {
    if (!isSmsEnabled()) {
      throw new Error('Twilio no está configurado. Define TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN y TWILIO_PHONE_NUMBER.');
    }
    client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  }
  return client;
}

/**
 * Send OTP code via SMS (Twilio). Only used for admin users.
 * Phone must include country code (e.g. +525610669353).
 */
export async function sendOtpSms(phone: string, code: string): Promise<boolean> {
  if (!isSmsEnabled()) {
    logger.warn('SMS deshabilitado: Twilio no configurado');
    return false;
  }

  // Ensure phone has + prefix for international format
  const to = phone.startsWith('+') ? phone : `+52${phone}`;

  try {
    const message = await getClient().messages.create({
      body: `SilentEye: Tu código de verificación es ${code}. Válido por 10 minutos.`,
      from: TWILIO_PHONE_NUMBER,
      to,
    });
    logger.info(`SMS OTP enviado a ***${phone.slice(-4)} sid=${message.sid}`);
    return true;
  } catch (err) {
    logger.error(`Error enviando SMS a ***${phone.slice(-4)}:`, err);
    return false;
  }
}

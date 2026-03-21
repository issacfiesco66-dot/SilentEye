import twilio from 'twilio';
import { logger } from '../utils/logger.js';
import { CircuitBreaker } from '../utils/circuit-breaker.js';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '';

let client: ReturnType<typeof twilio> | null = null;

const smsCircuitBreaker = new CircuitBreaker('twilio-sms', 3, 60_000);

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
 * Protected by CircuitBreaker: 3 failures → 60s cooldown.
 */
export async function sendOtpSms(phone: string, code: string): Promise<boolean> {
  if (!isSmsEnabled()) {
    logger.warn('SMS deshabilitado: Twilio no configurado');
    return false;
  }

  // Ensure phone has + prefix for international format
  const to = phone.startsWith('+') ? phone : `+52${phone}`;

  return smsCircuitBreaker.tryExecute(async () => {
    const message = await getClient().messages.create({
      body: `SilentEye: Tu código de verificación es ${code}. Válido por 10 minutos.`,
      from: TWILIO_PHONE_NUMBER,
      to,
    });
    logger.info(`SMS OTP enviado a ***${phone.slice(-4)} sid=${message.sid}`);
    return true;
  }, false);
}

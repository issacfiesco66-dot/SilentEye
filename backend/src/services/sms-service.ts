import twilio from 'twilio';
import { logger } from '../utils/logger.js';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '';

let client: twilio.Twilio | null = null;

if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER) {
  client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  logger.info(`Twilio SMS configurado desde ${TWILIO_PHONE_NUMBER}`);
} else {
  logger.warn('Twilio no configurado — SMS deshabilitado');
}

export function isSmsEnabled(): boolean {
  return client !== null;
}

/**
 * Send an SMS message via Twilio.
 * Returns true if sent successfully, false otherwise.
 */
export async function sendSms(to: string, body: string): Promise<boolean> {
  if (!client) {
    logger.warn(`SMS no enviado (Twilio no configurado): to=${to.slice(-4)}`);
    return false;
  }

  try {
    const message = await client.messages.create({
      body,
      from: TWILIO_PHONE_NUMBER,
      to,
    });
    logger.info(`SMS enviado: sid=${message.sid} to=***${to.slice(-4)} status=${message.status}`);
    return true;
  } catch (err: any) {
    logger.error(`SMS error: to=***${to.slice(-4)} code=${err.code} message=${err.message}`);
    return false;
  }
}

/**
 * Send OTP code via SMS to a phone number.
 */
export async function sendOtpSms(phone: string, code: string): Promise<boolean> {
  const body = `SilentEye: Tu código de verificación es ${code}. Válido por 10 minutos. No compartas este código.`;
  return sendSms(phone, body);
}

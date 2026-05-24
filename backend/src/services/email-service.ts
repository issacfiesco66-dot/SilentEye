import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';

export function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;

let transporter: nodemailer.Transporter | null = null;

if (SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
  logger.info(`Email SMTP configurado: ${SMTP_HOST}:${SMTP_PORT} from=${SMTP_FROM}`);
} else {
  logger.warn('Email SMTP no configurado — verificación por email deshabilitada');
}

export function isEmailEnabled(): boolean {
  return transporter !== null;
}

/**
 * Send an email via SMTP.
 * Returns true if sent successfully, false otherwise.
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!transporter) {
    logger.warn(`Email no enviado (SMTP no configurado): to=${to}`);
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: `"SilentEye" <${SMTP_FROM}>`,
      to,
      subject,
      html,
    });
    logger.info(`Email enviado: messageId=${info.messageId} to=${to}`);
    return true;
  } catch (err: any) {
    logger.error(`Email error: to=${to} message=${err.message}`);
    return false;
  }
}

/**
 * Notify citizen that a helper is responding to their incident.
 */
export async function sendHelperRespondingEmail(
  citizenEmail: string,
  helperName: string,
  incidentId: string
): Promise<boolean> {
  const subject = 'SilentEye — Un helper va en camino';
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 450px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="font-size: 20px; font-weight: 700; color: #18181b; margin: 0;">SilentEye</h1>
      </div>
      <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 20px;">
        <p style="font-size: 16px; font-weight: 600; color: #065f46; margin: 0 0 8px;">Ayuda en camino</p>
        <p style="font-size: 14px; color: #047857; margin: 0;"><strong>${escapeHtml(helperName)}</strong> está respondiendo a tu alerta.</p>
      </div>
      <p style="font-size: 13px; color: #71717a; text-align: center; margin: 0;">
        Mantén la calma. Recibirás más actualizaciones por correo.<br/>
        Incidente: <code>${incidentId.slice(0, 8)}</code>
      </p>
    </div>
  `;
  return sendEmail(citizenEmail, subject, html);
}

/**
 * Notify citizen that their incident has been resolved.
 */
export async function sendIncidentResolvedEmail(
  citizenEmail: string,
  incidentId: string
): Promise<boolean> {
  const subject = 'SilentEye — Incidente resuelto';
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 450px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="font-size: 20px; font-weight: 700; color: #18181b; margin: 0;">SilentEye</h1>
      </div>
      <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 20px;">
        <p style="font-size: 16px; font-weight: 600; color: #166534; margin: 0 0 8px;">Incidente resuelto</p>
        <p style="font-size: 14px; color: #15803d; margin: 0;">Tu alerta ha sido atendida y cerrada.</p>
      </div>
      <p style="font-size: 13px; color: #71717a; text-align: center; margin: 0;">
        Gracias por usar SilentEye. Tu seguridad es nuestra prioridad.<br/>
        Incidente: <code>${incidentId.slice(0, 8)}</code>
      </p>
    </div>
  `;
  return sendEmail(citizenEmail, subject, html);
}

/**
 * Send witness request email to a helper/responder.
 */
export async function sendWitnessRequestEmail(
  responderEmail: string,
  responderName: string,
  incidentId: string,
  acceptUrl: string,
  declineUrl: string
): Promise<boolean> {
  const subject = 'SilentEye — Solicitud de testigo voluntario';
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 450px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="font-size: 20px; font-weight: 700; color: #18181b; margin: 0;">SilentEye</h1>
      </div>
      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
        <p style="font-size: 15px; font-weight: 600; color: #1e40af; margin: 0 0 12px; text-align: center;">Solicitud de testigo</p>
        <p style="font-size: 14px; color: #1e3a5f; margin: 0 0 16px;">
          Hola <strong>${escapeHtml(responderName)}</strong>,<br/><br/>
          Participaste en la atención del incidente <code>${incidentId.slice(0, 8)}</code>.
          El administrador ha solicitado voluntarios como testigos en caso de que se requiera una declaración futura.
        </p>
        <p style="font-size: 13px; color: #64748b; margin: 0 0 16px;">
          <strong>Esto es completamente voluntario.</strong> No tienes obligación de aceptar.
        </p>
        <div style="text-align: center;">
          <a href="${acceptUrl}" style="display: inline-block; padding: 10px 24px; background: #16a34a; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin-right: 8px;">Acepto ser testigo</a>
          <a href="${declineUrl}" style="display: inline-block; padding: 10px 24px; background: #e5e7eb; color: #374151; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">No, gracias</a>
        </div>
      </div>
      <p style="font-size: 12px; color: #a1a1aa; text-align: center; margin: 0;">
        Si no reconoces este incidente, ignora este correo.
      </p>
    </div>
  `;
  return sendEmail(responderEmail, subject, html);
}

export async function sendOtpEmail(email: string, code: string): Promise<boolean> {
  const subject = 'SilentEye — Código de verificación';
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 400px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="font-size: 20px; font-weight: 700; color: #18181b; margin: 0;">SilentEye</h1>
        <p style="font-size: 13px; color: #a1a1aa; margin: 4px 0 0;">Seguridad ciudadana en tiempo real</p>
      </div>
      <div style="background: #f4f4f5; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 20px;">
        <p style="font-size: 14px; color: #52525b; margin: 0 0 12px;">Tu código de verificación es:</p>
        <div style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #18181b; font-family: monospace;">${code}</div>
      </div>
      <p style="font-size: 13px; color: #71717a; text-align: center; margin: 0;">
        Este código es válido por <strong>10 minutos</strong>.<br/>
        Si no solicitaste este código, ignora este correo.
      </p>
    </div>
  `;
  return sendEmail(email, subject, html);
}

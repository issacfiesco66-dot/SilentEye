import webpush from 'web-push';
import { pool } from '../db/pool.js';
import { logger } from '../utils/logger.js';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@silenteye.app';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  logger.info('Web Push configurado con VAPID keys');
} else {
  logger.warn('VAPID keys no configuradas — push notifications deshabilitadas');
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

export async function saveSubscription(userId: string, subscription: { endpoint: string; keys: { p256dh: string; auth: string } }): Promise<void> {
  await pool.query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (endpoint) DO UPDATE SET user_id = $1, p256dh = $3, auth = $4`,
    [userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]
  );
  logger.info(`Push subscription guardada para userId=${userId}`);
}

export async function removeSubscription(endpoint: string): Promise<void> {
  await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
}

export async function removeUserSubscriptions(userId: string): Promise<void> {
  await pool.query('DELETE FROM push_subscriptions WHERE user_id = $1', [userId]);
}

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

/**
 * Send push notification to specific users (admins + nearby users).
 * If userIds is empty, sends to ALL subscriptions (fallback for admins).
 */
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<number> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return 0;

  let result;
  if (userIds.length === 0) {
    // Send to all admin subscriptions
    result = await pool.query(
      `SELECT ps.id, ps.endpoint, ps.p256dh, ps.auth
       FROM push_subscriptions ps
       JOIN users u ON u.id = ps.user_id
       WHERE u.role = 'admin'`
    );
  } else {
    // Send to specific users + all admins
    result = await pool.query(
      `SELECT DISTINCT ps.id, ps.endpoint, ps.p256dh, ps.auth
       FROM push_subscriptions ps
       JOIN users u ON u.id = ps.user_id
       WHERE u.role = 'admin' OR ps.user_id = ANY($1::uuid[])`,
      [userIds]
    );
  }

  const subscriptions = result.rows;
  if (subscriptions.length === 0) return 0;

  const jsonPayload = JSON.stringify(payload);
  let sent = 0;
  const staleIds: string[] = [];

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          jsonPayload,
          { TTL: 60 * 5 } // 5 min TTL
        );
        sent++;
      } catch (err: any) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          // Subscription expired or unsubscribed
          staleIds.push(sub.id);
        } else {
          logger.warn(`Push send error endpoint=${sub.endpoint.slice(0, 60)}… status=${err.statusCode}`, err.body || '');
        }
      }
    })
  );

  // Cleanup stale subscriptions
  if (staleIds.length > 0) {
    await pool.query('DELETE FROM push_subscriptions WHERE id = ANY($1::uuid[])', [staleIds]);
    logger.info(`Push: ${staleIds.length} subscripciones expiradas eliminadas`);
  }

  logger.info(`Push enviado: ${sent}/${subscriptions.length} exitosos`);
  return sent;
}

/**
 * SilentEye — Plataforma de Seguridad Vehicular
 * Copyright (c) 2026 Christian Fiesco. All rights reserved.
 * PROPRIETARY AND CONFIDENTIAL — See LICENSE file for details.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import type { Server as HttpServer } from 'http';
import { WebSocketServer, type WebSocket as WsSocket } from 'ws';
import { pool } from '../db/pool.js';
import { hasPostGis } from '../db/postgis-check.js';
import { verifyToken } from '../api/auth.js';
import { consumeTicket } from './ws-ticket-store.js';
import { logger } from '../utils/logger.js';

// Throttle DB writes per user (relay every WS msg, but save to DB less often)
const lastDbWrite = new Map<string, number>();
const DB_WRITE_THROTTLE_MS = 10_000; // save to DB every 10s max per user

// Rate-limit inbound WS messages per user (prevent spam)
const lastWsMsg = new Map<string, number>();
const WS_MSG_THROTTLE_MS = 2_000; // min 2s between location_update messages per user

async function resolveUserMeta(userId: string): Promise<{ role: string; vehicleId?: string } | null> {
  const r = await pool.query(
    `SELECT u.role, v.id as vehicle_id FROM users u
     LEFT JOIN vehicles v ON v.driver_id = u.id
     WHERE u.id = $1 LIMIT 1`,
    [userId]
  );
  const row = r.rows[0];
  if (!row) return null;
  return {
    role: row.role,
    vehicleId: row.vehicle_id ?? undefined,
  };
}

export interface LocationUpdate {
  imei: string;
  vehicleId?: string;
  latitude: number;
  longitude: number;
  speed: number;
  timestamp: number;
  plate?: string;
}

export interface PanicEvent {
  incidentId: string;
  imei: string;
  vehicleId?: string;
  plate?: string;
  latitude: number;
  longitude: number;
  timestamp: number;
  nearbyCount: number;
  source?: string;
  activateCamera?: boolean;
}

export interface AlertEvent {
  id: string;
  deviceImei: string;
  timestamp: number;
  alertType: string;
  latitude: number;
  longitude: number;
  speed: number;
  rawEventId: number;
  priority: number;
  rawIO: Record<string, number | bigint>;
  vehicleId?: string;
  plate?: string;
  createdAt: string;
}

type MessageType = 'location' | 'panic' | 'incident_update' | 'alert' | 'prospect_viewing' | 'camera_activation';

interface WSMessage {
  type: MessageType;
  payload: LocationUpdate | PanicEvent | AlertEvent | unknown;
}

const clients = new Map<WsSocket, { userId?: string; role?: string; vehicleId?: string; ip?: string }>();

// ── WebSocket upgrade rate limiter ───────────────────────────────────
// The existing MAX_WS_PER_IP check only covers ALREADY-ESTABLISHED
// connections. An attacker can still burn CPU by opening+closing
// sockets in a tight loop — each upgrade costs a handshake, a ticket
// lookup, and a DB query before we reject. This rate-limit tracks
// upgrade ATTEMPTS per IP in a 10-second sliding window and rejects
// further attempts when an IP crosses the threshold.
const UPGRADE_RATE_LIMIT_WINDOW_MS = 10_000;
const UPGRADE_RATE_LIMIT_MAX = 20;   // 20 upgrades per 10s per IP = 2/s
const upgradeAttempts = new Map<string, number[]>();
function checkUpgradeRateLimit(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - UPGRADE_RATE_LIMIT_WINDOW_MS;
  const attempts = upgradeAttempts.get(ip) || [];
  // Drop stale attempts outside the window
  const recent = attempts.filter((t) => t > cutoff);
  if (recent.length >= UPGRADE_RATE_LIMIT_MAX) {
    upgradeAttempts.set(ip, recent); // keep what we kept
    return false;
  }
  recent.push(now);
  upgradeAttempts.set(ip, recent);
  return true;
}
// GC stale IP entries every minute so the Map doesn't grow forever.
setInterval(() => {
  const cutoff = Date.now() - UPGRADE_RATE_LIMIT_WINDOW_MS;
  for (const [ip, attempts] of upgradeAttempts) {
    const kept = attempts.filter((t) => t > cutoff);
    if (kept.length === 0) upgradeAttempts.delete(ip);
    else upgradeAttempts.set(ip, kept);
  }
}, 60_000).unref();

const VALID_ROLES = ['admin', 'helper', 'driver', 'citizen'];
const MAX_WS_PER_IP = 10;
const MAX_WS_PER_USER = 5;

// Timeout for auth handshake: client must send {type:"auth",token:"..."} within 5s
const AUTH_TIMEOUT_MS = 5000;

export function createWebSocketServer(portOrServer: number | HttpServer): WebSocketServer {
  const wss = typeof portOrServer === 'number'
    ? new WebSocketServer({ port: portOrServer, host: '0.0.0.0', maxPayload: 64 * 1024 })
    : new WebSocketServer({ server: portOrServer, path: '/ws', maxPayload: 64 * 1024 });

  wss.on('connection', async (ws, req) => {
    // Extract client IP for rate limiting. Prefer Cloudflare header
    // (fly.io sits behind CF in production) over X-Forwarded-For so
    // the limiter is keyed on the real client even if an upstream
    // proxy sets additional XFF hops.
    const cfIp = req.headers['cf-connecting-ip'];
    const forwarded = req.headers['x-forwarded-for'];
    const clientIp =
      (typeof cfIp === 'string' && cfIp) ||
      (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : null) ||
      req.socket?.remoteAddress ||
      'unknown';

    // Upgrade-rate-limit: reject before we spend any CPU on ticket
    // lookups or DB queries. A bot that hits this wall gets a fast
    // 4429 close and no further processing.
    if (!checkUpgradeRateLimit(clientIp)) {
      logger.warn(`WebSocket: IP ${clientIp} excede upgrade rate (${UPGRADE_RATE_LIMIT_MAX}/${UPGRADE_RATE_LIMIT_WINDOW_MS / 1000}s)`);
      ws.close(4429, 'Upgrade rate exceeded');
      return;
    }

    // Per-IP connection limit (prevent DoS via long-lived connections)
    const ipCount = [...clients.values()].filter(m => m.ip === clientIp).length;
    if (ipCount >= MAX_WS_PER_IP) {
      logger.warn(`WebSocket: IP ${clientIp} excede límite (${MAX_WS_PER_IP} conexiones)`);
      ws.close(4429, 'Too many connections');
      return;
    }

    // ── Ticket-based authentication (preferred path) ────────────────────
    // The client opens wss://.../ws?ticket=<uuid>. The ticket was obtained
    // via POST /api/auth/ws-ticket which is itself authenticated by the
    // HttpOnly cookie. A ticket is single-use and lives 30s.
    let ticketAuth: { userId: string; role: string } | null = null;
    try {
      const url = req.url ?? '';
      // Use a placeholder host so URL() can parse a path-only string.
      const parsed = new URL(url, 'http://x.invalid');
      const ticket = parsed.searchParams.get('ticket');
      if (ticket) {
        const consumed = consumeTicket(ticket);
        if (consumed) {
          ticketAuth = { userId: consumed.userId, role: consumed.role };
          logger.info(`[ws] ticket-auth ok userId=${consumed.userId} ip=${clientIp}`);
        } else {
          logger.warn(`[ws] ticket-auth FAILED ip=${clientIp} (consumed/expired/invalid)`);
          ws.close(4001, 'Invalid or expired ticket');
          return;
        }
      }
    } catch (err) {
      logger.warn(`[ws] failed to parse upgrade url: ${err}`);
    }

    // If we authenticated via ticket, finish the handshake immediately —
    // skip the legacy {type:"auth"} message flow entirely.
    if (ticketAuth) {
      const userCount = [...clients.values()].filter(m => m.userId === ticketAuth!.userId).length;
      if (userCount >= MAX_WS_PER_USER) {
        logger.warn(`WebSocket: usuario ${ticketAuth.userId} excede límite (${MAX_WS_PER_USER} conexiones)`);
        ws.close(4429, 'Too many connections for user');
        return;
      }
      const meta = await resolveUserMeta(ticketAuth.userId);
      if (!meta || !VALID_ROLES.includes(meta.role)) {
        // Common after JWT_SECRET rotation: the cookie still passes
        // signature verification (was signed with the new secret) but
        // the userId inside it was created in a previous session whose
        // user row was deleted or never committed. Tell the client to
        // re-login instead of silently closing.
        logger.warn(`WebSocket: usuario no encontrado o rol inválido: ${ticketAuth.userId} (stale session — client should re-login)`);
        try {
          ws.send(JSON.stringify({ type: 'auth_error', code: 'USER_NOT_FOUND', message: 'Sesión inválida — cierra sesión y vuelve a entrar' }));
        } catch { /* ignore send errors on closing socket */ }
        ws.close(4003, 'Usuario no autorizado');
        return;
      }
      clients.set(ws as WsSocket, {
        userId: ticketAuth.userId,
        role: meta.role,
        vehicleId: meta.vehicleId,
        ip: clientIp,
      });
      ws.send(JSON.stringify({ type: 'auth_ok' }));
      logger.info(`WebSocket: cliente autenticado por ticket userId=${ticketAuth.userId} role=${meta.role}`);
      ws.on('message', (data) => {
        handleClientMessage(ws as WsSocket, data);
      });
      ws.on('close', () => { clients.delete(ws as WsSocket); });
      ws.on('error', () => { clients.delete(ws as WsSocket); });
      return;
    }

    // ── Legacy fallback: {type:"auth", token:"..."} message ────────────
    // Kept during the migration window so older clients (and any that
    // still have a localStorage token) keep working. To be removed once
    // the cookie+ticket flow is fully rolled out.
    // Auth timeout: close unauthenticated connections after AUTH_TIMEOUT_MS
    const authTimeout = setTimeout(() => {
      if (!clients.has(ws as WsSocket)) {
        logger.warn('WebSocket: conexión cerrada por timeout de autenticación');
        ws.close(4001, 'Auth timeout');
      }
    }, AUTH_TIMEOUT_MS);

    // First message must be {type:"auth", token:"..."} — all others are rejected until authed
    const onFirstMessage = async (raw: unknown) => {
      clearTimeout(authTimeout);

      let msg: { type?: string; token?: string };
      try {
        msg = JSON.parse(typeof raw === 'string' ? raw : String(raw));
      } catch {
        ws.close(4001, 'Mensaje de auth inválido');
        return;
      }

      if (msg.type !== 'auth' || !msg.token) {
        ws.close(4001, 'Se requiere mensaje {type:"auth", token:"..."}');
        return;
      }

      const payload = verifyToken(msg.token);
      if (!payload) {
        logger.warn('WebSocket: conexión rechazada (JWT inválido o expirado)');
        ws.close(4002, 'Token inválido');
        return;
      }

      // Per-user connection limit (prevent session abuse)
      const userCount = [...clients.values()].filter(m => m.userId === payload.userId).length;
      if (userCount >= MAX_WS_PER_USER) {
        logger.warn(`WebSocket: usuario ${payload.userId} excede límite (${MAX_WS_PER_USER} conexiones)`);
        ws.close(4429, 'Too many connections for user');
        return;
      }

      const meta = await resolveUserMeta(payload.userId);
      if (!meta || !VALID_ROLES.includes(meta.role)) {
        logger.warn(`WebSocket: usuario no encontrado o rol inválido: ${payload.userId}`);
        ws.close(4003, 'Usuario no autorizado');
        return;
      }

      // Metadatos SIEMPRE del servidor; ignoramos cualquier dato enviado por el cliente
      clients.set(ws as WsSocket, {
        userId: payload.userId,
        role: meta.role,
        vehicleId: meta.vehicleId,
        ip: clientIp,
      });

      ws.send(JSON.stringify({ type: 'auth_ok' }));
      logger.info(`WebSocket: cliente autenticado por mensaje (legacy) userId=${payload.userId} role=${meta.role}`);

      // Switch to normal message handler
      ws.on('message', (data) => {
        handleClientMessage(ws as WsSocket, data);
      });
    };

    ws.once('message', onFirstMessage);

    ws.on('close', () => {
      clearTimeout(authTimeout);
      clients.delete(ws as WsSocket);
    });

    ws.on('error', () => {
      clearTimeout(authTimeout);
      clients.delete(ws as WsSocket);
    });
  });

  logger.info(typeof portOrServer === 'number'
    ? `WebSocket escuchando en puerto ${portOrServer}`
    : 'WebSocket escuchando en path /ws');
  return wss;
}

function broadcast(msg: WSMessage, filter?: (meta: { userId?: string; role?: string; vehicleId?: string }) => boolean) {
  const payload = JSON.stringify(msg);
  for (const [ws, meta] of clients) {
    if (ws.readyState === 1) {
      if (!filter || filter(meta)) {
        ws.send(payload);
      }
    }
  }
}

export function broadcastLocation(update: LocationUpdate, incidentFollowerIds?: string[]) {
  broadcast(
    { type: 'location', payload: update },
    (meta) =>
      meta.role === 'admin' ||
      (update.vehicleId != null && meta.vehicleId === update.vehicleId) ||
      (incidentFollowerIds != null && incidentFollowerIds.length > 0 && incidentFollowerIds.includes(meta.userId ?? ''))
  );
}

// Panic coord mode — controls whether non-admin helpers see the
// victim's exact location or an approximation.
//
//   exact   (default, legacy) — every nearby user sees the raw lat/lng.
//           Matches pre-audit behavior. Preserves UX for helpers who
//           need to navigate to the victim.
//
//   approx  — nearby helpers/drivers/citizens see lat/lng truncated to
//           3 decimal places (~111 m). Enough to get to the right
//           block without pinpointing a home address. Admins continue
//           to see exact coords.
//
// Flip with: fly secrets set PANIC_COORD_MODE=approx -a silenteye-3rrwnq
// Revert with: fly secrets set PANIC_COORD_MODE=exact -a silenteye-3rrwnq
//
// SECURITY NOTE: the real fix for "malicious helper tracks victim"
// would be a verified-helper trust tier — but that requires a product
// decision about what "verified" means and a DB migration. This
// feature flag is the minimal-risk interim that lets operators opt
// into a safer default immediately, without touching UX of trusted
// responders who already know how to handle panic alerts.
type PanicCoordMode = 'exact' | 'approx';
function getPanicCoordMode(): PanicCoordMode {
  const raw = (process.env.PANIC_COORD_MODE || 'exact').toLowerCase();
  return raw === 'approx' ? 'approx' : 'exact';
}

/** Round lat/lng to ~111 m precision. 3 decimal places of a degree. */
function approximateCoords<T extends { latitude: number; longitude: number }>(e: T): T {
  return {
    ...e,
    latitude: Math.round(e.latitude * 1000) / 1000,
    longitude: Math.round(e.longitude * 1000) / 1000,
  };
}

export function broadcastPanic(event: PanicEvent, nearbyUserIds?: string[]) {
  // Security: panic events (with exact coordinates) are restricted.
  // - admin: always sees all panics with exact coords (operational need)
  // - helper / driver / citizen: ONLY if their user id is in
  //   nearbyUserIds, AND the coord precision depends on PANIC_COORD_MODE.
  // The activateCamera flag is intentionally stripped here — camera
  // activation is delivered separately via sendCameraActivation() to
  // the specific driver/owner of the vehicle that triggered the panic.
  const mode = getPanicCoordMode();
  const exactEvent: PanicEvent = { ...event, activateCamera: false };
  const nearby = new Set(nearbyUserIds ?? []);
  const isNearbyNonAdmin = (meta: { userId?: string; role?: string }) =>
    (meta.role === 'helper' || meta.role === 'driver' || meta.role === 'citizen')
    && nearby.has(meta.userId ?? '');

  if (mode === 'exact') {
    // Legacy path: single broadcast, everyone nearby sees exact coords.
    const filter = (meta: { userId?: string; role?: string; vehicleId?: string }) =>
      meta.role === 'admin' || isNearbyNonAdmin(meta);
    const recipientCount = [...clients.values()].filter(filter).length;
    logger.info(`broadcastPanic[exact] incident=${event.incidentId} plate=${event.plate} → ${recipientCount} clientes`);
    broadcast({ type: 'panic', payload: exactEvent }, filter);
    return;
  }

  // Approx path: two broadcasts with different payloads.
  // 1) admins get exact; 2) nearby non-admins get rounded coords.
  const approxEvent: PanicEvent = approximateCoords(exactEvent);
  const adminFilter = (meta: { role?: string }) => meta.role === 'admin';
  const nearbyFilter = (meta: { userId?: string; role?: string }) => isNearbyNonAdmin(meta);
  const adminCount = [...clients.values()].filter(adminFilter).length;
  const nearbyCount = [...clients.values()].filter(nearbyFilter).length;
  logger.info(`broadcastPanic[approx] incident=${event.incidentId} plate=${event.plate} → admin=${adminCount} nearbyApprox=${nearbyCount}`);
  broadcast({ type: 'panic', payload: exactEvent }, adminFilter);
  broadcast({ type: 'panic', payload: approxEvent }, nearbyFilter);
}

/**
 * Deliver a camera-activation command ONLY to the specific user ids given
 * (typically the driver and fleet owner of the vehicle that triggered a
 * panic). Never broadcast to helpers / bystanders.
 */
export function sendCameraActivation(
  userIds: string[],
  payload: { incidentId: string; plate?: string; latitude: number; longitude: number; source: string }
) {
  if (!userIds || userIds.length === 0) return;
  const targets = new Set(userIds.filter(Boolean));
  if (targets.size === 0) return;
  const filter = (meta: { userId?: string }) => targets.has(meta.userId ?? '');
  const count = [...clients.values()].filter(filter).length;
  logger.info(`sendCameraActivation incident=${payload.incidentId} targets=${targets.size} delivered=${count}`);
  broadcast({ type: 'camera_activation', payload }, filter);
}

export function broadcastAlert(event: AlertEvent, nearbyUserIds?: string[]) {
  const filter = (meta: { userId?: string; role?: string }) =>
    meta.role === 'admin' ||
    (nearbyUserIds != null && nearbyUserIds.length > 0 && nearbyUserIds.includes(meta.userId ?? ''));
  const recipientCount = [...clients.values()].filter(filter).length;
  logger.info(`broadcastAlert type=${event.alertType} imei=${event.deviceImei} → ${recipientCount} clientes`);
  broadcast(
    { type: 'alert', payload: event },
    filter
  );
}

export function broadcastIncidentUpdate(incident: { id: string; status: string; updatedBy?: string; updatedByName?: string }, followerIds: string[]) {
  const filter = (meta: { userId?: string; role?: string }) =>
    meta.role === 'admin' ||
    meta.role === 'helper' ||
    meta.role === 'driver' ||
    followerIds.includes(meta.userId ?? '');
  const recipientCount = [...clients.values()].filter(filter).length;
  logger.info(`broadcastIncidentUpdate id=${incident.id} status=${incident.status} → ${recipientCount} clientes`);
  broadcast({ type: 'incident_update', payload: incident }, filter);
}

export function broadcastToAdmins(type: MessageType, payload: unknown) {
  broadcast({ type, payload }, (meta) => meta.role === 'admin');
}

// ── Handle inbound location_update from clients ──
async function handleClientMessage(ws: WsSocket, raw: unknown): Promise<void> {
  const meta = clients.get(ws);
  if (!meta?.userId) return;

  let msg: { type?: string; latitude?: number; longitude?: number; speed?: number };
  try {
    msg = JSON.parse(typeof raw === 'string' ? raw : String(raw));
  } catch {
    return; // malformed
  }

  if (msg.type !== 'location_update') return;
  const { latitude, longitude, speed } = msg;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return;

  const userId = meta.userId;

  // Rate-limit: ignore if too frequent
  const lastMsg = lastWsMsg.get(userId) ?? 0;
  if (Date.now() - lastMsg < WS_MSG_THROTTLE_MS) return;
  lastWsMsg.set(userId, Date.now());
  const vehicleId = meta.vehicleId;
  const imei = vehicleId ? undefined : `mobile-${userId}`;

  // Resolve plate/name for broadcast
  let plate: string | undefined;
  let resolvedImei: string | undefined = imei;
  try {
    if (vehicleId) {
      const vr = await pool.query('SELECT imei, plate FROM vehicles WHERE id = $1', [vehicleId]);
      if (vr.rows[0]) {
        resolvedImei = vr.rows[0].imei;
        plate = vr.rows[0].plate;
      }
    } else {
      const ur = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
      plate = ur.rows[0]?.name || 'SOS Móvil';
    }
  } catch { /* non-fatal */ }

  // Find followers of active incidents involving this user
  let followerIds: string[] = [];
  try {
    const fRes = await pool.query(
      `SELECT DISTINCT f.user_id FROM incident_followers f
       JOIN incidents i ON i.id = f.incident_id
       WHERE (i.driver_id = $1 OR f.user_id = $1) AND i.status IN ('active', 'attending', 'localizado')`,
      [userId]
    );
    followerIds = fRes.rows.map((r: { user_id: string }) => r.user_id);

    // Also include incident creators so helpers' movement is visible to them
    const cRes = await pool.query(
      `SELECT DISTINCT i.driver_id FROM incidents i
       JOIN incident_followers f ON f.incident_id = i.id
       WHERE f.user_id = $1 AND i.status IN ('active', 'attending', 'localizado') AND i.driver_id IS NOT NULL`,
      [userId]
    );
    for (const row of cRes.rows) {
      if (row.driver_id && !followerIds.includes(row.driver_id)) {
        followerIds.push(row.driver_id);
      }
    }
  } catch { /* non-fatal */ }

  // Broadcast via WS immediately (real-time)
  broadcastLocation(
    {
      imei: resolvedImei || `mobile-${userId}`,
      vehicleId,
      latitude,
      longitude,
      speed: speed ?? 0,
      timestamp: Date.now(),
      plate,
    },
    followerIds
  );

  // Throttled DB write (don't hammer DB every 3s)
  const lastWrite = lastDbWrite.get(userId) ?? 0;
  if (Date.now() - lastWrite > DB_WRITE_THROTTLE_MS) {
    lastDbWrite.set(userId, Date.now());
    try {
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
    } catch (err) {
      logger.warn('WS location DB write error:', err);
    }
  }
}

export function getWebSocketClientCount(): { total: number; byRole: Record<string, number> } {
  const byRole: Record<string, number> = {};
  let total = 0;
  for (const [ws, meta] of clients) {
    if (ws.readyState === 1) {
      total++;
      const role = meta.role || 'unknown';
      byRole[role] = (byRole[role] || 0) + 1;
    }
  }
  return { total, byRole };
}

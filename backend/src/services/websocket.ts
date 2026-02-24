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
import { logger } from '../utils/logger.js';

// Throttle DB writes per user (relay every WS msg, but save to DB less often)
const lastDbWrite = new Map<string, number>();
const DB_WRITE_THROTTLE_MS = 10_000; // save to DB every 10s max per user

// Seguridad: JWT obligatorio en handshake. Rol y vehicleId provienen SIEMPRE del servidor.
function parseTokenFromRequest(req: { url?: string }): string | null {
  const url = req.url || '';
  const i = url.indexOf('?');
  if (i === -1) return null;
  const params = new URLSearchParams(url.slice(i));
  return params.get('token');
}

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

type MessageType = 'location' | 'panic' | 'incident_update' | 'alert';

interface WSMessage {
  type: MessageType;
  payload: LocationUpdate | PanicEvent | AlertEvent | unknown;
}

const clients = new Map<WsSocket, { userId?: string; role?: string; vehicleId?: string; ip?: string }>();

const VALID_ROLES = ['admin', 'helper', 'driver', 'citizen'];
const MAX_WS_PER_IP = 10;
const MAX_WS_PER_USER = 5;

export function createWebSocketServer(portOrServer: number | HttpServer): WebSocketServer {
  const wss = typeof portOrServer === 'number'
    ? new WebSocketServer({ port: portOrServer, host: '0.0.0.0' })
    : new WebSocketServer({ server: portOrServer, path: '/ws' });

  wss.on('connection', async (ws, req) => {
    // Extract client IP for rate limiting
    const forwarded = req.headers['x-forwarded-for'];
    const clientIp = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket?.remoteAddress || 'unknown';

    // Per-IP connection limit (prevent DoS)
    const ipCount = [...clients.values()].filter(m => m.ip === clientIp).length;
    if (ipCount >= MAX_WS_PER_IP) {
      logger.warn(`WebSocket: IP ${clientIp} excede límite (${MAX_WS_PER_IP} conexiones)`);
      ws.close(4429, 'Too many connections');
      return;
    }

    const token = parseTokenFromRequest(req);
    if (!token) {
      logger.warn('WebSocket: conexión rechazada (sin token)');
      ws.close(4001, 'Token requerido');
      return;
    }

    const payload = verifyToken(token);
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

    ws.on('message', (raw) => {
      handleClientMessage(ws as WsSocket, raw);
    });

    ws.on('close', () => {
      clients.delete(ws as WsSocket);
    });

    ws.on('error', () => {
      clients.delete(ws as WsSocket);
    });

    logger.info(`WebSocket: cliente autenticado userId=${payload.userId} role=${meta.role}`);
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

export function broadcastPanic(event: PanicEvent, nearbyUserIds?: string[]) {
  const filter = (meta: { userId?: string; role?: string; vehicleId?: string }) =>
    meta.role === 'admin' ||
    meta.role === 'helper' ||
    meta.role === 'driver' ||
    meta.role === 'citizen' ||
    (nearbyUserIds ?? []).includes(meta.userId ?? '');
  const recipientCount = [...clients.values()].filter(filter).length;
  logger.info(`broadcastPanic incident=${event.incidentId} plate=${event.plate} → ${recipientCount} clientes`);
  broadcast({ type: 'panic', payload: event }, filter);
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

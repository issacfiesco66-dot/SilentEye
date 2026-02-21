/**
 * SilentEye — Plataforma de Seguridad Vehicular
 * Copyright (c) 2026 Christian Fiesco. All rights reserved.
 * PROPRIETARY AND CONFIDENTIAL — See LICENSE file for details.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import type { Server as HttpServer } from 'http';
import { WebSocketServer, type WebSocket as WsSocket } from 'ws';
import { pool } from '../db/pool.js';
import { verifyToken } from '../api/auth.js';
import { logger } from '../utils/logger.js';

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

    ws.on('message', () => {
      // Ignorar mensajes del cliente (userId/role/vehicleId no se confían)
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
      meta.vehicleId === update.vehicleId ||
      (incidentFollowerIds != null && incidentFollowerIds.length > 0 && incidentFollowerIds.includes(meta.userId ?? ''))
  );
}

export function broadcastPanic(event: PanicEvent, nearbyUserIds?: string[]) {
  const filter = (meta: { userId?: string; role?: string; vehicleId?: string }) =>
    meta.role === 'admin' ||
    meta.role === 'helper' ||
    meta.role === 'driver' ||
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

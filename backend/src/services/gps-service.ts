/**
 * SilentEye — Plataforma de Seguridad Vehicular
 * Copyright (c) 2026 Christian Fiesco. All rights reserved.
 * PROPRIETARY AND CONFIDENTIAL — See LICENSE file for details.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import { pool } from '../db/pool.js';
import { hasPostGis } from '../db/postgis-check.js';
import type { AVLRecord } from '../teltonika/avl-decoder.js';
import { logger } from '../utils/logger.js';
import { broadcastLocation, broadcastPanic } from './websocket.js';
import { sendPushToUsers } from './push-service.js';

const PANIC_TRACKING_INTERVAL_SEC = 4;
const NEARBY_DRIVERS_RADIUS_M = parseInt(process.env.PANIC_ALERT_RADIUS_M || '2000', 10) || 2000; // 1–3 km

// Minimum distance (meters) from parked position to trigger theft alert
const THEFT_DISTANCE_THRESHOLD_M = 50;

// Cooldown: don't create duplicate theft incidents for the same vehicle within this window
const theftCooldowns = new Map<string, number>();
const THEFT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function processGpsData(imei: string, record: AVLRecord): Promise<void> {
  const { latitude, longitude, speed, altitude, angle, satellites, timestamp, io, priority } = record;
  const timestampSec = timestamp / 1000; // PostgreSQL to_timestamp espera segundos (double), no ms

  let postgis = false;
  try {
    postgis = await hasPostGis();
  } catch (e) {
    logger.warn('hasPostGis falló, usando schema simple:', e);
  }

  const client = await pool.connect();
  try {
    const vehicleResult = await client.query(
      'SELECT id, driver_id, plate, parked_at, parked_lat, parked_lng FROM vehicles WHERE imei = $1',
      [imei]
    );
    const vehicle = vehicleResult.rows[0];

    // ── Theft detection: parked vehicle moved ──
    if (vehicle?.parked_at && vehicle.parked_lat != null && vehicle.parked_lng != null && latitude !== 0 && longitude !== 0) {
      const dist = haversineDistance(
        parseFloat(vehicle.parked_lat), parseFloat(vehicle.parked_lng),
        latitude, longitude
      );
      const lastTheft = theftCooldowns.get(vehicle.id);
      if (dist > THEFT_DISTANCE_THRESHOLD_M && (!lastTheft || Date.now() - lastTheft > THEFT_COOLDOWN_MS)) {
        theftCooldowns.set(vehicle.id, Date.now());
        await handleTheftDetection(client, vehicle, imei, latitude, longitude, timestamp, postgis);
      }
    }

    if (postgis) {
      await client.query(
        `INSERT INTO gps_logs (vehicle_id, imei, geom, latitude, longitude, speed, altitude, angle, satellites, timestamp_at, raw_io, din1_value, priority)
         VALUES ($1, $2, ST_SetSRID(ST_MakePoint($4, $3), 4326), $3, $4, $5, $6, $7, $8, to_timestamp($9), $10, $11, $12)`,
        [
          vehicle?.id ?? null,
          imei,
          latitude,
          longitude,
          speed,
          altitude,
          angle,
          satellites,
          timestampSec,
          JSON.stringify(io),
          (io[1] ?? io[0x0001]) as number ?? null,
          priority,
        ]
      );
      if (vehicle?.driver_id) {
        await client.query(
          `UPDATE users SET last_location = ST_SetSRID(ST_MakePoint($2, $1), 4326), last_location_at = NOW(), updated_at = NOW() WHERE id = $3`,
          [latitude, longitude, vehicle.driver_id]
        );
      }
    } else {
      await client.query(
        `INSERT INTO gps_logs (vehicle_id, imei, latitude, longitude, speed, altitude, angle, satellites, timestamp_at, raw_io, din1_value, priority)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, to_timestamp($9), $10, $11, $12)`,
        [
          vehicle?.id ?? null,
          imei,
          latitude,
          longitude,
          speed,
          altitude,
          angle,
          satellites,
          timestampSec,
          JSON.stringify(io),
          (io[1] ?? io[0x0001]) as number ?? null,
          priority,
        ]
      );
      if (vehicle?.driver_id) {
        await client.query(
          `UPDATE users SET last_lat = $1, last_lng = $2, last_location_at = NOW(), updated_at = NOW() WHERE id = $3`,
          [latitude, longitude, vehicle.driver_id]
        );
      }
    }

    // Check if this vehicle has an active incident — if so, share location with all responders
    let incidentFollowerIds: string[] | undefined;
    if (vehicle?.id) {
      const followerResult = await client.query(
        `SELECT DISTINCT f.user_id FROM incident_followers f
         JOIN incidents i ON i.id = f.incident_id
         WHERE i.vehicle_id = $1 AND i.status IN ('active', 'attending')`,
        [vehicle.id]
      );
      if (followerResult.rows.length > 0) {
        incidentFollowerIds = followerResult.rows.map((r: { user_id: string }) => r.user_id);
      }
    }

    broadcastLocation({
      imei,
      vehicleId: vehicle?.id,
      latitude,
      longitude,
      speed,
      timestamp,
      plate: vehicle?.plate,
    }, incidentFollowerIds);
  } finally {
    client.release();
  }
}

export async function processPanicEvent(imei: string, record: AVLRecord): Promise<void> {
  const { latitude, longitude, timestamp } = record;
  const postgis = await hasPostGis();

  const client = await pool.connect();
  try {
    const vehicleResult = await client.query(
      'SELECT id, driver_id, plate FROM vehicles WHERE imei = $1',
      [imei]
    );
    const vehicle = vehicleResult.rows[0];

    if (postgis) {
      const incidentResult = await client.query(
        `INSERT INTO incidents (vehicle_id, driver_id, imei, status, geom, latitude, longitude, started_at)
         VALUES ($1, $2, $3, 'active', ST_SetSRID(ST_MakePoint($5, $4), 4326), $4, $5, NOW())
         RETURNING id`,
        [vehicle?.id ?? null, vehicle?.driver_id ?? null, imei, latitude, longitude]
      );
      const incident = incidentResult.rows[0];
      const nearbyResult = await client.query(
        `SELECT DISTINCT u.id, u.phone, u.name
         FROM users u
         LEFT JOIN helper_locations hl ON hl.user_id = u.id
         WHERE u.is_active
           AND ($4::uuid IS NULL OR u.id != $4)
           AND (
             (hl.user_id IS NOT NULL AND ST_DWithin(hl.geom::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3))
             OR (hl.user_id IS NULL AND u.last_location IS NOT NULL AND ST_DWithin(u.last_location::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3))
           )`,
        [latitude, longitude, NEARBY_DRIVERS_RADIUS_M, vehicle?.driver_id ?? null]
      );
      const nearbyDrivers = nearbyResult.rows;
      for (const driver of nearbyDrivers) {
        await client.query(
          'INSERT INTO incident_followers (incident_id, user_id, status) VALUES ($1, $2, $3) ON CONFLICT (incident_id, user_id) DO NOTHING',
          [incident.id, driver.id, 'notified']
        );
      }
      broadcastPanic(
        {
          incidentId: incident.id,
          imei,
          vehicleId: vehicle?.id,
          plate: vehicle?.plate,
          latitude,
          longitude,
          timestamp,
          nearbyCount: nearbyDrivers.length,
        },
        nearbyDrivers.map((d: { id: string }) => d.id)
      );
      // Push notifications (non-blocking)
      sendPushToUsers(
        nearbyDrivers.map((d: { id: string }) => d.id),
        {
          title: 'ALERTA DE PÁNICO',
          body: `${vehicle?.plate ?? 'Vehículo'} (IMEI: ${imei}) necesita ayuda`,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: `panic-${incident.id}`,
          data: { url: '/sos', incidentId: incident.id, latitude, longitude },
        }
      ).catch((err) => logger.error('Push send error (GPS panic):', err));
      logger.info(`PANIC IMEI=${imei} conductores_cercanos=${nearbyDrivers.length}`);
    } else {
      const incidentResult = await client.query(
        `INSERT INTO incidents (vehicle_id, driver_id, imei, status, latitude, longitude, started_at)
         VALUES ($1, $2, $3, 'active', $4, $5, NOW())
         RETURNING id`,
        [vehicle?.id ?? null, vehicle?.driver_id ?? null, imei, latitude, longitude]
      );
      const incident = incidentResult.rows[0];
      const nearbyResult = await client.query(
        `SELECT DISTINCT u.id, u.phone, u.name
         FROM users u
         WHERE u.is_active
           AND ($4::uuid IS NULL OR u.id != $4)
           AND u.last_lat IS NOT NULL AND u.last_lng IS NOT NULL
           AND (6371000 * acos(LEAST(1, GREATEST(-1,
             cos(radians($1)) * cos(radians(u.last_lat)) * cos(radians(u.last_lng) - radians($2)) + sin(radians($1)) * sin(radians(u.last_lat))
           )))) <= $3`,
        [latitude, longitude, NEARBY_DRIVERS_RADIUS_M, vehicle?.driver_id ?? null]
      );
      const nearbyDrivers = nearbyResult.rows;
      for (const driver of nearbyDrivers) {
        await client.query(
          'INSERT INTO incident_followers (incident_id, user_id, status) VALUES ($1, $2, $3) ON CONFLICT (incident_id, user_id) DO NOTHING',
          [incident.id, driver.id, 'notified']
        );
      }
      broadcastPanic(
        {
          incidentId: incident.id,
          imei,
          vehicleId: vehicle?.id,
          plate: vehicle?.plate,
          latitude,
          longitude,
          timestamp,
          nearbyCount: nearbyDrivers.length,
        },
        nearbyDrivers.map((d: { id: string }) => d.id)
      );
      // Push notifications (non-blocking)
      sendPushToUsers(
        nearbyDrivers.map((d: { id: string }) => d.id),
        {
          title: 'ALERTA DE PÁNICO',
          body: `${vehicle?.plate ?? 'Vehículo'} (IMEI: ${imei}) necesita ayuda`,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: `panic-${incident.id}`,
          data: { url: '/sos', incidentId: incident.id, latitude, longitude },
        }
      ).catch((err) => logger.error('Push send error (GPS panic simple):', err));
      logger.info(`PANIC IMEI=${imei} conductores_cercanos=${nearbyDrivers.length}`);
    }
  } finally {
    client.release();
  }
}

export function getPanicTrackingInterval(): number {
  return PANIC_TRACKING_INTERVAL_SEC;
}

// ── Theft detection handler ──
async function handleTheftDetection(
  client: import('pg').PoolClient,
  vehicle: { id: string; driver_id: string | null; plate: string },
  imei: string,
  latitude: number,
  longitude: number,
  timestamp: number,
  postgis: boolean
): Promise<void> {
  try {
    // Create theft incident
    let incidentResult;
    if (postgis) {
      incidentResult = await client.query(
        `INSERT INTO incidents (vehicle_id, driver_id, imei, status, geom, latitude, longitude, started_at, source)
         VALUES ($1, $2, $3, 'active', ST_SetSRID(ST_MakePoint($5, $4), 4326), $4, $5, NOW(), 'theft')
         RETURNING id`,
        [vehicle.id, vehicle.driver_id, imei, latitude, longitude]
      );
    } else {
      incidentResult = await client.query(
        `INSERT INTO incidents (vehicle_id, driver_id, imei, status, latitude, longitude, started_at, source)
         VALUES ($1, $2, $3, 'active', $4, $5, NOW(), 'theft')
         RETURNING id`,
        [vehicle.id, vehicle.driver_id, imei, latitude, longitude]
      );
    }
    const incident = incidentResult.rows[0];
    if (!incident) return;

    // Find nearby helpers/drivers to assist
    let nearbyUserIds: string[] = [];
    if (postgis) {
      const nearby = await client.query(
        `SELECT DISTINCT u.id FROM users u
         LEFT JOIN helper_locations hl ON hl.user_id = u.id
         WHERE u.is_active AND ($4::uuid IS NULL OR u.id != $4)
           AND (
             (hl.user_id IS NOT NULL AND ST_DWithin(hl.geom::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3))
             OR (hl.user_id IS NULL AND u.last_location IS NOT NULL AND ST_DWithin(u.last_location::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3))
           )`,
        [latitude, longitude, NEARBY_DRIVERS_RADIUS_M, vehicle.driver_id]
      );
      nearbyUserIds = nearby.rows.map((r: { id: string }) => r.id);
    } else {
      const nearby = await client.query(
        `SELECT DISTINCT u.id FROM users u
         WHERE u.is_active AND ($4::uuid IS NULL OR u.id != $4)
           AND u.last_lat IS NOT NULL AND u.last_lng IS NOT NULL
           AND (6371000 * acos(LEAST(1, GREATEST(-1,
             cos(radians($1)) * cos(radians(u.last_lat)) * cos(radians(u.last_lng) - radians($2)) + sin(radians($1)) * sin(radians(u.last_lat))
           )))) <= $3`,
        [latitude, longitude, NEARBY_DRIVERS_RADIUS_M, vehicle.driver_id]
      );
      nearbyUserIds = nearby.rows.map((r: { id: string }) => r.id);
    }

    // Add nearby users as followers
    for (const uid of nearbyUserIds) {
      await client.query(
        'INSERT INTO incident_followers (incident_id, user_id, status) VALUES ($1, $2, $3) ON CONFLICT (incident_id, user_id) DO NOTHING',
        [incident.id, uid, 'notified']
      );
    }

    // Broadcast panic via WebSocket
    broadcastPanic(
      {
        incidentId: incident.id,
        imei,
        vehicleId: vehicle.id,
        plate: vehicle.plate,
        latitude,
        longitude,
        timestamp,
        nearbyCount: nearbyUserIds.length,
        source: 'theft',
      },
      nearbyUserIds
    );

    // Push to vehicle owner (always) + nearby users
    const pushTargets = [...nearbyUserIds];
    if (vehicle.driver_id && !pushTargets.includes(vehicle.driver_id)) {
      pushTargets.push(vehicle.driver_id);
    }
    sendPushToUsers(pushTargets, {
      title: '🚨 ALERTA DE ROBO',
      body: `${vehicle.plate} se está moviendo estacionado. Posible robo en curso.`,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `theft-${incident.id}`,
      data: { url: '/sos', incidentId: incident.id, latitude, longitude },
    }).catch((err) => logger.error('Push send error (theft):', err));

    // Auto-unpark to prevent duplicate theft incidents (the incident is now tracking)
    await client.query(
      'UPDATE vehicles SET parked_at = NULL, parked_lat = NULL, parked_lng = NULL, updated_at = NOW() WHERE id = $1',
      [vehicle.id]
    );

    logger.info(`THEFT DETECTED IMEI=${imei} plate=${vehicle.plate} incident=${incident.id} lat=${latitude} lng=${longitude} nearby=${nearbyUserIds.length}`);
  } catch (err) {
    logger.error('handleTheftDetection error:', err);
  }
}

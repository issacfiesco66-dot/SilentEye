/**
 * SilentEye — Plataforma de Seguridad Vehicular
 * Copyright (c) 2026 Christian Fiesco. All rights reserved.
 * PROPRIETARY AND CONFIDENTIAL — See LICENSE file for details.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import { pool } from '../db/pool.js';
import { hasPostGis } from '../db/postgis-check.js';
import type { AVLRecord } from '../gps/avl-decoder.js';
import { logger } from '../utils/logger.js';
import { broadcastLocation, broadcastPanic, sendCameraActivation } from './websocket.js';
import { sendPushToUsers } from './push-service.js';
import { evaluateTrailerRules } from './trailer-service.js';

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
      'SELECT id, driver_id, owner_id, plate, parked_at, parked_lat, parked_lng FROM vehicles WHERE imei = $1',
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

    // ── Trailer rules engine (Logística Blindada) ──
    // Runs asynchronously after the GPS log is saved so a slow rule
    // evaluation never delays the GPS pipeline. Requires PostGIS for
    // ST_Contains / ST_Distance — silently skipped on simple schema.
    if (postgis && vehicle?.id && latitude !== 0 && longitude !== 0) {
      evaluateTrailerRules({
        vehicleId: vehicle.id,
        latitude,
        longitude,
        speed,
        timestamp: new Date(timestamp),
      }).then((alerts) => {
        for (const alert of alerts) {
          logger.info(`[trailer] alert ${alert.alert_type} (${alert.severity}) for vehicle ${vehicle.id}`);
        }
      }).catch((err) => {
        logger.warn(`[trailer] rules eval failed for ${vehicle.id}: ${err?.message || err}`);
      });
    }

    // ── Speed alert ──
    if (vehicle?.id && speed > 0 && latitude !== 0 && longitude !== 0) {
      try {
        // Check owner's and driver's speed limit
        const ownerIds: string[] = [];
        if (vehicle.driver_id) ownerIds.push(vehicle.driver_id);
        if (vehicle.owner_id && !ownerIds.includes(vehicle.owner_id)) ownerIds.push(vehicle.owner_id);
        const ownerQ = await client.query(
          `SELECT id, speed_limit FROM users WHERE id = ANY($1::uuid[]) AND speed_limit > 0`,
          [ownerIds]
        );
        for (const u of ownerQ.rows) {
          if (speed > u.speed_limit) {
            sendPushToUsers([u.id], {
              title: '⚡ Exceso de velocidad',
              body: `${vehicle.plate || imei} a ${speed} km/h (límite: ${u.speed_limit} km/h)`,
              icon: '/icon-192.png',
              tag: `speed-${vehicle.id}-${Math.floor(Date.now() / 60000)}`,
              data: { url: '/dashboard', vehicleId: vehicle.id },
            }).catch(() => {});
          }
        }
      } catch (e) { logger.warn('Speed alert check error (non-fatal):', e); }
    }

    // ── Geofence check ──
    if (vehicle?.id && latitude !== 0 && longitude !== 0) {
      try {
        // Get all active geofences for the vehicle's driver and owner
        const userIds: string[] = [];
        if (vehicle.driver_id) userIds.push(vehicle.driver_id);
        if (vehicle.owner_id && !userIds.includes(vehicle.owner_id)) {
          userIds.push(vehicle.owner_id);
        }
        if (userIds.length > 0) {
          const geoResult = await client.query(
            `SELECT * FROM geofences WHERE user_id = ANY($1::uuid[]) AND is_active = TRUE`,
            [userIds]
          );
          for (const fence of geoResult.rows) {
            const dist = haversineDistance(latitude, longitude, fence.latitude, fence.longitude);
            const inside = dist <= fence.radius_m;
            // Check for exit: vehicle was inside, now outside
            if (!inside && fence.alert_on_exit) {
              // Prevent duplicate alerts within 5 min
              const recent = await client.query(
                `SELECT id FROM geofence_alerts WHERE geofence_id = $1 AND vehicle_id = $2 AND alert_type = 'exit' AND created_at > NOW() - interval '5 minutes'`,
                [fence.id, vehicle.id]
              );
              if (recent.rows.length === 0) {
                await client.query(
                  `INSERT INTO geofence_alerts (geofence_id, vehicle_id, alert_type, latitude, longitude) VALUES ($1, $2, 'exit', $3, $4)`,
                  [fence.id, vehicle.id, latitude, longitude]
                );
                sendPushToUsers([fence.user_id], {
                  title: '🚧 Fuera de geocerca',
                  body: `${vehicle.plate || imei} salió de "${fence.name}"`,
                  icon: '/icon-192.png',
                  tag: `geofence-exit-${fence.id}-${vehicle.id}`,
                  data: { url: '/dashboard', vehicleId: vehicle.id },
                }).catch(() => {});
                logger.info(`GEOFENCE EXIT vehicle=${vehicle.plate} fence="${fence.name}" dist=${Math.round(dist)}m`);
              }
            }
            // Check for enter
            if (inside && fence.alert_on_enter) {
              const recent = await client.query(
                `SELECT id FROM geofence_alerts WHERE geofence_id = $1 AND vehicle_id = $2 AND alert_type = 'enter' AND created_at > NOW() - interval '5 minutes'`,
                [fence.id, vehicle.id]
              );
              if (recent.rows.length === 0) {
                await client.query(
                  `INSERT INTO geofence_alerts (geofence_id, vehicle_id, alert_type, latitude, longitude) VALUES ($1, $2, 'enter', $3, $4)`,
                  [fence.id, vehicle.id, latitude, longitude]
                );
                sendPushToUsers([fence.user_id], {
                  title: '📍 Entró a geocerca',
                  body: `${vehicle.plate || imei} entró a "${fence.name}"`,
                  icon: '/icon-192.png',
                  tag: `geofence-enter-${fence.id}-${vehicle.id}`,
                  data: { url: '/dashboard', vehicleId: vehicle.id },
                }).catch(() => {});
                logger.info(`GEOFENCE ENTER vehicle=${vehicle.plate} fence="${fence.name}" dist=${Math.round(dist)}m`);
              }
            }
          }
        }
      } catch (e) { logger.warn('Geofence check error (non-fatal):', e); }
    }

    // Check if this vehicle has an active incident — if so, share location with all responders
    let incidentFollowerIds: string[] | undefined;
    if (vehicle?.id) {
      const followerResult = await client.query(
        `SELECT DISTINCT f.user_id FROM incident_followers f
         JOIN incidents i ON i.id = f.incident_id
         WHERE i.vehicle_id = $1 AND i.status IN ('active', 'attending', 'localizado')`,
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

// Per-IMEI panic cooldown — a single device cannot trigger more than one
// panic per PANIC_COOLDOWN_MS. This prevents panic-flood attacks where a
// compromised or misconfigured device hammers the server, which would
// otherwise result in hundreds of incidents/sec plus nearby-user queries,
// WebSocket broadcasts and push notifications.
const PANIC_COOLDOWN_MS = parseInt(process.env.PANIC_COOLDOWN_MS || '60000', 10);
const panicCooldowns = new Map<string, number>();

export async function processPanicEvent(imei: string, record: AVLRecord): Promise<void> {
  const { latitude, longitude, timestamp } = record;

  // Cooldown check — in-memory map, reset on process restart which is
  // acceptable because panic events are already persisted in incidents.
  const now = Date.now();
  const last = panicCooldowns.get(imei) ?? 0;
  if (now - last < PANIC_COOLDOWN_MS) {
    logger.warn(`[panic-cooldown] IMEI=${imei} dropped (last ${Math.round((now - last) / 1000)}s ago)`);
    return;
  }
  panicCooldowns.set(imei, now);

  // Periodically garbage-collect the map to avoid unbounded growth if many
  // unique IMEIs connect over the process lifetime.
  if (panicCooldowns.size > 10_000) {
    const cutoff = now - PANIC_COOLDOWN_MS * 2;
    for (const [k, v] of panicCooldowns) {
      if (v < cutoff) panicCooldowns.delete(k);
    }
  }

  const postgis = await hasPostGis();

  const client = await pool.connect();
  try {
    const vehicleResult = await client.query(
      'SELECT id, driver_id, owner_id, plate FROM vehicles WHERE imei = $1',
      [imei]
    );
    const vehicle = vehicleResult.rows[0];

    // Collect driver + owner IDs for camera activation notifications
    const cameraTargetIds: string[] = [];
    if (vehicle?.driver_id) cameraTargetIds.push(vehicle.driver_id);
    if (vehicle?.owner_id && !cameraTargetIds.includes(vehicle.owner_id)) cameraTargetIds.push(vehicle.owner_id);

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
      // Include driver + owner as incident followers
      for (const uid of cameraTargetIds) {
        await client.query(
          'INSERT INTO incident_followers (incident_id, user_id, status) VALUES ($1, $2, $3) ON CONFLICT (incident_id, user_id) DO NOTHING',
          [incident.id, uid, 'notified']
        );
      }
      for (const driver of nearbyDrivers) {
        await client.query(
          'INSERT INTO incident_followers (incident_id, user_id, status) VALUES ($1, $2, $3) ON CONFLICT (incident_id, user_id) DO NOTHING',
          [incident.id, driver.id, 'notified']
        );
      }
      // Merge nearby + camera targets for broadcast
      const allRecipientIds = [...nearbyDrivers.map((d: { id: string }) => d.id)];
      for (const uid of cameraTargetIds) {
        if (!allRecipientIds.includes(uid)) allRecipientIds.push(uid);
      }
      // Broadcast panic event to all nearby / followers (no camera activation flag)
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
          source: 'gps_panic',
        },
        allRecipientIds
      );
      // Camera activation is delivered ONLY to the driver and fleet owner of
      // the vehicle that triggered the panic — never to nearby bystanders.
      if (cameraTargetIds.length > 0) {
        sendCameraActivation(cameraTargetIds, {
          incidentId: incident.id,
          plate: vehicle?.plate,
          latitude,
          longitude,
          source: 'gps_panic',
        });
      }
      // Push to nearby users
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
      // Push to driver + owner: activate camera
      if (cameraTargetIds.length > 0) {
        sendPushToUsers(
          cameraTargetIds,
          {
            title: 'PÁNICO GPS — ACTIVA TU CÁMARA',
            body: `Botón de pánico activado en ${vehicle?.plate ?? imei}. Toca para grabar evidencia.`,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: `panic-camera-${incident.id}`,
            data: { url: '/sos', incidentId: incident.id, latitude, longitude, activateCamera: true },
          }
        ).catch((err) => logger.error('Push send error (GPS panic camera):', err));
      }
      logger.info(`PANIC IMEI=${imei} conductores_cercanos=${nearbyDrivers.length} camera_targets=${cameraTargetIds.length}`);
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
      for (const uid of cameraTargetIds) {
        await client.query(
          'INSERT INTO incident_followers (incident_id, user_id, status) VALUES ($1, $2, $3) ON CONFLICT (incident_id, user_id) DO NOTHING',
          [incident.id, uid, 'notified']
        );
      }
      for (const driver of nearbyDrivers) {
        await client.query(
          'INSERT INTO incident_followers (incident_id, user_id, status) VALUES ($1, $2, $3) ON CONFLICT (incident_id, user_id) DO NOTHING',
          [incident.id, driver.id, 'notified']
        );
      }
      const allRecipientIds = [...nearbyDrivers.map((d: { id: string }) => d.id)];
      for (const uid of cameraTargetIds) {
        if (!allRecipientIds.includes(uid)) allRecipientIds.push(uid);
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
          source: 'gps_panic',
        },
        allRecipientIds
      );
      if (cameraTargetIds.length > 0) {
        sendCameraActivation(cameraTargetIds, {
          incidentId: incident.id,
          plate: vehicle?.plate,
          latitude,
          longitude,
          source: 'gps_panic',
        });
      }
      // Push to nearby users
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
      if (cameraTargetIds.length > 0) {
        sendPushToUsers(
          cameraTargetIds,
          {
            title: 'PÁNICO GPS — ACTIVA TU CÁMARA',
            body: `Botón de pánico activado en ${vehicle?.plate ?? imei}. Toca para grabar evidencia.`,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: `panic-camera-${incident.id}`,
            data: { url: '/sos', incidentId: incident.id, latitude, longitude, activateCamera: true },
          }
        ).catch((err) => logger.error('Push send error (GPS panic camera simple):', err));
      }
      logger.info(`PANIC IMEI=${imei} conductores_cercanos=${nearbyDrivers.length} camera_targets=${cameraTargetIds.length}`);
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

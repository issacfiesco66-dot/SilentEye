import { pool } from '../db/pool.js';
import { hasPostGis } from '../db/postgis-check.js';
import type { AVLRecord } from '../teltonika/avl-decoder.js';
import { logger } from '../utils/logger.js';
import { broadcastLocation, broadcastPanic } from './websocket.js';

const PANIC_TRACKING_INTERVAL_SEC = 4;
const NEARBY_HELPERS_RADIUS_M = 3000;

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
      'SELECT id, driver_id, plate FROM vehicles WHERE imei = $1',
      [imei]
    );
    const vehicle = vehicleResult.rows[0];

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

    broadcastLocation({
      imei,
      vehicleId: vehicle?.id,
      latitude,
      longitude,
      speed,
      timestamp,
      plate: vehicle?.plate,
    });
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
         VALUES ($1, $2, $3, 'active', ST_SetSRID(ST_MakePoint($5, $4), 4326), $4, $5, to_timestamp($6))
         RETURNING id`,
        [vehicle?.id ?? null, vehicle?.driver_id ?? null, imei, latitude, longitude, timestamp / 1000]
      );
      const incident = incidentResult.rows[0];
      const nearbyResult = await client.query(
        `SELECT DISTINCT u.id, u.phone, u.name
         FROM users u
         LEFT JOIN helper_locations hl ON hl.user_id = u.id
         WHERE u.role = 'helper' AND u.is_active
           AND (
             (hl.user_id IS NOT NULL AND ST_DWithin(hl.geom::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3))
             OR (hl.user_id IS NULL AND u.last_location IS NOT NULL AND ST_DWithin(u.last_location::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3))
           )`,
        [latitude, longitude, NEARBY_HELPERS_RADIUS_M]
      );
      const nearbyHelpers = nearbyResult.rows;
      for (const helper of nearbyHelpers) {
        await client.query(
          'INSERT INTO incident_followers (incident_id, user_id, status) VALUES ($1, $2, $3) ON CONFLICT (incident_id, user_id) DO NOTHING',
          [incident.id, helper.id, 'notified']
        );
      }
      broadcastPanic({
        incidentId: incident.id,
        imei,
        vehicleId: vehicle?.id,
        plate: vehicle?.plate,
        latitude,
        longitude,
        timestamp,
        nearbyCount: nearbyHelpers.length,
      });
      logger.info(`PANIC IMEI=${imei} helpers=${nearbyHelpers.length}`);
    } else {
      const incidentResult = await client.query(
        `INSERT INTO incidents (vehicle_id, driver_id, imei, status, latitude, longitude, started_at)
         VALUES ($1, $2, $3, 'active', $4, $5, to_timestamp($6))
         RETURNING id`,
        [vehicle?.id ?? null, vehicle?.driver_id ?? null, imei, latitude, longitude, timestamp / 1000]
      );
      const incident = incidentResult.rows[0];
      const nearbyResult = await client.query(
        `SELECT u.id, u.phone, u.name FROM users u
         WHERE u.role = 'helper' AND u.is_active AND u.last_lat IS NOT NULL AND u.last_lng IS NOT NULL
         AND (6371000 * acos(LEAST(1, GREATEST(-1,
           cos(radians($1)) * cos(radians(u.last_lat)) * cos(radians(u.last_lng) - radians($2)) + sin(radians($1)) * sin(radians(u.last_lat))
         )))) <= $3`,
        [latitude, longitude, NEARBY_HELPERS_RADIUS_M]
      );
      const nearbyHelpers = nearbyResult.rows;
      for (const helper of nearbyHelpers) {
        await client.query(
          'INSERT INTO incident_followers (incident_id, user_id, status) VALUES ($1, $2, $3) ON CONFLICT (incident_id, user_id) DO NOTHING',
          [incident.id, helper.id, 'notified']
        );
      }
      broadcastPanic({
        incidentId: incident.id,
        imei,
        vehicleId: vehicle?.id,
        plate: vehicle?.plate,
        latitude,
        longitude,
        timestamp,
        nearbyCount: nearbyHelpers.length,
      });
      logger.info(`PANIC IMEI=${imei} helpers=${nearbyHelpers.length}`);
    }
  } finally {
    client.release();
  }
}

export function getPanicTrackingInterval(): number {
  return PANIC_TRACKING_INTERVAL_SEC;
}

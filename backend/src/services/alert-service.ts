import { pool } from '../db/pool.js';
import { hasPostGis } from '../db/postgis-check.js';
import { logger } from '../utils/logger.js';
import { broadcastAlert } from './websocket.js';
import type { NormalizedAlert } from '../teltonika/alert-detector.js';

const ALERT_RADIUS_M = parseInt(process.env.PANIC_ALERT_RADIUS_M || '2000', 10) || 2000; // 1–3 km

export interface StoredAlert extends NormalizedAlert {
  id: string;
  vehicleId?: string;
  plate?: string;
  createdAt: string;
}

export async function processAlert(alert: NormalizedAlert): Promise<StoredAlert | null> {
  const { deviceImei, timestamp, alertType, latitude, longitude, speed, rawEventId, priority, rawIO } = alert;

  const client = await pool.connect();
  try {
    const vehicleResult = await client.query(
      'SELECT id, plate FROM vehicles WHERE imei = $1 LIMIT 1',
      [deviceImei]
    );
    const vehicle = vehicleResult.rows[0];
    const vehicleId = vehicle?.id ?? null;

    const postgis = await hasPostGis();
    const rawIoJson = JSON.stringify(rawIO);

    if (postgis) {
      await client.query(
        `INSERT INTO alerts (device_imei, vehicle_id, alert_type, geom, latitude, longitude, speed, raw_event_id, priority, raw_io)
         VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($5, $4), 4326), $4, $5, $6, $7, $8, $9)`,
        [deviceImei, vehicleId, alertType, latitude, longitude, speed, rawEventId, priority, rawIoJson]
      );
    } else {
      await client.query(
        `INSERT INTO alerts (device_imei, vehicle_id, alert_type, latitude, longitude, speed, raw_event_id, priority, raw_io)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [deviceImei, vehicleId, alertType, latitude, longitude, speed, rawEventId, priority, rawIoJson]
      );
    }

    const r = await client.query(
      `SELECT id, device_imei, vehicle_id, alert_type, latitude, longitude, speed, raw_event_id, priority, created_at
       FROM alerts WHERE device_imei = $1 ORDER BY created_at DESC LIMIT 1`,
      [deviceImei]
    );
    const row = r.rows[0];
    if (!row) return null;

    const stored: StoredAlert = {
      ...alert,
      id: row.id,
      vehicleId: row.vehicle_id,
      plate: vehicle?.plate,
      createdAt: row.created_at,
    };

    // Conductores Y helpers dentro del radio reciben la alerta (admin siempre via broadcastAlert filter)
    let nearbyUserIds: string[] = [];
    if (postgis) {
      const nearby = await client.query(
        `SELECT DISTINCT u.id FROM users u
         LEFT JOIN vehicles v ON v.driver_id = u.id
         LEFT JOIN helper_locations hl ON hl.user_id = u.id
         WHERE u.is_active AND u.role IN ('driver', 'helper') AND (
           (hl.user_id IS NOT NULL AND ST_DWithin(hl.geom::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3))
           OR (hl.user_id IS NULL AND u.last_location IS NOT NULL AND ST_DWithin(u.last_location::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3))
         )`,
        [latitude, longitude, ALERT_RADIUS_M]
      );
      nearbyUserIds = nearby.rows.map((r: { id: string }) => r.id);
    } else {
      const nearby = await client.query(
        `SELECT DISTINCT u.id FROM users u
         LEFT JOIN vehicles v ON v.driver_id = u.id
         WHERE u.is_active AND u.role IN ('driver', 'helper')
           AND u.last_lat IS NOT NULL AND u.last_lng IS NOT NULL
           AND (6371000 * acos(LEAST(1, GREATEST(-1,
             cos(radians($1)) * cos(radians(u.last_lat)) * cos(radians(u.last_lng) - radians($2)) + sin(radians($1)) * sin(radians(u.last_lat))
           )))) <= $3`,
        [latitude, longitude, ALERT_RADIUS_M]
      );
      nearbyUserIds = nearby.rows.map((r: { id: string }) => r.id);
    }
    broadcastAlert(stored, nearbyUserIds);
    const priLabel = priority === 2 ? 'PANIC' : priority === 1 ? 'HIGH' : 'LOW';
    logger.info(`[ALERT][${priLabel}][${alertType.toUpperCase()}][${deviceImei}][${latitude.toFixed(5)},${longitude.toFixed(5)}]`);

    return stored;
  } finally {
    client.release();
  }
}

export async function getAlerts(limit = 100, since?: Date, driverUserId?: string): Promise<StoredAlert[]> {
  const client = await pool.connect();
  try {
    let query = `
      SELECT a.id, a.device_imei, a.vehicle_id, a.alert_type, a.latitude, a.longitude, a.speed,
             a.raw_event_id, a.priority, a.raw_io, a.created_at, v.plate
      FROM alerts a
      LEFT JOIN vehicles v ON v.id = a.vehicle_id
    `;
    const params: unknown[] = [];
    if (since) {
      query += ' WHERE a.created_at >= $1';
      params.push(since);
    }
    query += ' ORDER BY a.created_at DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    let r = await client.query(query, params);
    let rows = r.rows;

    // Conductor: solo alertas dentro del radio de su ubicación
    if (driverUserId && rows.length > 0) {
      const pg = await hasPostGis();
      const userLoc = pg
        ? await client.query(
            `SELECT COALESCE(hl.geom, u.last_location) as geom
             FROM users u
             LEFT JOIN helper_locations hl ON hl.user_id = u.id
             WHERE u.id = $1 AND (hl.geom IS NOT NULL OR u.last_location IS NOT NULL)
             LIMIT 1`,
            [driverUserId]
          )
        : await client.query(
            'SELECT last_lat, last_lng FROM users WHERE id = $1 AND last_lat IS NOT NULL LIMIT 1',
            [driverUserId]
          );
      const uRow = userLoc.rows[0];
      if (uRow) {
        if (pg && uRow.geom) {
          const distQuery = await client.query(
            `SELECT a.id FROM alerts a WHERE ST_DWithin(a.geom::geography, $1::geography, $2)`,
            [uRow.geom, ALERT_RADIUS_M]
          );
          const ids = new Set(distQuery.rows.map((x: { id: string }) => x.id));
          rows = rows.filter((row: { id: string }) => ids.has(row.id));
        } else if (uRow.last_lat != null && uRow.last_lng != null) {
          const lat = parseFloat(uRow.last_lat);
          const lng = parseFloat(uRow.last_lng);
          rows = rows.filter((row: { latitude: string; longitude: string }) => {
            const alat = parseFloat(row.latitude);
            const alng = parseFloat(row.longitude);
            const d = 6371000 * Math.acos(Math.min(1, Math.max(-1,
              Math.cos(lat * Math.PI / 180) * Math.cos(alat * Math.PI / 180) * Math.cos((alng - lng) * Math.PI / 180) +
              Math.sin(lat * Math.PI / 180) * Math.sin(alat * Math.PI / 180)
            )));
            return d <= ALERT_RADIUS_M;
          });
        } else {
          rows = [];
        }
      } else {
        rows = [];
      }
    }

    interface AlertRow {
      id: string;
      device_imei: string;
      vehicle_id?: string;
      alert_type: string;
      latitude: string;
      longitude: string;
      speed: number;
      raw_event_id: number;
      priority: number;
      raw_io: Record<string, number | bigint>;
      created_at: string;
      plate?: string;
    }
    return (rows as AlertRow[]).map((row) => ({
      deviceImei: row.device_imei,
      timestamp: new Date(row.created_at).getTime(),
      alertType: row.alert_type,
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
      speed: row.speed ?? 0,
      rawEventId: row.raw_event_id ?? 0,
      priority: row.priority ?? 0,
      rawIO: (row.raw_io as Record<string, number | bigint>) ?? {},
      id: row.id,
      vehicleId: row.vehicle_id,
      plate: row.plate,
      createdAt: row.created_at,
    }));
  } finally {
    client.release();
  }
}

/** Borrar alertas: antes de una fecha, o todas si before es null */
export async function deleteAlerts(before?: Date): Promise<{ deleted: number }> {
  const client = await pool.connect();
  try {
    let result;
    if (before) {
      result = await client.query(
        'DELETE FROM alerts WHERE created_at < $1',
        [before]
      );
    } else {
      result = await client.query('DELETE FROM alerts');
    }
    return { deleted: result.rowCount ?? 0 };
  } finally {
    client.release();
  }
}

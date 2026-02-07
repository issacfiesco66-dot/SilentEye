import { pool } from '../db/pool.js';
import { hasPostGis } from '../db/postgis-check.js';
import { logger } from '../utils/logger.js';
import { broadcastAlert } from './websocket.js';
import type { NormalizedAlert } from '../teltonika/alert-detector.js';

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

    broadcastAlert(stored);
    const priLabel = priority === 2 ? 'PANIC' : priority === 1 ? 'HIGH' : 'LOW';
    logger.info(`[ALERT][${priLabel}][${alertType.toUpperCase()}][${deviceImei}][${latitude.toFixed(5)},${longitude.toFixed(5)}]`);

    return stored;
  } finally {
    client.release();
  }
}

export async function getAlerts(limit = 100, since?: Date): Promise<StoredAlert[]> {
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

    const r = await client.query(query, params);
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
    return (r.rows as AlertRow[]).map((row) => ({
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

/**
 * Detector de alertas Teltonika AVL
 * Basado en Priority, Event IO ID e I/O Elements.
 * Extensible: mapeo configurable para distintos firmwares (FMB920, FMU920, etc.)
 */

import type { AVLRecord } from './avl-decoder.js';

export interface NormalizedAlert {
  deviceImei: string;
  timestamp: number;
  alertType: string;
  latitude: number;
  longitude: number;
  speed: number;
  rawEventId: number;
  priority: number;
  rawIO: Record<string, number | bigint>;
}

/** Mapeo Event IO ID → tipo de alerta. Valores según documentación Teltonika (Codec 8 y 8E, FMC920/FMB920) */
const EVENT_IO_TO_ALERT: Record<number, string> = {
  37: 'panic',           // Alarm button (DIN1)
  22: 'overspeed',       // Overspeeding
  66: 'gnss_jamming',    // GNSS Jamming
  78: 'eco_driving',     // Green driving / Eco event
  252: 'crash',          // Crash sensor (FMB)
  253: 'crash',          // Crash sensor (FMB)
  254: 'crash',          // Crash sensor (FMB)
  2: 'tampering',        // Tampering
  16: 'gsm_fail',        // GSM connection lost
  24: 'geofence',        // Geofence enter/exit
  251: 'towing',         // Towing detection
  249: 'unplug',         // Unplug detection
  250: 'excessive_idling', // Excessive idling
  248: 'trip',           // Trip start/end
  247: 'immobilizer',    // Immobilizer
  246: 'jamming',        // Jamming (alternativo)
};

/** Mapeo IO Element ID → condición que dispara alerta. Codec 8: id 1 byte. Codec 8E: id 2 bytes (0x0001=1, etc.) */
const IO_ELEMENT_ALERTS: Record<number, { value: number; alertType: string }[]> = {
  1: [
    { value: 1, alertType: 'panic' },           // DIN1=1: botón a +V (o NC)
    { value: 0, alertType: 'panic' },           // DIN1=0: botón a GND (conexión típica amarillo-negro)
  ],
  78: [{ value: 0, alertType: 'ignition_off' }, { value: 1, alertType: 'ignition_on' }],  // Ignition (iButton en algunos)
  199: [{ value: 4, alertType: 'gnss_jamming' }], // GNSS Status 4 = jamming (Trip Odometer en algunos)
  239: [{ value: 1, alertType: 'overspeed' }],  // Overspeed flag / Ignition (según dispositivo)
  182: [{ value: 1, alertType: 'overspeed' }],  // GNSS HDOP / Overspeed (alternativo)
  69: [{ value: 4, alertType: 'gnss_jamming' }], // GNSS Status 4 = jamming (FMC920)
};

/** Prioridad Teltonika: 0=Low, 1=High, 2=Panic */
const PRIORITY_LABELS: Record<number, string> = {
  0: 'low',
  1: 'high',
  2: 'panic',
};

/**
 * Detecta si un registro AVL representa una alerta.
 * Orden de evaluación: Priority 2 (panic) → Event IO ID → IO Elements.
 */
export function detectAlert(deviceImei: string, record: AVLRecord): NormalizedAlert | null {
  const { timestamp, priority, latitude, longitude, speed, io, eventIoId } = record;

  let alertType: string | null = null;

  // 1. Priority = 2 → Panic (emergencia)
  if (priority === 2) {
    alertType = 'panic';
  }

  // 2. Event IO ID → mapeo directo
  if (!alertType && EVENT_IO_TO_ALERT[eventIoId]) {
    alertType = EVENT_IO_TO_ALERT[eventIoId];
  }

  // 3. Priority = 1 (High) + Event IO ID conocido
  if (!alertType && priority === 1 && EVENT_IO_TO_ALERT[eventIoId]) {
    alertType = EVENT_IO_TO_ALERT[eventIoId];
  }

  // 4. IO Elements: solo en registros de evento (priority>=1), para evitar falsos positivos en datos periódicos
  if (!alertType && priority >= 1) {
    for (const [idStr, conditions] of Object.entries(IO_ELEMENT_ALERTS)) {
      const id = parseInt(idStr, 10);
      const val = io[id];
      if (val === undefined) continue;
      const numVal = typeof val === 'bigint' ? Number(val) : val;
      for (const c of conditions) {
        if (numVal === c.value) {
          alertType = c.alertType;
          break;
        }
      }
      if (alertType) break;
    }
  }

  if (!alertType) return null;

  const rawIO: Record<string, number | bigint> = {};
  for (const [k, v] of Object.entries(io)) {
    rawIO[k] = v;
  }

  return {
    deviceImei,
    timestamp,
    alertType,
    latitude,
    longitude,
    speed,
    rawEventId: eventIoId,
    priority,
    rawIO,
  };
}

/** Registra un mapeo adicional Event IO ID → alerta (extensible) */
export function registerEventIoMapping(eventIoId: number, alertType: string): void {
  EVENT_IO_TO_ALERT[eventIoId] = alertType;
}

/** Registra condición IO Element → alerta (extensible) */
export function registerIoAlert(ioId: number, value: number, alertType: string): void {
  if (!IO_ELEMENT_ALERTS[ioId]) IO_ELEMENT_ALERTS[ioId] = [];
  IO_ELEMENT_ALERTS[ioId].push({ value, alertType });
}

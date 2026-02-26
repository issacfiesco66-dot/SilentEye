/**
 * SilentEye — Plataforma de Seguridad Vehicular
 * Copyright (c) 2026 Christian Fiesco. All rights reserved.
 * PROPRIETARY AND CONFIDENTIAL — See LICENSE file for details.
 *
 * Queclink GPS Parser — GL300, GV300, GV58CEU and compatible models
 * Text-based protocol: +RESP/+BUFF messages, comma-separated, terminated with $
 * Normalizes output to AVLRecord for unified downstream processing.
 */

import type { AVLRecord } from './avl-decoder.js';
import { logger } from '../utils/logger.js';

/* ── Queclink-specific virtual IO IDs (negative to avoid collision with Teltonika) ── */
export const QIO_BATTERY     = -1;   // Battery percentage
export const QIO_EXT_POWER   = -2;   // External power voltage
export const QIO_MILEAGE     = -3;   // Odometer (meters)
export const QIO_REPORT_TYPE = -4;   // Report ID type

/* ── Alert message types ── */
const PANIC_TYPES  = new Set(['GTSOS']);
const SPEED_TYPES  = new Set(['GTSPD']);
const TOW_TYPES    = new Set(['GTTOW']);
const IGN_TYPES    = new Set(['GTIGN', 'GTIGF', 'GTIGL']);

export interface QueclinkParsed {
  imei: string;
  messageType: string;
  protocolVersion: string;
  records: AVLRecord[];
  /** If true the server must send ackResponse back to the device */
  needsAck: boolean;
  /** Ready-to-send ACK string (only when needsAck=true) */
  ackResponse: string | null;
  /** Raw message for logging */
  raw: string;
}

/* ── Helpers ── */

/** Parse Queclink timestamp yyyyMMddHHmmss → epoch ms.  Returns Date.now() on bad input. */
function parseTime(s: string): number {
  if (!s || s.length < 14 || !/^\d{14}$/.test(s)) return Date.now();
  const y   = parseInt(s.substring(0, 4), 10);
  const mon = parseInt(s.substring(4, 6), 10) - 1;
  const d   = parseInt(s.substring(6, 8), 10);
  const h   = parseInt(s.substring(8, 10), 10);
  const min = parseInt(s.substring(10, 12), 10);
  const sec = parseInt(s.substring(12, 14), 10);
  return Date.UTC(y, mon, d, h, min, sec);
}

/** Safe parseFloat that returns 0 on NaN */
function safeFloat(v: string | undefined): number {
  const n = parseFloat(v || '');
  return isNaN(n) ? 0 : n;
}
/** Safe parseInt that returns 0 on NaN */
function safeInt(v: string | undefined): number {
  const n = parseInt(v || '', 10);
  return isNaN(n) ? 0 : n;
}

/**
 * Find the GPS data block inside a Queclink message by pattern matching.
 * Queclink GPS block is always: accuracy, speed, azimuth, altitude, longitude, latitude, gpsUtcTime
 * We scan for: (float with .) , (float with .) , (14-digit timestamp) ← lng, lat, time
 */
function findGpsBlock(fields: string[]): {
  accuracy: number; speed: number; azimuth: number; altitude: number;
  longitude: number; latitude: number; timestamp: number;
} | null {
  for (let i = 6; i + 2 < fields.length; i++) {
    const timeCandidate = fields[i + 2];
    if (!timeCandidate || timeCandidate.length !== 14 || !/^\d{14}$/.test(timeCandidate)) continue;

    const lng = parseFloat(fields[i]);
    const lat = parseFloat(fields[i + 1]);
    if (isNaN(lng) || isNaN(lat)) continue;
    if (Math.abs(lng) > 180 || Math.abs(lat) > 90) continue;
    // Both must have decimal points (distinguishes from cell id integers)
    if (!fields[i].includes('.') || !fields[i + 1].includes('.')) continue;
    // Reject 0,0 (no fix)
    if (lng === 0 && lat === 0) continue;

    return {
      accuracy: safeInt(fields[i - 4]),
      speed:    safeFloat(fields[i - 3]),
      azimuth:  safeInt(fields[i - 2]),
      altitude: safeFloat(fields[i - 1]),
      longitude: lng,
      latitude:  lat,
      timestamp: parseTime(timeCandidate),
    };
  }
  return null;
}

/**
 * Parse a single Queclink text message (one line ending with $).
 * Returns null if the message is not parseable or not relevant.
 */
function parseSingleMessage(raw: string): QueclinkParsed | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('+')) return null;

  // Remove trailing $ if present
  const clean = trimmed.endsWith('$') ? trimmed.slice(0, -1) : trimmed;
  const fields = clean.split(',');
  if (fields.length < 4) return null;

  // Field 0: "+RESP:GTFRI" or "+BUFF:GTFRI"
  const header = fields[0]; // e.g. "+RESP:GTFRI"
  const colonIdx = header.indexOf(':');
  if (colonIdx === -1) return null;

  const messageType = header.substring(colonIdx + 1); // "GTFRI"
  const protocolVersion = fields[1] || '';
  const imei = fields[2] || '';

  // Validate IMEI (should be 15 digits, but some models report 16 with leading 0)
  if (!/^\d{14,16}$/.test(imei)) {
    logger.debug(`[Queclink] IMEI inválido: "${imei}" en mensaje ${messageType}`);
    return null;
  }
  // Normalize to 15 digits for DB compatibility
  const normalizedImei = (imei.length === 16 && imei.startsWith('0')) ? imei.substring(1) : imei;

  // Count number is always last field
  const countNumber = fields[fields.length - 1] || '';

  // ── Heartbeat: needs ACK, no GPS data ──
  if (messageType === 'GTHBD') {
    return {
      imei: normalizedImei,
      messageType,
      protocolVersion,
      records: [],
      needsAck: true,
      ackResponse: `+SACK:GTHBD,${protocolVersion},${countNumber}$`,
      raw: trimmed,
    };
  }

  // ── Position messages ──
  const isPanic = PANIC_TYPES.has(messageType);
  const isSpeed = SPEED_TYPES.has(messageType);
  const isTow   = TOW_TYPES.has(messageType);
  const isIgn   = IGN_TYPES.has(messageType);

  const gps = findGpsBlock(fields);
  if (!gps) {
    // Non-position message (GTINF, GTVER, etc.) — log but don't produce records
    return {
      imei: normalizedImei,
      messageType,
      protocolVersion,
      records: [],
      needsAck: false,
      ackResponse: null,
      raw: trimmed,
    };
  }

  // Build IO map with Queclink-specific data
  const io: Record<number, number | bigint> = {};

  // Priority mapping
  let priority = 0;
  if (isPanic) priority = 2;        // SOS = panic priority
  else if (isSpeed) priority = 1;   // speed alarm = high
  else if (isTow) priority = 1;     // tow alarm = high

  // eventIoId: mimic Teltonika convention for downstream compatibility
  let eventIoId = 0;
  if (isPanic) eventIoId = 1;       // DIN1-equivalent for SOS

  const record: AVLRecord = {
    timestamp:  gps.timestamp,
    priority,
    latitude:   gps.latitude,
    longitude:  gps.longitude,
    altitude:   gps.altitude,
    angle:      gps.azimuth,
    satellites: gps.accuracy,
    speed:      gps.speed,
    io,
    eventIoId,
    isPanic,
  };

  return {
    imei: normalizedImei,
    messageType,
    protocolVersion,
    records: [record],
    needsAck: false,
    ackResponse: null,
    raw: trimmed,
  };
}

/**
 * Extract complete Queclink messages from a buffer string.
 * Messages are delimited by '$'. Returns parsed messages and any leftover (incomplete) data.
 */
export function parseQueclinkBuffer(buffer: string): {
  messages: QueclinkParsed[];
  remainder: string;
} {
  const messages: QueclinkParsed[] = [];
  let remainder = '';

  const parts = buffer.split('$');

  // Last part is either empty (if buffer ended with $) or an incomplete message
  remainder = parts.pop() || '';

  for (const part of parts) {
    const raw = part.trim() + '$';
    if (raw.length < 10) continue; // too short

    try {
      const parsed = parseSingleMessage(raw);
      if (parsed) {
        messages.push(parsed);
      }
    } catch (err) {
      logger.warn(`[Queclink] Error parsing message: ${raw.substring(0, 80)}`, err);
    }
  }

  return { messages, remainder };
}

/**
 * Detect if a buffer starts with a Queclink message.
 * Queclink messages always start with '+RESP:' or '+BUFF:'.
 */
export function isQueclinkData(buf: Buffer): boolean {
  if (buf.length < 6) return false;
  const head = buf.subarray(0, 6).toString('ascii');
  return head.startsWith('+RESP:') || head.startsWith('+BUFF:');
}

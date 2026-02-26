/**
 * SilentEye — Plataforma de Seguridad Vehicular
 * Copyright (c) 2026 Christian Fiesco. All rights reserved.
 * PROPRIETARY AND CONFIDENTIAL — See LICENSE file for details.
 *
 * Concox/GT06 GPS Parser — GT06N, WeTrack2, GV20, JM-VL, Sinotrack, Coban
 * Binary protocol: 0x7878 (short) / 0x7979 (long) start bytes.
 * Normalizes output to AVLRecord for unified downstream processing.
 */

import type { AVLRecord } from './avl-decoder.js';
import { logger } from '../utils/logger.js';

/* ── CRC-ITU lookup table ── */
const CRC_TBL: number[] = [];
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) c = c & 1 ? (c >> 1) ^ 0x8408 : c >> 1;
  CRC_TBL[i] = c;
}
function crcItu(buf: Buffer, start: number, end: number): number {
  let crc = 0xFFFF;
  for (let i = start; i < end; i++) crc = (crc >> 8) ^ CRC_TBL[(crc ^ buf[i]) & 0xFF];
  return crc ^ 0xFFFF;
}

/* ── Alarm type constants ── */
const ALARM_SOS       = 0x01;
const ALARM_POWER_CUT = 0x02;
const ALARM_VIBRATION = 0x03;
const ALARM_FENCE_IN  = 0x04;
const ALARM_FENCE_OUT = 0x05;
const ALARM_OVERSPEED = 0x06;

const ALARM_NAMES: Record<number, string> = {
  [ALARM_SOS]: 'sos', [ALARM_POWER_CUT]: 'power_cut', [ALARM_VIBRATION]: 'vibration',
  [ALARM_FENCE_IN]: 'geofence_enter', [ALARM_FENCE_OUT]: 'geofence_exit', [ALARM_OVERSPEED]: 'overspeed',
};

/* ── Protocol numbers ── */
const PROTO_LOGIN     = 0x01;
const PROTO_LOCATION  = 0x12;
const PROTO_STATUS    = 0x13;
const PROTO_ALARM     = 0x16;
const PROTO_LOCATION2 = 0x22;
const PROTO_HEARTBEAT = 0x23;
const PROTO_ALARM2    = 0x26;

/* ── Exported types ── */
export interface ConcoxParsed {
  protocolNumber: number;
  imei: string | null;
  records: AVLRecord[];
  alarmType: number;
  alarmName: string | null;
  needsAck: boolean;
  ackData: Buffer | null;
  serial: number;
}

/* ── Detect GT06 start bytes ── */
export function isConcoxData(buf: Buffer): boolean {
  if (buf.length < 2) return false;
  return (buf[0] === 0x78 && buf[1] === 0x78) || (buf[0] === 0x79 && buf[1] === 0x79);
}

/* ── Build server response packet ── */
function buildAck(proto: number, serialHi: number, serialLo: number): Buffer {
  const pkt = Buffer.alloc(10);
  pkt[0] = 0x78; pkt[1] = 0x78;
  pkt[2] = 0x05; // length: proto(1)+serial(2)+crc(2)
  pkt[3] = proto;
  pkt[4] = serialHi; pkt[5] = serialLo;
  const crc = crcItu(pkt, 2, 6);
  pkt.writeUInt16BE(crc, 6);
  pkt[8] = 0x0D; pkt[9] = 0x0A;
  return pkt;
}

/* ── BCD decode (8 bytes → 15-digit IMEI) ── */
function decodeBcdImei(buf: Buffer, offset: number): string | null {
  let imei = '';
  for (let i = 0; i < 8; i++) {
    imei += ((buf[offset + i] >> 4) & 0x0F).toString();
    imei += (buf[offset + i] & 0x0F).toString();
  }
  if (imei.startsWith('0') && imei.length === 16) imei = imei.substring(1);
  return /^\d{15}$/.test(imei) ? imei : null;
}

/* ── Parse GPS data block (18 bytes starting at offset) ── */
function parseGpsBlock(buf: Buffer, off: number): AVLRecord | null {
  if (off + 18 > buf.length) return null;

  const year = 2000 + buf[off]; const month = buf[off + 1] - 1;
  const day = buf[off + 2]; const hour = buf[off + 3];
  const minute = buf[off + 4]; const second = buf[off + 5];
  const timestamp = Date.UTC(year, month, day, hour, minute, second);

  const satellites = buf[off + 6] & 0x0F;
  let latitude  = buf.readUInt32BE(off + 7) / 1800000;
  let longitude = buf.readUInt32BE(off + 11) / 1800000;
  const speed   = buf[off + 15];
  const courseWord = buf.readUInt16BE(off + 16);

  const isNorth = (courseWord >> 10) & 1;
  const isWest  = (courseWord >> 11) & 1;
  const angle   = courseWord & 0x03FF;

  if (!isNorth) latitude  = -latitude;
  if (isWest)   longitude = -longitude;

  return {
    timestamp, priority: 0, latitude, longitude,
    altitude: 0, angle, satellites, speed,
    io: {}, eventIoId: 0, isPanic: false,
  };
}

/* ── Extract complete packets from buffer ── */
export function extractConcoxPackets(buffer: Buffer): { packets: Buffer[]; remainder: Buffer } {
  const packets: Buffer[] = [];
  let off = 0;

  while (off + 5 <= buffer.length) {
    if (buffer[off] === 0x78 && buffer[off + 1] === 0x78) {
      if (off + 3 > buffer.length) break;
      const L = buffer[off + 2];
      const total = L + 5; // start(2)+len(1)+L+stop(2)
      if (off + total > buffer.length) break;
      if (buffer[off + total - 2] === 0x0D && buffer[off + total - 1] === 0x0A) {
        packets.push(buffer.subarray(off, off + total));
        off += total;
      } else { off++; }
    } else if (buffer[off] === 0x79 && buffer[off + 1] === 0x79) {
      if (off + 4 > buffer.length) break;
      const L = buffer.readUInt16BE(off + 2);
      const total = L + 6; // start(2)+len(2)+L+stop(2)
      if (off + total > buffer.length) break;
      if (buffer[off + total - 2] === 0x0D && buffer[off + total - 1] === 0x0A) {
        packets.push(buffer.subarray(off, off + total));
        off += total;
      } else { off++; }
    } else { off++; }
  }

  return { packets, remainder: buffer.subarray(off) };
}

/* ── Parse a single GT06 packet ── */
export function parseConcoxPacket(raw: Buffer): ConcoxParsed | null {
  const isLong = raw[0] === 0x79;
  const lenSize = isLong ? 2 : 1;
  const L = isLong ? raw.readUInt16BE(2) : raw[2];
  const hdrSize = 2 + lenSize; // start + length bytes

  // Protocol byte is right after header
  const proto = raw[hdrSize];

  // Serial: 2 bytes before CRC; CRC: 2 bytes before stop
  // Payload = raw[hdrSize .. hdrSize+L-1] (L bytes: proto+data+serial+crc)
  const serialOff = hdrSize + L - 4;
  const serialHi = raw[serialOff];
  const serialLo = raw[serialOff + 1];
  const serial = (serialHi << 8) | serialLo;

  // Data between protocol and serial
  const dataStart = hdrSize + 1;
  const dataEnd = serialOff;
  const data = raw.subarray(dataStart, dataEnd);

  // CRC check (over length bytes through serial, inclusive)
  const crcReceived = raw.readUInt16BE(hdrSize + L - 2);
  const crcCalc = crcItu(raw, 2, hdrSize + L - 2);
  if (crcReceived !== crcCalc) {
    logger.debug(`[GT06] CRC mismatch: recv=0x${crcReceived.toString(16)} calc=0x${crcCalc.toString(16)} proto=0x${proto.toString(16)}`);
  }

  const result: ConcoxParsed = {
    protocolNumber: proto, imei: null, records: [], alarmType: 0,
    alarmName: null, needsAck: false, ackData: null, serial,
  };

  // ── Login ──
  if (proto === PROTO_LOGIN) {
    result.imei = decodeBcdImei(data, 0);
    result.needsAck = true;
    result.ackData = buildAck(PROTO_LOGIN, serialHi, serialLo);
    return result;
  }

  // ── Location / Location2 ──
  if (proto === PROTO_LOCATION || proto === PROTO_LOCATION2) {
    const rec = parseGpsBlock(data, 0);
    if (rec) result.records.push(rec);
    return result;
  }

  // ── Alarm ──
  if (proto === PROTO_ALARM || proto === PROTO_ALARM2) {
    const rec = parseGpsBlock(data, 0);
    if (rec) {
      // Alarm byte is typically at data[data.length - 2] (before language byte)
      let alarm = 0;
      if (data.length >= 20) alarm = data[data.length - 2];
      // Fallback: try other common positions
      if (alarm === 0 && data.length >= 25) alarm = data[24];

      result.alarmType = alarm;
      result.alarmName = ALARM_NAMES[alarm] || null;

      if (alarm === ALARM_SOS) {
        rec.isPanic = true; rec.priority = 2; rec.eventIoId = 1;
      } else if (alarm > 0) {
        rec.priority = 1;
      }
      result.records.push(rec);
    }
    result.needsAck = true;
    result.ackData = buildAck(proto, serialHi, serialLo);
    return result;
  }

  // ── Heartbeat / Status ──
  if (proto === PROTO_HEARTBEAT || proto === PROTO_STATUS) {
    result.needsAck = true;
    result.ackData = buildAck(proto, serialHi, serialLo);
    return result;
  }

  // Unknown protocol — log and ignore
  logger.debug(`[GT06] Unknown protocol 0x${proto.toString(16)}, len=${L}`);
  return result;
}

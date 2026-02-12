/**
 * Decodificador AVL Teltonika - Codec 8 y Codec 8 Extended
 * Especificación: https://wiki.teltonika-gps.com/view/Teltonika_AVL_Protocols
 */

import { crc16 } from './crc16.js';

const CODEC_8 = 0x08;
const CODEC_8E = 0x8e;
const DIN1_AVL_ID = 1;
const DIN1_AVL_ID_EXT = 0x0001;

export interface AVLRecord {
  timestamp: number;
  priority: number;
  latitude: number;
  longitude: number;
  altitude: number;
  angle: number;
  satellites: number;
  speed: number;
  io: Record<number, number | bigint>;
  eventIoId: number;
  isPanic: boolean;
}

export interface AVLPacket {
  codecId: number;
  recordCount: number;
  records: AVLRecord[];
  valid: boolean;
}

function toSigned32(val: number): number {
  return val > 0x7FFFFFFF ? val - 0x100000000 : val;
}

function decodeGpsCoord(val: number): number {
  const signed = toSigned32(val);
  return signed / 10000000;
}

function parseIoElementCodec8(data: Buffer, offset: number): { io: Record<number, number | bigint>; eventIoId: number; newOffset: number } {
  const io: Record<number, number | bigint> = {};
  const eventIoId = data.readUInt8(offset);
  offset += 1;

  const total = data.readUInt8(offset);
  offset += 1;

  const n1 = data.readUInt8(offset);
  offset += 1;

  for (let i = 0; i < n1; i++) {
    const id = data.readUInt8(offset);
    offset += 1;
    io[id] = data.readUInt8(offset);
    offset += 1;
  }

  const n2 = data.readUInt8(offset);
  offset += 1;

  for (let i = 0; i < n2; i++) {
    const id = data.readUInt8(offset);
    offset += 1;
    io[id] = data.readUInt16BE(offset);
    offset += 2;
  }

  const n4 = data.readUInt8(offset);
  offset += 1;

  for (let i = 0; i < n4; i++) {
    const id = data.readUInt8(offset);
    offset += 1;
    io[id] = data.readUInt32BE(offset);
    offset += 4;
  }

  const n8 = data.readUInt8(offset);
  offset += 1;

  for (let i = 0; i < n8; i++) {
    const id = data.readUInt8(offset);
    offset += 1;
    io[id] = data.readBigUInt64BE(offset);
    offset += 8;
  }

  return { io, eventIoId, newOffset: offset };
}

function parseIoElementCodec8E(data: Buffer, offset: number): { io: Record<number, number | bigint>; eventIoId: number; newOffset: number } {
  const io: Record<number, number | bigint> = {};
  const eventIoId = data.readUInt16BE(offset);
  offset += 2;

  const total = data.readUInt16BE(offset);
  offset += 2;

  const n1 = data.readUInt16BE(offset);
  offset += 2;

  for (let i = 0; i < n1; i++) {
    const id = data.readUInt16BE(offset);
    offset += 2;
    io[id] = data.readUInt8(offset);
    offset += 1;
  }

  const n2 = data.readUInt16BE(offset);
  offset += 2;

  for (let i = 0; i < n2; i++) {
    const id = data.readUInt16BE(offset);
    offset += 2;
    io[id] = data.readUInt16BE(offset);
    offset += 2;
  }

  const n4 = data.readUInt16BE(offset);
  offset += 2;

  for (let i = 0; i < n4; i++) {
    const id = data.readUInt16BE(offset);
    offset += 2;
    io[id] = data.readUInt32BE(offset);
    offset += 4;
  }

  const n8 = data.readUInt16BE(offset);
  offset += 2;

  for (let i = 0; i < n8; i++) {
    const id = data.readUInt16BE(offset);
    offset += 2;
    io[id] = data.readBigUInt64BE(offset);
    offset += 8;
  }

  const nx = data.readUInt16BE(offset);
  offset += 2;

  for (let i = 0; i < nx; i++) {
    const id = data.readUInt16BE(offset);
    offset += 2;
    const len = data.readUInt16BE(offset);
    offset += 2;
    if (len === 1) io[id] = data.readUInt8(offset);
    else if (len === 2) io[id] = data.readUInt16BE(offset);
    else if (len === 4) io[id] = data.readUInt32BE(offset);
    else if (len === 8) io[id] = data.readBigUInt64BE(offset);
    offset += len;
  }

  return { io, eventIoId, newOffset: offset };
}

function parseAvlRecord(data: Buffer, offset: number, codec8e: boolean): { record: AVLRecord; newOffset: number } | null {
  if (offset + 24 > data.length) return null;

  const timestamp = Number(data.readBigUInt64BE(offset));
  offset += 8;
  const priority = data.readUInt8(offset);
  offset += 1;

  const longitude = decodeGpsCoord(data.readInt32BE(offset));
  offset += 4;
  const latitude = decodeGpsCoord(data.readInt32BE(offset));
  offset += 4;
  const altitude = data.readInt16BE(offset);
  offset += 2;
  const angle = data.readUInt16BE(offset);
  offset += 2;
  const satellites = data.readUInt8(offset);
  offset += 1;
  const speed = data.readUInt16BE(offset);
  offset += 2;

  const { io, eventIoId, newOffset } = codec8e
    ? parseIoElementCodec8E(data, offset)
    : parseIoElementCodec8(data, offset);

  const din1 = io[DIN1_AVL_ID] ?? io[DIN1_AVL_ID_EXT];
  const din1Value = typeof din1 === 'bigint' ? Number(din1) : (din1 as number);
  // Panic: priority=2 (Teltonika panic), eventIoId=1 (DIN1 change event), or DIN1=1 (High Level)
  const isPanic = priority === 2 || eventIoId === DIN1_AVL_ID || eventIoId === DIN1_AVL_ID_EXT || din1Value === 1;

  return {
    record: {
      timestamp,
      priority,
      latitude,
      longitude,
      altitude,
      angle,
      satellites,
      speed,
      io,
      eventIoId,
      isPanic,
    },
    newOffset,
  };
}

export function decodeAvlPacket(buffer: Buffer): AVLPacket | null {
  if (buffer.length < 18) return null;

  const preamble = buffer.readUInt32BE(0);
  if (preamble !== 0) return null;
  const dataFieldLength = buffer.readUInt32BE(4);
  if (buffer.length < 8 + dataFieldLength + 4) return null;
  const codecId = buffer.readUInt8(8);
  const recordCount = buffer.readUInt8(9);

  if (codecId !== CODEC_8 && codecId !== CODEC_8E) {
    return null;
  }

  const codec8e = codecId === CODEC_8E;
  const dataStart = 10;
  const numData2Offset = 8 + dataFieldLength - 1;
  const numData2 = buffer.readUInt8(numData2Offset);
  const receivedCrc = buffer.readUInt16BE(8 + dataFieldLength + 2);

  const crcBuffer = buffer.subarray(8, 8 + dataFieldLength);
  const calculatedCrc = crc16(crcBuffer);

  if (calculatedCrc !== receivedCrc || recordCount !== numData2) {
    return { codecId, recordCount, records: [], valid: false };
  }

  const records: AVLRecord[] = [];
  let offset = dataStart;

  for (let i = 0; i < recordCount; i++) {
    const result = parseAvlRecord(buffer, offset, codec8e);
    if (!result) break;
    records.push(result.record);
    offset = result.newOffset;
  }

  return {
    codecId,
    recordCount,
    records,
    valid: records.length === recordCount,
  };
}

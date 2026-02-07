#!/usr/bin/env node
/**
 * Simulador GPS Teltonika para pruebas locales.
 * Simula un dispositivo FMB920 enviando datos AVL por TCP (Codec 8).
 * Uso: npm run start
 * Variables: TCP_HOST, TCP_PORT, IMEI, PANIC (1 para simular pánico)
 */

import net from 'net';
import { crc16 } from './crc16.js';

const HOST = process.env.TCP_HOST || 'localhost';
const PORT = parseInt(process.env.TCP_PORT || '5000', 10);
const IMEI = process.env.IMEI || '356307042441013';
const SIMULATE_PANIC = process.env.PANIC === '1';

function encodeCoord(deg: number): number {
  return Math.round(deg * 10000000);
}

function buildCodec8AvlRecord(r: { timestamp: number; lat: number; lng: number; speed: number; din1: number; priority: number }): Buffer {
  const chunks: Buffer[] = [];

  chunks.push(Buffer.alloc(8));
  chunks[0].writeBigUInt64BE(BigInt(r.timestamp), 0);

  chunks.push(Buffer.alloc(1));
  chunks[1].writeUInt8(r.priority, 0);

  chunks.push(Buffer.alloc(4));
  chunks[2].writeInt32BE(encodeCoord(r.lng), 0);
  chunks.push(Buffer.alloc(4));
  chunks[3].writeInt32BE(encodeCoord(r.lat), 0);
  chunks.push(Buffer.alloc(2)); // altitude
  chunks.push(Buffer.alloc(2)); // angle
  chunks.push(Buffer.from([5])); // satellites
  chunks.push(Buffer.alloc(2)); // speed
  chunks[7].writeUInt16BE(r.speed, 0);

  const eventIoId = r.din1 ? 0x01 : 0;
  const n1 = 2;
  const n2 = 1;
  const n4 = 0;
  const n8 = 0;
  const io = Buffer.alloc(1 + 1 + 1 + n1 * 2 + 1 + n2 * 3 + 1 + 1);
  let o = 0;
  io.writeUInt8(eventIoId, o++);
  io.writeUInt8(n1 + n2 + n4 + n8, o++);
  io.writeUInt8(n1, o++);
  io.writeUInt8(0x0f, o++);
  io.writeUInt8(3, o++);
  io.writeUInt8(0x01, o++);
  io.writeUInt8(r.din1, o++);
  io.writeUInt8(n2, o++);
  io.writeUInt8(0x2a, o++);
  io.writeUInt16BE(0x5e10, o);
  o += 2;
  io.writeUInt8(n4, o++);
  io.writeUInt8(n8, o++);

  chunks.push(io);
  return Buffer.concat(chunks);
}

function buildAvlPacket(records: Array<{ timestamp: number; lat: number; lng: number; speed: number; din1: number; priority: number }>): Buffer {
  const codecId = 0x08;
  const recordCount = records.length;
  const avlData = Buffer.concat(records.map(buildCodec8AvlRecord));
  const dataFieldLength = 1 + 1 + avlData.length + 1;
  const num2 = Buffer.alloc(1);
  num2.writeUInt8(recordCount, 0);
  const toCrc = Buffer.concat([
    Buffer.from([codecId, recordCount]),
    avlData,
    num2,
  ]);
  const crc = crc16(toCrc);
  const header = Buffer.alloc(8);
  header.writeUInt32BE(0, 0);
  header.writeUInt32BE(dataFieldLength, 4);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt16BE(crc, 2);
  return Buffer.concat([header, toCrc, crcBuf]);
}

const socket = net.createConnection({ host: HOST, port: PORT }, () => {
  console.log(`Conectado a ${HOST}:${PORT}`);

  const imeiBuf = Buffer.from(IMEI, 'ascii');
  const lenBuf = Buffer.alloc(2);
  lenBuf.writeUInt16BE(imeiBuf.length, 0);
  socket.write(Buffer.concat([lenBuf, imeiBuf]));
  console.log(`IMEI enviado: ${IMEI}`);
});

let ackReceived = false;

socket.on('data', (data: Buffer) => {
  if (!ackReceived && data.length >= 1) {
    ackReceived = true;
    if (data[0] === 0x01) {
      console.log('ACK recibido - IMEI aceptado');
      sendAvlPacket(SIMULATE_PANIC);
      setInterval(() => sendAvlPacket(SIMULATE_PANIC), SIMULATE_PANIC ? 1500 : 30000);
    } else {
      console.log('ACK rechazado');
      socket.destroy();
    }
    return;
  }
  if (ackReceived && data.length >= 4) {
    const count = data.readUInt32BE(0);
    console.log(`Confirmación: ${count} registros recibidos`);
  }
});

socket.on('error', (err) => {
  console.error('Error:', err.message);
});

socket.on('close', () => {
  console.log('Conexión cerrada');
  process.exit(0);
});

let lat = -12.0464;
let lng = -77.0428;

function sendAvlPacket(panic: boolean) {
  lat += (Math.random() - 0.5) * 0.001;
  lng += (Math.random() - 0.5) * 0.001;

  const now = Date.now();
  const records = [
    {
      timestamp: now,
      lat,
      lng,
      speed: panic ? 0 : Math.floor(Math.random() * 60),
      din1: panic ? 1 : 0,
      priority: panic ? 2 : 0,
    },
  ];

  const packet = buildAvlPacket(records);
  socket.write(packet);
  console.log(
    `${new Date().toISOString()} Enviado: lat=${lat.toFixed(6)} lng=${lng.toFixed(6)} panic=${panic}`
  );
}

console.log(`
=== Simulador GPS Teltonika ===
Host: ${HOST}
Port: ${PORT}
IMEI: ${IMEI}
Modo pánico: ${SIMULATE_PANIC ? 'SÍ (cada 1.5s)' : 'NO (cada 30s)'}

Para simular pánico: PANIC=1 npm run start
`);

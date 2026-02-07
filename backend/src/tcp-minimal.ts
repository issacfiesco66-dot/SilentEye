#!/usr/bin/env node
/**
 * Servidor TCP mínimo para Teltonika FMB920
 * Solo handshake + recepción de paquetes AVL + logging.
 * Sin base de datos, sin lógica de negocio, sin rechazos.
 *
 * Uso: npx tsx src/tcp-minimal.ts
 * Puerto: TCP_PORT (default 5000)
 */

import net from 'net';
import fs from 'fs';
import path from 'path';

const PORT = parseInt(process.env.TCP_PORT || '5000', 10);
const LOG_FILE = process.env.TCP_MINIMAL_LOG || path.join(process.cwd(), 'teltonika-minimal.log');

type ConnectionState = 'imei' | 'avl';

interface Connection {
  imei: string | null;
  state: ConnectionState;
  buffer: Buffer;
}

function ensureLogFile() {
  const dir = path.dirname(LOG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(LOG_FILE)) fs.writeFileSync(LOG_FILE, '');
}

function log(msg: string) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}\n`;
  console.log(line.trim());
  try {
    fs.appendFileSync(LOG_FILE, line);
  } catch (e) {
    console.error('Error escribiendo en log:', e);
  }
}

const ACK_ACCEPT = Buffer.from([0x01]);

const server = net.createServer((socket) => {
  const addr = `${socket.remoteAddress}:${socket.remotePort}`;
  const conn: Connection = {
    imei: null,
    state: 'imei',
    buffer: Buffer.alloc(0),
  };

  log(`CONEXIÓN desde ${addr}`);

  socket.on('data', (data: Buffer) => {
    conn.buffer = Buffer.concat([conn.buffer, data]);

    if (conn.state === 'imei') {
      if (conn.buffer.length >= 2) {
        const imeiLength = conn.buffer.readUInt16BE(0);
        if (conn.buffer.length >= 2 + imeiLength) {
          const imei = conn.buffer.subarray(2, 2 + imeiLength).toString('ascii');
          conn.imei = imei;
          conn.state = 'avl';
          conn.buffer = conn.buffer.subarray(2 + imeiLength);
          socket.write(ACK_ACCEPT);
          log(`IMEI RECIBIDO desde ${addr} → ${imei}`);
        }
      }
    }

    if (conn.state === 'avl' && conn.imei) {
      while (conn.buffer.length >= 12) {
        const preamble = conn.buffer.readUInt32BE(0);
        if (preamble !== 0) {
          conn.buffer = conn.buffer.subarray(1);
          continue;
        }
        const dataFieldLength = conn.buffer.readUInt32BE(4);
        const packetLength = 8 + dataFieldLength + 4;

        if (conn.buffer.length < packetLength) break;

        const packetBuffer = conn.buffer.subarray(0, packetLength);
        conn.buffer = conn.buffer.subarray(packetLength);

        // El dispositivo espera 4 bytes con el número de registros recibidos
        const recordCount = packetBuffer.length >= 10 ? packetBuffer.readUInt8(9) : 1;
        const countBuf = Buffer.alloc(4);
        countBuf.writeUInt32BE(recordCount, 0);
        socket.write(countBuf);

        log(`AVL RECIBIDO | IP=${addr} | IMEI=${conn.imei} | Tamaño=${packetLength} bytes`);
      }
    }
  });

  socket.on('error', (err) => {
    log(`ERROR socket ${addr}: ${err.message}`);
  });

  socket.on('close', () => {
    log(`DESCONEXIÓN ${addr} (IMEI: ${conn.imei || 'n/a'})`);
  });
});

ensureLogFile();
server.listen(PORT, () => {
  log(`Servidor TCP mínimo Teltonika escuchando en puerto ${PORT}`);
  log(`Log escribiendo en: ${LOG_FILE}`);
  console.log(`\n--- Esperando conexiones en puerto ${PORT} ---\n`);
});

/**
 * Servidor TCP Teltonika - FMC920 / FMU920
 * Codec 8 y Codec 8 Extended
 * Compatible con Cloudflare Tunnel TCP
 */

import net from 'net';
import { parseAvlPacket } from './teltonika-parser.js';
import type { AVLRecord } from './teltonika-parser.js';
import { detectAlert } from './alert-detector.js';
import { pool } from '../db/pool.js';
import { logger } from '../utils/logger.js';
import { processGpsData, processPanicEvent } from '../services/gps-service.js';
import { processAlert } from '../services/alert-service.js';

const ACK_ACCEPT = Buffer.from([0x01]);
const ACK_REJECT = Buffer.from([0x00]);

const MAX_AVL_DATA_LENGTH = 512 * 1024; // 512 KB
const MAX_IMEI_LENGTH = 64;
const MAX_CONNECTION_BUFFER = 1024 * 1024; // 1 MB
const IMEI_LOGIN_TIMEOUT_MS = 30000;   // 30s para recibir IMEI
const AVL_IDLE_TIMEOUT_MS = 600000;    // 10 min sin datos AVL → desconectar

// Aceptar cualquier IMEI cuando TELTONIKA_SKIP_WHITELIST=true/1/yes (o no definido)
const _skip = (process.env.TELTONIKA_SKIP_WHITELIST || '').toLowerCase();
const SKIP_WHITELIST = _skip !== 'false' && _skip !== '0' && _skip !== 'no';

type ConnectionState = 'imei' | 'validating' | 'avl';

interface TeltonikaConnection {
  socket: net.Socket;
  imei: string | null;
  state: ConnectionState;
  buffer: Buffer;
  lastActivityAt: number;
  imeiReceivedAt: number | null;
}

function isValidImei(imei: string): boolean {
  return /^\d{15}$/.test(imei);
}

async function isImeiWhitelisted(imei: string): Promise<boolean> {
  if (SKIP_WHITELIST) return true;
  try {
    const r = await pool.query('SELECT 1 FROM vehicles WHERE imei = $1 LIMIT 1', [imei]);
    return r.rowCount !== null && r.rowCount > 0;
  } catch (err) {
    logger.warn('Error verificando whitelist IMEI, aceptando conexión:', err);
    return SKIP_WHITELIST;
  }
}

function sendAck(socket: net.Socket, accept: boolean): void {
  try {
    socket.write(accept ? ACK_ACCEPT : ACK_REJECT);
    logger.info(`ACK IMEI enviado: 0x${accept ? '01' : '00'} (${accept ? 'aceptar' : 'rechazar'})`);
  } catch (err) {
    logger.error('Error enviando ACK:', err);
  }
}

function sendRecordCount(socket: net.Socket, count: number): void {
  try {
    const buf = Buffer.alloc(4);
    buf.writeUInt32BE(count, 0);
    socket.write(buf);
    logger.debug(`ACK AVL enviado: ${count} registros`);
  } catch (err) {
    logger.error('Error enviando ACK de registros:', err);
  }
}

function logAvlRecord(imei: string, record: AVLRecord, index: number): void {
  const ts = new Date(record.timestamp).toISOString();
  const ign = record.io[78] ?? record.io[0x004E];
  const din1 = record.io[1] ?? record.io[0x0001];
  const ioKeys = Object.keys(record.io).map(k => `${k}=${record.io[Number(k)]}`).join(',');
  logger.info(
    `[AVL][${imei}][rec=${index}] ts=${ts} lat=${record.latitude.toFixed(5)} lng=${record.longitude.toFixed(5)} ` +
    `speed=${record.speed} sat=${record.satellites} priority=${record.priority} eventIoId=${record.eventIoId} ignition=${ign ?? '-'} din1=${din1 ?? '-'} isPanic=${record.isPanic} io={${ioKeys}}`
  );
}

export function createTeltonikaTcpServer(port: number, onData?: (imei: string, records: AVLRecord[]) => void): net.Server {
  const connections = new Map<net.Socket, TeltonikaConnection>();
  let imeiTimeoutCheck: ReturnType<typeof setInterval> | null = null;

  const server = net.createServer((socket) => {
    const conn: TeltonikaConnection = {
      socket,
      imei: null,
      state: 'imei',
      buffer: Buffer.alloc(0),
      lastActivityAt: Date.now(),
      imeiReceivedAt: null,
    };
    connections.set(socket, conn);

    const remoteAddr = socket.remoteAddress || 'unknown';
    const remotePort = socket.remotePort || 0;
    const addr = `${remoteAddr}:${remotePort}`;

    logger.info(`[GPS] TCP client connected | ${addr} | Configure device: Domain=silenteye-3rrwnq.fly.dev Port=5000`);

    socket.setKeepAlive(true, 30000);
    socket.setNoDelay(true);

    socket.on('data', (data: Buffer) => {
      logger.info(`TCP data received | ${addr} | ${data.length} bytes | hex=${data.subarray(0, Math.min(32, data.length)).toString('hex')}`);
      conn.lastActivityAt = Date.now();
      conn.buffer = Buffer.concat([conn.buffer, data]);

      if (conn.buffer.length > MAX_CONNECTION_BUFFER) {
        logger.warn(`[TCP][${addr}] Buffer excedido: ${conn.buffer.length} bytes, cerrando`);
        socket.destroy();
        return;
      }

      try {
        if (conn.state === 'validating') return;

        if (conn.state === 'imei') {
          if (conn.buffer.length >= 2) {
            const imeiLength = conn.buffer.readUInt16BE(0);
            if (imeiLength > MAX_IMEI_LENGTH || imeiLength < 1) {
              logger.warn(`[TCP][${addr}] IMEI length inválido: ${imeiLength}`);
              sendAck(socket, false);
              socket.destroy();
              return;
            }
            if (conn.buffer.length >= 2 + imeiLength) {
              const imei = conn.buffer.subarray(2, 2 + imeiLength).toString('ascii');
              logger.info(`[GPS] IMEI recibido: ${imei} | ${addr} | Device can send AVL data now`);

              if (!isValidImei(imei)) {
                logger.warn(`[TCP][${addr}] IMEI formato inválido: ${imei}`);
                sendAck(socket, false);
                socket.destroy();
                return;
              }

              conn.state = 'validating';
              const rest = conn.buffer.subarray(2 + imeiLength);
              conn.buffer = Buffer.alloc(0);

              isImeiWhitelisted(imei).then((whitelisted) => {
                if (!whitelisted) {
                  logger.warn(`[TCP][${addr}] IMEI no en whitelist: ${imei}`);
                  sendAck(socket, false);
                  socket.destroy();
                  return;
                }
                conn.imei = imei;
                conn.state = 'avl';
                conn.imeiReceivedAt = Date.now();
                conn.buffer = rest;
                sendAck(socket, true);
                logger.info(`[TCP][${addr}] ACK IMEI 0x01 enviado (handshake OK) | IMEI=${imei} | socket abierto para AVL`);
              }).catch((err) => {
                logger.warn(`[TCP] Error whitelist (aceptando conexión):`, err);
                conn.imei = imei;
                conn.state = 'avl';
                conn.imeiReceivedAt = Date.now();
                conn.buffer = rest;
                sendAck(socket, true);
                logger.info(`[TCP][${addr}] ACK IMEI 0x01 (DB error, conexión aceptada) | IMEI=${imei}`);
              });
            }
          }
        } else if (conn.state === 'avl' && conn.imei) {
          while (conn.buffer.length >= 12) {
            let preamble = conn.buffer.readUInt32BE(0);
            let skipBytes = 0;
            while (preamble !== 0 && conn.buffer.length >= 12 && skipBytes < 1024) {
              conn.buffer = conn.buffer.subarray(1);
              skipBytes++;
              preamble = conn.buffer.readUInt32BE(0);
            }
            if (skipBytes > 0 && preamble === 0) {
              logger.debug(`[TCP][${conn.imei}] Sincronizado: descartados ${skipBytes} bytes basura`);
            }
            if (preamble !== 0) break;

            const dataFieldLength = conn.buffer.readUInt32BE(4);
            if (dataFieldLength > MAX_AVL_DATA_LENGTH) {
              logger.warn(`[TCP][${conn.imei}] Paquete AVL tamaño anómalo: ${dataFieldLength} bytes`);
              conn.buffer = conn.buffer.subarray(1);
              continue;
            }
            const packetLength = 8 + dataFieldLength + 4;
            if (conn.buffer.length < packetLength) break;

            const packetBuffer = conn.buffer.subarray(0, packetLength);
            conn.buffer = conn.buffer.subarray(packetLength);

            const packet = parseAvlPacket(packetBuffer);
            if (!packet) {
              logger.warn(`[TCP][${conn.imei}] Paquete AVL inválido (parse error)`);
              sendRecordCount(socket, 0);
              continue;
            }
            if (!packet.valid) {
              logger.warn(`[TCP][${conn.imei}] Paquete AVL CRC/validación fallida (codec=${packet.codecId})`);
              sendRecordCount(socket, 0);
              continue;
            }
            if (packet.records.length === 0) {
              sendRecordCount(socket, 0);
              continue;
            }

            sendRecordCount(socket, packet.records.length);
            logger.info(`[TCP][${conn.imei}] AVL decodificado: ${packet.records.length} registros | codec=${packet.codecId === 0x8e ? '8E' : '8'}`);

            (async () => {
              try {
                for (let i = 0; i < packet.records.length; i++) {
                  const record = packet.records[i];
                  logAvlRecord(conn.imei!, record, i + 1);
                  try {
                    await processGpsData(conn.imei!, record);
                    if (record.isPanic) {
                      await processPanicEvent(conn.imei!, record);
                    }
                  } catch (err) {
                    logger.warn('[TCP] Error processGpsData (continuando con alertas):', err);
                  }
                  const alert = detectAlert(conn.imei!, record);
                  if (alert) {
                    logger.info(`[ALERT] Detectada: type=${alert.alertType} priority=${alert.priority} eventIoId=${alert.rawEventId}`);
                    processAlert(alert).catch((err) => logger.error('Error procesando alerta:', err));
                  } else if (record.priority >= 1 || record.eventIoId !== 0) {
                    logger.info(`[AVL] Sin alerta: priority=${record.priority} eventIoId=${record.eventIoId} io=${JSON.stringify(record.io)}`);
                  }
                }
                onData?.(conn.imei!, packet.records);
              } catch (err) {
                logger.error('[TCP] Error procesando datos GPS:', err);
              }
            })();
          }
        }
      } catch (err) {
        logger.error('[TCP] Error en handler data (no crasheamos):', err);
      }
    });

    socket.on('error', (err) => {
      logger.error(`[TCP][${addr}] Error socket: ${err.message}`);
    });

    socket.on('close', (hadError) => {
      connections.delete(socket);
      const idle = conn.imeiReceivedAt
        ? Math.round((Date.now() - conn.lastActivityAt) / 1000)
        : null;
      logger.info(`[TCP] Desconectado: ${addr} | IMEI=${conn.imei || '-'} | hadError=${hadError} | idleSec=${idle ?? '-'}`);
    });
  });

  // Timeout: si no llega IMEI en X segundos, log (la conexión puede seguir viva por Cloudflare)
  imeiTimeoutCheck = setInterval(() => {
    const now = Date.now();
    for (const [sock, c] of connections) {
      if (c.state === 'imei' && now - c.lastActivityAt > IMEI_LOGIN_TIMEOUT_MS) {
        logger.warn(`[TCP] Timeout IMEI: ${sock.remoteAddress}:${sock.remotePort} sin login en ${IMEI_LOGIN_TIMEOUT_MS / 1000}s`);
        sock.destroy();
      } else if (c.state === 'avl' && c.imei && now - c.lastActivityAt > AVL_IDLE_TIMEOUT_MS) {
        logger.warn(`[TCP] Timeout AVL: ${c.imei} sin datos en ${AVL_IDLE_TIMEOUT_MS / 1000}s`);
        sock.destroy();
      }
    }
  }, 15000);

  server.on('close', () => {
    if (imeiTimeoutCheck) clearInterval(imeiTimeoutCheck);
  });

  server.listen(port, '0.0.0.0', () => {
    logger.info(`[TCP] Servidor Teltonika escuchando en 0.0.0.0:${port} | accept_all_imei=${SKIP_WHITELIST}`);
  });

  return server;
}

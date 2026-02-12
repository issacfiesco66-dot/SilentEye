import './env.js';
import http from 'http';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createTeltonikaTcpServer } from './teltonika/tcp-server.js';
import { createWebSocketServer, getWebSocketClientCount } from './services/websocket.js';
import { api } from './api/routes.js';
import { startOtpCleanup } from './api/auth.js';
import { logger } from './utils/logger.js';

const TCP_PORT = parseInt(process.env.TCP_PORT || '5000', 10);
const TCP_PORT_ALT = process.env.TCP_PORT_ALT ? parseInt(process.env.TCP_PORT_ALT, 10) : null;
const TCP_PORT_ALT2 = process.env.TCP_PORT_ALT2 ? parseInt(process.env.TCP_PORT_ALT2, 10) : null;
// En Fly.io: PORT=8080 (un solo puerto para HTTP+WebSocket)
const HTTP_PORT = parseInt(process.env.PORT || process.env.HTTP_PORT || '3001', 10);
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '200', 10);

const app = express();

// Cloudflare: OBLIGATORIO antes de cualquier middleware (rate-limit, auth, etc.)
app.set('trust proxy', true);

// CORS: en producción solo dominios explícitos; nunca origin: true
const isProd = process.env.NODE_ENV === 'production';
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : [];
// Añadir vercel.app (incluye previews: silent-eye-frontend-xxx.vercel.app)
const allowOrigin = (origin: string) =>
  corsOrigins.includes(origin) || /^https:\/\/silent-eye-frontend(-[\w-]+)?\.vercel\.app$/.test(origin);
app.use(cors({
  origin: isProd
    ? (origin, cb) => {
        if (!origin) return cb(null, false);
        if (allowOrigin(origin)) return cb(null, true);
        return cb(null, false);
      }
    : true, // desarrollo: permitir cualquier origin
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
  preflightContinue: false,
}));

// Security headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(), microphone=()');
  if (isProd) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

app.use(express.json({ limit: '1mb' }));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: RATE_LIMIT_MAX,
    message: { error: 'Demasiadas peticiones' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'OPTIONS',
    keyGenerator: (req) => {
      // Cloudflare: usar CF-Connecting-IP o X-Forwarded-For si existe
      const cfIp = req.headers['cf-connecting-ip'];
      if (typeof cfIp === 'string') return cfIp;
      const forwarded = req.headers['x-forwarded-for'];
      if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
      return req.ip || req.socket?.remoteAddress || 'unknown';
    },
  })
);

app.use('/api', api);

app.get('/', (_req, res) => {
  res.json({
    service: 'SilentEye API',
    version: '1.0',
    docs: { health: '/health', api: '/api', websocket: '/ws' },
  });
});

app.get('/favicon.ico', (_req, res) => res.status(204).end());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'silenteye' });
});

app.get('/health/db', async (_req, res) => {
  try {
    const { pool } = await import('./db/pool.js');
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err: unknown) {
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      hint: 'Verifica DATABASE_URL en Fly Secrets y que las migraciones se ejecutaron.',
    });
  }
});

app.get('/health/ws', (_req, res) => {
  const { total, byRole } = getWebSocketClientCount();
  res.json({ status: 'ok', websocket: { clients: total, byRole } });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Error no capturado:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

createTeltonikaTcpServer(TCP_PORT);
if (TCP_PORT_ALT != null && TCP_PORT_ALT !== TCP_PORT) {
  createTeltonikaTcpServer(TCP_PORT_ALT);
  logger.info(`[TCP] Puerto alternativo: 0.0.0.0:${TCP_PORT_ALT} (para redes que bloquean ${TCP_PORT})`);
}
if (TCP_PORT_ALT2 != null && TCP_PORT_ALT2 !== TCP_PORT && TCP_PORT_ALT2 !== TCP_PORT_ALT) {
  createTeltonikaTcpServer(TCP_PORT_ALT2);
  logger.info(`[TCP] Puerto alto 15140 (estilo ngrok/Railway): 0.0.0.0:${TCP_PORT_ALT2}`);
}

const server = http.createServer(app);
createWebSocketServer(server);

server.listen(HTTP_PORT, '0.0.0.0', () => {
  logger.info(`API HTTP + WebSocket en 0.0.0.0:${HTTP_PORT} (path /ws)`);
  logger.info(`TCP Teltonika: 0.0.0.0:${TCP_PORT} | HTTP: ${HTTP_PORT}`);
  startOtpCleanup();
});

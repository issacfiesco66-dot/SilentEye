/**
 * SilentEye — Plataforma de Seguridad Vehicular
 * Copyright (c) 2026 Christian Fiesco. All rights reserved.
 * PROPRIETARY AND CONFIDENTIAL — See LICENSE file for details.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import './env.js';
import http from 'http';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { createTeltonikaTcpServer } from './gps/tcp-server.js';
import { createWebSocketServer, getWebSocketClientCount } from './services/websocket.js';
import { api } from './api/routes.js';
import { startOtpCleanup, startBlacklistCleanup, isStrictCookieAuth, isStripTokenFromBody } from './api/auth.js';
import { startTicketGc } from './services/ws-ticket-store.js';
import { logger } from './utils/logger.js';
import { initializeGEE } from './services/gee-service.js';

// ── Global crash guards ──
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION — shutting down:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  logger.error('UNHANDLED REJECTION (process kept alive):', reason);
});

// ── Hard-fail on missing critical secrets in production ──────────────
// Previously these fell back to empty strings or defaults, which let
// misconfigured deploys boot silently into an insecure state. A process
// that refuses to start is easier to notice than one that starts
// without auth enforcement.
if (process.env.NODE_ENV === 'production') {
  const critical: Record<string, string | undefined> = {
    JWT_SECRET: process.env.JWT_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
  };
  const missing = Object.entries(critical).filter(([, v]) => !v || v.length < 16).map(([k]) => k);
  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.error(`\n[BOOT] ❌ Missing or too-short critical secrets: ${missing.join(', ')}\n` +
                  `Set them in fly secrets (\`fly secrets set KEY=value\`) and redeploy.\n`);
    process.exit(1);
  }
  // Refuse to boot with known-leaked dev fallback secrets. The hash
  // below is the dev default that historically lived in .env — if it
  // ever ends up in prod, stop.
  const LEAKED_DEV_SECRET_HASHES = new Set([
    'f6ef784f3c61815e12e0380d96035e9d4a0b10cda21012fde196d36a8c449687',
  ]);
  if (LEAKED_DEV_SECRET_HASHES.has(process.env.JWT_SECRET || '')) {
    // eslint-disable-next-line no-console
    console.error('\n[BOOT] ❌ JWT_SECRET matches a known-leaked development value. Rotate it before starting.\n');
    process.exit(1);
  }
}

const TCP_PORT = parseInt(process.env.TCP_PORT || '5000', 10);
const TCP_PORT_ALT = process.env.TCP_PORT_ALT ? parseInt(process.env.TCP_PORT_ALT, 10) : null;
const TCP_PORT_ALT2 = process.env.TCP_PORT_ALT2 ? parseInt(process.env.TCP_PORT_ALT2, 10) : null;
// En Fly.io: PORT=8080 (un solo puerto para HTTP+WebSocket)
const HTTP_PORT = parseInt(process.env.PORT || process.env.HTTP_PORT || '3001', 10);
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '200', 10);

const app = express();

// Fly.io / Cloudflare: trust only the IMMEDIATE proxy (1 hop). Never use `true` — it trusts ALL X-Forwarded-For headers.
app.set('trust proxy', 1);

// CORS: en producción solo dominios explícitos; nunca origin: true.
//
// SECURITY: we removed the Vercel-preview regex that accepted any
// `silent-eye-frontend-*.vercel.app`. That pattern let a malicious
// Vercel preview deploy (from the same or a different Vercel account)
// send authenticated requests to our API with cookies, enabling CSRF
// against logged-in users. Now the allow-list is purely CORS_ORIGINS —
// every environment must be enumerated explicitly in fly secrets.
const isProd = process.env.NODE_ENV === 'production';
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : [];
const allowOrigin = (origin: string) => corsOrigins.includes(origin);
if (isProd && corsOrigins.length === 0) {
  // This is a hard error — with no whitelist the API refuses every
  // cross-origin request, effectively breaking the frontend. Fail fast
  // so the operator notices and sets CORS_ORIGINS.
  // eslint-disable-next-line no-console
  console.error('\n[BOOT] ❌ CORS_ORIGINS is empty in production. Set it to a comma-separated list of allowed frontend URLs.\n');
  process.exit(1);
}
app.use(cors({
  origin: isProd
    ? (origin, cb) => {
        if (!origin) return cb(null, false);
        if (allowOrigin(origin)) return cb(null, true);
        return cb(null, false);
      }
    : true, // desarrollo: permitir cualquier origin
  // credentials:true is required for the browser to send the HttpOnly auth
  // cookie cross-origin (frontend on vercel.app → backend on fly.dev).
  // Without this, fetch with credentials:'include' silently drops the cookie.
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  optionsSuccessStatus: 204,
  preflightContinue: false,
}));

// cookie-parser MUST run before any route that reads req.cookies. We don't
// pass a secret here because the JWT itself is the integrity proof — the
// cookie just transports the signed token.
app.use(cookieParser());

// Security headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(), microphone=()');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  if (isProd) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
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
  const { total } = getWebSocketClientCount();
  res.json({ status: 'ok', websocket: { clients: total } });
});

// ── Diagnostic endpoint — admin only ────────────────────────────────────────
// Returns a deep snapshot of the runtime so we can triage production issues
// without needing fly logs access. Protected by a shared-secret header that
// must match DIAG_TOKEN (set via `fly secrets set DIAG_TOKEN=<uuid>`).
//
// SECURITY: rate-limited to slow down any brute-force of DIAG_TOKEN. Five
// attempts per hour per IP is plenty for legitimate operators and brutal
// for attackers trying to guess a token.
const diagRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'too many requests' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const cfIp = req.headers['cf-connecting-ip'];
    if (typeof cfIp === 'string') return cfIp;
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
    return req.ip || req.socket?.remoteAddress || 'unknown';
  },
});
app.get('/health/diag', diagRateLimit, async (req, res) => {
  const expected = process.env.DIAG_TOKEN;
  const got = req.headers['x-diag-token'];
  if (!expected || got !== expected) {
    res.status(403).json({ error: 'forbidden' });
    return;
  }
  try {
    const { pool } = await import('./db/pool.js');
    const { getGeeDiagnostics } = await import('./services/gee-service.js');
    const { isStrictCookieAuth, isStripTokenFromBody } = await import('./api/auth.js');

    // Verify critical tables exist
    const tableCheck = await pool.query(`
      SELECT
        to_regclass('public.face_detections') AS face_detections,
        to_regclass('public.incident_media') AS incident_media,
        to_regclass('public.face_hidden_by') AS face_hidden_by,
        to_regclass('public.suspects') AS suspects,
        to_regclass('public.suspect_sightings') AS suspect_sightings,
        to_regclass('public.token_blacklist') AS token_blacklist,
        to_regclass('public.audit_log') AS audit_log,
        to_regclass('public.incidents') AS incidents,
        to_regclass('public.vehicles') AS vehicles,
        to_regclass('public.users') AS users
    `);
    const tables = tableCheck.rows[0] || {};

    // Row counts for the tables we actually care about
    const faceCount = await pool.query('SELECT COUNT(*) FROM face_detections');
    const mediaCount = await pool.query('SELECT COUNT(*) FROM incident_media');
    const incidentCount = await pool.query('SELECT COUNT(*) FROM incidents');

    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      auth: {
        strictCookie: isStrictCookieAuth(),
        stripBody: isStripTokenFromBody(),
      },
      gee: getGeeDiagnostics(),
      tables: {
        face_detections: !!tables.face_detections,
        incident_media: !!tables.incident_media,
        face_hidden_by: !!tables.face_hidden_by,
        suspects: !!tables.suspects,
        suspect_sightings: !!tables.suspect_sightings,
        token_blacklist: !!tables.token_blacklist,
        audit_log: !!tables.audit_log,
        incidents: !!tables.incidents,
        vehicles: !!tables.vehicles,
        users: !!tables.users,
      },
      counts: {
        face_detections: parseInt(faceCount.rows[0]?.count || '0', 10),
        incident_media: parseInt(mediaCount.rows[0]?.count || '0', 10),
        incidents: parseInt(incidentCount.rows[0]?.count || '0', 10),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error: msg });
  }
});

app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const user = (req as any).user as { userId?: string; role?: string } | undefined;
  const userStr = user ? `${user.userId}/${user.role}` : 'anon';
  const stack = err.stack ? err.stack.split('\n').slice(0, 6).join(' | ') : '(no stack)';
  logger.error(
    `[unhandled] ${req.method} ${req.path} user=${userStr} ` +
    `err=${err.name}:${err.message} stack=${stack}`
  );
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

server.listen(HTTP_PORT, '0.0.0.0', async () => {
  logger.info(`API HTTP + WebSocket en 0.0.0.0:${HTTP_PORT} (path /ws)`);
  logger.info(`TCP Teltonika: 0.0.0.0:${TCP_PORT} | HTTP: ${HTTP_PORT}`);
  // Auth flag diagnostics — these print every boot so we can confirm the
  // current security posture from logs without inspecting Fly secrets.
  const strict = isStrictCookieAuth();
  const stripBody = isStripTokenFromBody();
  if (strict && stripBody) {
    logger.info('[auth-mode] STRICT_COOKIE_AUTH=on, STRIP_TOKEN_FROM_BODY=on — cookie-only lockdown');
  } else if (strict) {
    logger.info('[auth-mode] STRICT_COOKIE_AUTH=on, STRIP_TOKEN_FROM_BODY=off — cookie-only HTTP, token still in login body');
  } else if (stripBody) {
    logger.warn('[auth-mode] STRICT_COOKIE_AUTH=off, STRIP_TOKEN_FROM_BODY=on — unusual combo, header still accepted');
  } else {
    logger.info('[auth-mode] dual mode: cookie + Authorization Bearer both accepted (default)');
  }
  // Auto-run migrations on startup (idempotent — uses IF NOT EXISTS)
  try {
    const { runMigrate } = await import('./db/run-migrate.js');
    const result = await runMigrate();
    logger.info(`Migraciones: ${result.message}`);
  } catch (err) {
    logger.warn('Auto-migrate error (non-fatal):', err);
  }
  // Defensive inline migration — if the incremental migration runner
  // failed to apply 022_face_hidden_by.sql (whatever the reason),
  // /api/faces/my would throw "relation does not exist" on every call
  // and the gallery would appear empty. We force-create the table here
  // so the endpoint cannot be held hostage by the runner.
  try {
    const { pool: dbPool } = await import('./db/pool.js');
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS face_hidden_by (
        face_id UUID NOT NULL REFERENCES face_detections(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        hidden_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        reason VARCHAR(64),
        PRIMARY KEY (face_id, user_id)
      );
      CREATE INDEX IF NOT EXISTS idx_face_hidden_by_user ON face_hidden_by(user_id);
    `);
    logger.info('[ensure] face_hidden_by table ready');
  } catch (err) {
    logger.warn('[ensure] face_hidden_by ensure failed (non-fatal):', err);
  }
  startOtpCleanup();
  startBlacklistCleanup();
  startTicketGc();
  startIncidentAutoTimeout();
  startBiometricRetention();
  // Fire and log — the function writes its own error details, this just
  // ensures the outer promise rejection doesn't get eaten silently.
  initializeGEE().catch((err) => {
    logger.error('[GEE] Top-level init rejection:', err);
  });
});

// Auto-resolve incidents stuck in 'active' or 'attending' for > 2 hours
const INCIDENT_TIMEOUT_MS = parseInt(process.env.INCIDENT_TIMEOUT_HOURS || '2', 10) * 3600 * 1000;
function startIncidentAutoTimeout() {
  setInterval(async () => {
    try {
      const { pool: dbPool } = await import('./db/pool.js');
      const cutoff = new Date(Date.now() - INCIDENT_TIMEOUT_MS);
      const r = await dbPool.query(
        `UPDATE incidents SET status = 'resolved', resolved_at = NOW(), updated_at = NOW()
         WHERE status IN ('active', 'attending', 'localizado') AND started_at < $1
         RETURNING id`,
        [cutoff]
      );
      if ((r.rowCount ?? 0) > 0) {
        logger.info(`Auto-timeout: ${r.rowCount} incidentes resueltos (> ${INCIDENT_TIMEOUT_MS / 3600000}h sin actividad)`);
      }
    } catch (err) {
      logger.warn('Incident auto-timeout error:', err);
    }
  }, 30 * 60 * 1000); // every 30 min
}

// Biometric data retention — purge faces & media older than N days.
// Runs once at boot (after a short delay) and then every 6 hours.
const BIOMETRIC_RETENTION_DAYS = parseInt(process.env.BIOMETRIC_RETENTION_DAYS || '90', 10);
function startBiometricRetention() {
  const run = async () => {
    try {
      const { pool: dbPool } = await import('./db/pool.js');
      const r = await dbPool.query(
        `SELECT * FROM purge_expired_biometric_data($1)`,
        [BIOMETRIC_RETENTION_DAYS]
      );
      const row = r.rows[0] || {};
      const media = row.media_deleted ?? 0;
      const faces = row.faces_deleted ?? 0;
      if (Number(media) > 0 || Number(faces) > 0) {
        logger.info(`Biometric retention: purged ${media} media rows + ${faces} face detections (> ${BIOMETRIC_RETENTION_DAYS}d)`);
      }
    } catch (err) {
      logger.warn('Biometric retention error:', err);
    }
  };
  // Delay initial run so migrations have time to register the function
  setTimeout(run, 60 * 1000);
  setInterval(run, 6 * 60 * 60 * 1000); // every 6 hours
}

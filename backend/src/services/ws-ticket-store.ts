/**
 * Single-use, short-lived ticket store for WebSocket handshakes.
 *
 * Why: the HttpOnly auth cookie cannot be read by JavaScript, so the
 * frontend cannot put the JWT into the WebSocket subprotocol or first
 * message. Instead, the frontend calls POST /api/auth/ws-ticket (which
 * authenticates via the cookie) and receives a ticket. It then opens
 * `wss://.../ws?ticket=<ticket>`. The server consumes the ticket atomically
 * during the upgrade.
 *
 * Why in-memory: we run with min_machines_running=1 on Fly.io, so a single
 * Node process services every WS connection. If we ever scale horizontally
 * this MUST be replaced with a Redis-backed store using GETDEL semantics.
 *
 * Single-use: the store deletes the ticket on read so a captured ticket
 * cannot be replayed.
 */

import { randomUUID } from 'crypto';
import { logger } from '../utils/logger.js';

interface TicketPayload {
  userId: string;
  role: string;
  createdAt: number;
  expiresAt: number;
}

const TICKET_TTL_MS = 30 * 1000; // 30 seconds — long enough for slow networks, short enough to be useless if leaked
const MAX_STORE_SIZE = 50_000;

const store = new Map<string, TicketPayload>();

/**
 * Create a single-use WS ticket for the given user. Returns the ticket
 * string. The ticket is consumed by `consumeTicket` during WS upgrade.
 */
export function issueTicket(userId: string, role: string): string {
  const ticket = randomUUID();
  const now = Date.now();
  store.set(ticket, {
    userId,
    role,
    createdAt: now,
    expiresAt: now + TICKET_TTL_MS,
  });

  // Garbage collect expired entries periodically to bound memory.
  if (store.size > MAX_STORE_SIZE) {
    const cutoff = now;
    let purged = 0;
    for (const [k, v] of store) {
      if (v.expiresAt < cutoff) {
        store.delete(k);
        purged++;
      }
    }
    logger.info(`[ws-ticket] gc purged ${purged} expired entries (size=${store.size})`);
  }

  return ticket;
}

/**
 * Atomically read AND delete a ticket (mimics Redis GETDEL). Returns the
 * payload if the ticket exists and is not expired; null otherwise. The
 * ticket is removed from the store regardless of whether it was valid,
 * so a single ticket can never be used twice.
 */
export function consumeTicket(ticket: string | undefined | null): TicketPayload | null {
  if (!ticket || typeof ticket !== 'string') return null;
  const payload = store.get(ticket);
  if (!payload) return null;
  store.delete(ticket); // GETDEL: single-use semantics
  if (Date.now() > payload.expiresAt) {
    logger.warn(`[ws-ticket] ticket expired (issued ${Math.round((Date.now() - payload.createdAt) / 1000)}s ago)`);
    return null;
  }
  return payload;
}

// Periodic cleanup so abandoned tickets don't accumulate forever.
let _gcStarted = false;
export function startTicketGc(): void {
  if (_gcStarted) return;
  _gcStarted = true;
  setInterval(() => {
    const cutoff = Date.now();
    let purged = 0;
    for (const [k, v] of store) {
      if (v.expiresAt < cutoff) {
        store.delete(k);
        purged++;
      }
    }
    if (purged > 0) {
      logger.info(`[ws-ticket] gc purged ${purged} expired (size=${store.size})`);
    }
  }, 5 * 60 * 1000); // every 5 min
}

// Test/diagnostic only — exposed for the /health endpoint
export function ticketStoreSize(): number {
  return store.size;
}

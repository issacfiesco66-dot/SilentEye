'use client';
/**
 * SilentEye — Plataforma de Seguridad Vehicular
 * Copyright (c) 2026 Christian Fiesco. All rights reserved.
 * PROPRIETARY AND CONFIDENTIAL — See LICENSE file for details.
 */

import { useEffect, useRef, useState } from 'react';
import { getSession } from '@/lib/session';

function getWebSocketUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_WS_URL;
  if (explicit) return explicit;
  const api = process.env.NEXT_PUBLIC_API_URL || '';
  if (api.startsWith('https://')) return api.replace('https://', 'wss://').replace(/\/?$/, '') + '/ws';
  if (api.startsWith('http://')) return api.replace('http://', 'ws://').replace(/\/?$/, '') + '/ws';
  return 'ws://localhost:3001/ws';
}

const WS_URL = getWebSocketUrl();

const MAX_RETRIES = 5;
const INITIAL_DELAY_MS = 1500;

export interface WebSocketMessage {
  type: string;
  payload: unknown;
}

export interface UseWebSocketOptions {
  /**
   * Legacy fallback: a JWT string for clients still using header-based
   * auth. When omitted, the hook uses the new ticket flow which relies on
   * the HttpOnly cookie. New code should NOT pass a token — leave this
   * undefined and rely on the cookie.
   */
  token?: string | null;
  onMessage?: (msg: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  enabled?: boolean;
}

/**
 * Fetch a single-use WebSocket ticket from the backend. Uses
 * credentials:'include' so the HttpOnly auth cookie is sent. Returns null
 * on failure (caller should fall back to legacy token-in-message auth if
 * a token is available).
 *
 * Diagnostic logging is intentionally verbose here because failures here
 * are how we detect iOS Safari ITP wiping our cookie.
 */
async function fetchWsTicket(): Promise<string | null> {
  try {
    // Dual-mode auth: send the cookie via credentials AND, for users who
    // still have a legacy token in localStorage (pre-cookie deploys), the
    // Authorization header as well. Either path will be accepted by the
    // backend's authMiddleware. After the migration window we can drop
    // the Bearer header entirely.
    const session = getSession();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.token) {
      headers.Authorization = `Bearer ${session.token}`;
    }
    const res = await fetch('/api/auth/ws-ticket', {
      method: 'POST',
      credentials: 'include',
      headers,
    });
    if (!res.ok) {
      // 401 here typically means the HttpOnly cookie was missing or
      // expired AND the legacy token (if any) was rejected. On iOS Safari
      // this is the canonical ITP signal — log it loudly so we can
      // correlate with reports of "had to log in again".
      // eslint-disable-next-line no-console
      console.warn(
        `[ws-ticket] HTTP ${res.status} — cookie+legacy token both rejected ` +
        `(ITP?). hasLegacy=${!!session?.token} ua=${navigator.userAgent.slice(0, 80)}`
      );
      return null;
    }
    const data: { ticket?: string } = await res.json();
    if (!data.ticket) {
      // eslint-disable-next-line no-console
      console.warn('[ws-ticket] response missing ticket field');
      return null;
    }
    return data.ticket;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[ws-ticket] network error:', err);
    return null;
  }
}

/**
 * Hook para WebSocket con reintentos automáticos.
 *
 * Auth flow (preferred): fetch a ws-ticket via the cookie-authenticated
 * endpoint, then connect to wss://.../ws?ticket=<ticket>. The ticket is
 * single-use and lives 30s. A new ticket is fetched on every (re)connect.
 *
 * Legacy fallback: if a `token` prop is supplied AND the ticket fetch
 * fails (e.g. cookie unavailable), the hook falls back to the old
 * {type:"auth", token} first-message handshake. This keeps existing
 * sessions alive during the migration.
 */
export function useWebSocket({ token, onMessage, onConnect, onDisconnect, enabled = true }: UseWebSocketOptions) {
  const [connected, setConnected] = useState(false);
  const retryCountRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const send = useRef((data: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }).current;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const connect = async () => {
      if (cancelled) return;

      // Always try ticket flow first — it works whenever the HttpOnly
      // cookie is present, which is the common case after login.
      const ticket = await fetchWsTicket();
      if (cancelled) return;

      // Build the URL. If we have a ticket, use the query-string flow.
      // Otherwise fall back to the legacy in-band auth (only possible
      // when the caller still has a JS-readable token).
      const url = ticket ? `${WS_URL}?ticket=${encodeURIComponent(ticket)}` : WS_URL;
      const usingTicket = !!ticket;

      if (!usingTicket && !token) {
        // No ticket and no legacy token — give up gracefully so we don't
        // spin the reconnect loop. The user is effectively logged out.
        // eslint-disable-next-line no-console
        console.warn('[ws] no auth available (no ticket, no legacy token)');
        return;
      }

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (usingTicket) {
          // Auth is already done by the upgrade — the server will send
          // {type:"auth_ok"} on its own. Nothing to send.
          return;
        }
        // Legacy fallback: send the JWT as the first message.
        if (token) {
          ws.send(JSON.stringify({ type: 'auth', token }));
        }
      };

      ws.onclose = (ev) => {
        setConnected(false);
        onDisconnect?.();
        wsRef.current = null;

        // 4001 from the server means "ticket invalid/consumed". Don't
        // retry blindly — the ticket can't be reused. Reconnect, which
        // will fetch a fresh ticket on the next iteration.
        if (ev?.code === 4001) {
          // eslint-disable-next-line no-console
          console.warn('[ws] closed by server: invalid ticket, will fetch a new one');
        }

        // Backoff retry — every retry fetches a fresh ticket, so a
        // ticket that expired between issue and use just gets replaced.
        if (retryCountRef.current < MAX_RETRIES) {
          const delay = INITIAL_DELAY_MS * Math.pow(2, retryCountRef.current);
          retryCountRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(() => { connect(); }, delay);
        }
      };

      ws.onerror = () => {}; // Evitar ruido en consola

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data) as WebSocketMessage;
          // auth_ok confirma que el servidor aceptó el ticket / token
          if (msg.type === 'auth_ok') {
            retryCountRef.current = 0;
            setConnected(true);
            onConnect?.();
            return;
          }
          onMessageRef.current?.(msg);
        } catch {
          // Ignorar mensajes malformados
        }
      };
    };

    connect();

    // Reconnect when app resumes from background (mobile app switch)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const ws = wsRef.current;
        if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
          retryCountRef.current = 0; // reset retries
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          connect();
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
      retryCountRef.current = MAX_RETRIES; // Evitar reintentos tras unmount
    };
  }, [token, enabled]);

  return { connected, send };
}

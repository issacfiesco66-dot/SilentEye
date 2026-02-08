'use client';

import { useEffect, useRef, useState } from 'react';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws';

const MAX_RETRIES = 5;
const INITIAL_DELAY_MS = 1500;

export interface WebSocketMessage {
  type: string;
  payload: unknown;
}

export interface UseWebSocketOptions {
  token: string | null;
  onMessage?: (msg: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  enabled?: boolean;
}

/**
 * Hook para WebSocket con reintentos automáticos.
 * Útil para Fly.io donde la máquina puede tardar en arrancar (cold start).
 */
export function useWebSocket({ token, onMessage, onConnect, onDisconnect, enabled = true }: UseWebSocketOptions) {
  const [connected, setConnected] = useState(false);
  const retryCountRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!enabled || !token) return;

    const connect = () => {
      const url = `${WS_URL}?token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        retryCountRef.current = 0;
        setConnected(true);
        onConnect?.();
      };

      ws.onclose = () => {
        setConnected(false);
        onDisconnect?.();
        wsRef.current = null;

        // Reintentar con backoff
        if (retryCountRef.current < MAX_RETRIES) {
          const delay = INITIAL_DELAY_MS * Math.pow(2, retryCountRef.current);
          retryCountRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        }
      };

      ws.onerror = () => {}; // Evitar ruido en consola

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data) as WebSocketMessage;
          onMessageRef.current?.(msg);
        } catch {
          // Ignorar mensajes malformados
        }
      };
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
      retryCountRef.current = MAX_RETRIES; // Evitar reintentos tras unmount
    };
  }, [token, enabled]);

  return { connected };
}

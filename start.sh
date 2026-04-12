#!/bin/sh
start_node() {
  CRASH_COUNT=0
  LAST_START=0
  while true; do
    LAST_START=$(date +%s)
    echo "[start.sh] Starting node dist/index.js (intento $((CRASH_COUNT + 1))) ..."
    node dist/index.js
    CODE=$?
    NOW=$(date +%s)
    UPTIME=$((NOW - LAST_START))
    echo "[start.sh] Node salió con código $CODE (uptime: ${UPTIME}s)"
    # Si corrió menos de 10s, cuenta como crash rápido
    if [ "$UPTIME" -lt 10 ]; then
      CRASH_COUNT=$((CRASH_COUNT + 1))
    else
      CRASH_COUNT=0
    fi
    if [ "$CRASH_COUNT" -ge 5 ]; then
      echo "[start.sh] ERROR: 5 crashes rápidos consecutivos. Abortando para evitar loop infinito."
      exit 1
    fi
    echo "[start.sh] Reiniciando en 2s ..."
    sleep 2
  done
}

start_node &
NODE_PID=$!

if [ -n "$NGROK_AUTHTOKEN" ]; then
  sleep 5
  echo "[start.sh] Starting ngrok tunnel ..."
  if [ -n "$NGROK_TCP_URL" ]; then
    ngrok tcp 5000 --url "$NGROK_TCP_URL" --log=stdout &
  else
    ngrok tcp 5000 --log=stdout &
  fi
  NGROK_PID=$!
  echo "[start.sh] ngrok started (PID $NGROK_PID) — node continues regardless"
fi

wait $NODE_PID

#!/bin/sh
start_node() {
  while true; do
    echo "[start.sh] Starting node dist/index.js ..."
    node dist/index.js
    CODE=$?
    echo "[start.sh] Node exited with code $CODE — restarting in 2s ..."
    sleep 2
  done
}

start_node &
NODE_PID=$!

if [ -n "$NGROK_AUTHTOKEN" ]; then
  sleep 5
  if [ -n "$NGROK_TCP_URL" ]; then
    exec ngrok tcp 5000 --url "$NGROK_TCP_URL" --log=stdout
  else
    exec ngrok tcp 5000 --log=stdout
  fi
else
  wait $NODE_PID
fi

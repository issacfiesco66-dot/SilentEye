#!/bin/sh
# Inicia Node (backend + TCP) en background, luego ngrok TCP hacia localhost:5000
# ngrok mantiene el contenedor vivo (foreground)
set -e
echo "[start] Iniciando backend..."
node dist/index.js &
echo "[start] Esperando que el servidor TCP esté listo..."
sleep 5
echo "[start] Iniciando ngrok tcp 5000..."
exec ngrok tcp 5000 --log=stdout

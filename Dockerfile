# SilentEye Backend - Fly.io (contexto: raíz del repo)
# Con ngrok para TCP GPS: flujo GPS -> ngrok cloud -> ngrok agent -> localhost:5000
FROM node:20-alpine

WORKDIR /app

# ngrok: descargar binario (para túnel TCP GPS en producción)
RUN apk add --no-cache curl && \
    curl -sSL -o /tmp/ngrok.tgz "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz" && \
    tar xzf /tmp/ngrok.tgz -C /usr/local/bin && rm /tmp/ngrok.tgz && \
    apk del curl

# Copiar solo backend e instalar dependencias
COPY backend/package.json ./
RUN npm install

# Copiar código del backend
COPY backend/ .

# Asegurar tipos para compilación
RUN npm install --save-dev @types/pg

# Compilar: usar TypeScript del proyecto (npx tsc puede instalar paquete equivocado)
RUN node ./node_modules/typescript/bin/tsc

# Copiar schemas SQL y migraciones a dist (para migraciones)
RUN cp src/db/schema.sql src/db/schema-simple.sql dist/db/ && \
    cp -r src/db/migrations dist/db/migrations

# Quitar devDependencies para imagen final
RUN npm prune --omit=dev

ENV NODE_ENV=production
ENV TCP_PORT=5000
ENV PORT=8080

EXPOSE 8080 5000

# Con NGROK_AUTHTOKEN: inicia Node en background + ngrok TCP 5000. Sin él: solo Node.
# NGROK_TCP_URL: opcional, ej. tcp://0.tcp.ngrok.io:12345 (dirección reservada en ngrok) para URL fija entre reinicios.
CMD ["sh", "-c", "if [ -n \"$NGROK_AUTHTOKEN\" ]; then node dist/index.js & sleep 5 && if [ -n \"$NGROK_TCP_URL\" ]; then exec ngrok tcp 5000 --url \"$NGROK_TCP_URL\" --log=stdout; else exec ngrok tcp 5000 --log=stdout; fi; else exec node dist/index.js; fi"]

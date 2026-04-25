# SilentEye Backend - Fly.io (contexto: raíz del repo)
# Con ngrok para TCP GPS: flujo GPS -> ngrok cloud -> ngrok agent -> localhost:5000
FROM node:20.11.1-alpine3.19

WORKDIR /app

# ngrok: descargar binario (para túnel TCP GPS en producción)
RUN apk add --no-cache curl && \
    curl -sSL -o /tmp/ngrok.tgz "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz" && \
    tar xzf /tmp/ngrok.tgz -C /usr/local/bin && rm /tmp/ngrok.tgz &&     apk del curl

# Reproducible install via monorepo lockfile. We copy only the manifests
# first to maximise layer caching, then run `npm ci --workspace backend`
# against the repo-root lockfile. This locks every dependency version and
# refuses to install anything not pinned in package-lock.json.
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
RUN npm ci --workspace backend --include-workspace-root=false

# Copiar código del backend dentro del workspace
COPY backend/ ./backend/

# Compilar TypeScript dentro del workspace
WORKDIR /app/backend
RUN node ../node_modules/typescript/bin/tsc

# Copiar schemas SQL y migraciones a dist (para migraciones)
RUN cp src/db/schema.sql src/db/schema-simple.sql dist/db/ && \
    cp -r src/db/migrations dist/db/migrations && \
    cp -r src/scripts/data dist/scripts/data

# Pinea solo runtime deps en la imagen final
WORKDIR /app
RUN npm prune --workspace backend --omit=dev
WORKDIR /app/backend

ENV NODE_ENV=production
ENV TCP_PORT=5000
ENV PORT=8080

# Wrapper: auto-restart node on crash + ngrok if configured
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Run as non-root user for security
RUN addgroup -S app && adduser -S app -G app
RUN chown -R app:app /app
USER app

EXPOSE 8080 5000

CMD ["sh", "/app/start.sh"]

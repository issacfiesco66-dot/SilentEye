# SilentEye Backend - Fly.io (alternativa si Fly usa Dockerfile por defecto)
# Para usar solo backend: fly.toml tiene dockerfile = "Dockerfile.backend"
FROM node:20-alpine

WORKDIR /app

# Monorepo: copiar package files y instalar
COPY package.json package-lock.json ./
RUN npm ci

# Copiar código
COPY . .

# Compilar solo backend (directamente desde raíz, evita script del backend)
RUN npx tsc -p backend

# Copiar schema a dist
RUN cp backend/src/db/schema.sql backend/dist/db/ && \
    cp backend/src/db/schema-simple.sql backend/dist/db/

# Limpiar y preparar para producción
RUN npm prune --omit=dev

ENV NODE_ENV=production
ENV TCP_PORT=5000
ENV PORT=8080

EXPOSE 8080 5000

# Ejecutar desde backend
WORKDIR /app/backend
CMD ["node", "dist/index.js"]

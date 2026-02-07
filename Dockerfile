# SilentEye Backend - Fly.io
FROM node:20-alpine

WORKDIR /app

# Copiar package files e instalar (incluye devDependencies para compilar)
COPY package.json package-lock.json ./
RUN npm ci

# Copiar código
COPY . .

# Compilar backend (con typescript en raíz, npm run encuentra tsc y módulos)
RUN npm run build -w backend

# Copiar schemas
RUN cp backend/src/db/schema.sql backend/dist/db/ && \
    cp backend/src/db/schema-simple.sql backend/dist/db/

# Quitar devDependencies
RUN npm prune --omit=dev

ENV NODE_ENV=production
ENV TCP_PORT=5000
ENV PORT=8080

EXPOSE 8080 5000

WORKDIR /app/backend
CMD ["node", "dist/index.js"]

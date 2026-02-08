# SilentEye Backend - Fly.io
# Build solo el backend en aislamiento (evita problemas del monorepo)
FROM node:20-alpine

WORKDIR /app

# Copiar solo backend e instalar sus dependencias (incluye TypeScript para compilar)
COPY backend/package.json ./
RUN npm install

# Copiar código del backend
COPY backend/ .

# Asegurar tipos para compilación (@types/pg y evitar errores de tipos)
RUN npm install --save-dev @types/pg

# Compilar: usar TypeScript del proyecto (npx tsc puede instalar paquete equivocado)
RUN node ./node_modules/typescript/bin/tsc

# Copiar schemas SQL a dist (para migraciones)
RUN cp src/db/schema.sql src/db/schema-simple.sql dist/db/

# Quitar devDependencies para imagen final
RUN npm prune --omit=dev

ENV NODE_ENV=production
ENV TCP_PORT=5000
ENV PORT=8080

EXPOSE 8080 5000

CMD ["node", "dist/index.js"]

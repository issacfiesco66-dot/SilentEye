# SilentEye Backend - para Railway/Fly.io
FROM node:20-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV TCP_PORT=5000
ENV HTTP_PORT=3001
ENV WS_PORT=3002

EXPOSE 5000 3001 3002

CMD ["node", "dist/index.js"]

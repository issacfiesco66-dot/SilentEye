# SilentEye

Plataforma de seguridad vehicular en tiempo real. Monitoreo GPS de flotas, botón de pánico ciudadano y red de apoyo con notificaciones instantáneas.

## Stack

| Capa | Tecnología |
|------|-----------|
| **Backend** | Node.js · Express · TypeScript · PostgreSQL + PostGIS |
| **Frontend** | Next.js 14 · React · Tailwind CSS · Leaflet/OpenStreetMap |
| **GPS** | Teltonika FMB920/FMC920 · Codec 8/8E · TCP |
| **Tiempo real** | WebSocket · Push Notifications (VAPID) |
| **Email** | Nodemailer · Gmail SMTP (OTP + notificaciones) |
| **PDF** | PDFKit (reportes de incidentes) |
| **Deploy** | Fly.io (backend) · Vercel (frontend) · GitHub Actions CI/CD |

## Estructura del proyecto

```
SilentEye/
├── backend/src/
│   ├── api/
│   │   ├── auth.ts              # OTP + JWT autenticación
│   │   └── routes.ts            # API REST completa
│   ├── db/
│   │   ├── pool.ts              # Conexión PostgreSQL
│   │   ├── schema.sql           # Schema PostGIS
│   │   ├── schema-simple.sql    # Schema Haversine (fallback)
│   │   ├── migrations/          # Migraciones incrementales (001–008)
│   │   ├── run-migrate.ts       # Lógica de migración (usado por API)
│   │   ├── run-seed.ts          # Datos iniciales (usado por API)
│   │   ├── migrate.ts           # CLI: npm run migrate
│   │   ├── seed.ts              # CLI: npm run seed
│   │   └── reset-keep-admin.ts  # CLI: limpiar DB conservando admins
│   ├── services/
│   │   ├── alert-service.ts     # Detección de alertas + notificación cercanos
│   │   ├── email-service.ts     # Emails: OTP, helper respondiendo, testigos
│   │   ├── gps-service.ts       # Procesamiento de datos GPS
│   │   ├── push-service.ts      # Push notifications (VAPID/web-push)
│   │   └── websocket.ts         # Broadcast tiempo real
│   ├── teltonika/
│   │   ├── tcp-server.ts        # Servidor TCP para GPS Teltonika
│   │   ├── avl-decoder.ts       # Decodificador Codec 8/8E
│   │   ├── alert-detector.ts    # Clasifica eventos AVL → alertas
│   │   └── crc16.ts             # Checksum CRC-16
│   ├── types/                   # Tipos TypeScript adicionales
│   ├── utils/logger.ts          # Winston logger
│   └── index.ts                 # Entry point (HTTP + TCP + WS)
├── frontend/
│   ├── app/
│   │   ├── page.tsx             # Landing page
│   │   ├── login/page.tsx       # Login (SOS/Conductor/Admin)
│   │   ├── dashboard/page.tsx   # Dashboard principal
│   │   ├── admin/page.tsx       # Panel de administración
│   │   └── sos/page.tsx         # Botón de pánico ciudadano
│   ├── components/
│   │   ├── LeafletMap.tsx       # Mapa OpenStreetMap
│   │   ├── MapView.tsx          # Wrapper del mapa
│   │   ├── admin/               # Componentes admin (8 archivos)
│   │   └── helper/              # Componentes helper/driver (6 archivos)
│   ├── hooks/
│   │   ├── useWebSocket.ts      # WebSocket con reconexión automática
│   │   └── usePushNotifications.ts  # Service worker + push
│   ├── utils/alarm.ts           # Audio de alerta para emergencias
│   └── public/                  # PWA icons + service worker
├── simulator/                   # Simulador GPS Teltonika (desarrollo)
├── Dockerfile                   # Build backend → Fly.io
├── fly.toml                     # Configuración Fly.io
└── .github/workflows/deploy.yml # CI/CD automático
```

## Inicio rápido

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp backend/.env.example backend/.env
# Editar backend/.env con tus valores

# 3. Ejecutar en desarrollo
npm run dev              # Backend + Frontend simultáneo
npm run dev:backend      # Solo backend (:3001)
npm run dev:frontend     # Solo frontend (:3000)
```

## Base de datos

```bash
npm run migrate          # Schema + migraciones incrementales
npm run seed             # Datos iniciales de prueba
```

En producción, las migraciones se ejecutan via API:
```
POST /api/setup/migrate  { "secret": "<MIGRATE_SECRET>" }
POST /api/setup/seed     { "secret": "<MIGRATE_SECRET>" }
```

## Deploy

```bash
flyctl deploy --remote-only   # Backend → Fly.io
npx vercel deploy --prod      # Frontend → Vercel
```

Push a `main` despliega automáticamente vía GitHub Actions.

## Variables de entorno

Ver [`backend/.env.example`](backend/.env.example) para referencia completa.

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `DATABASE_URL` | Sí | PostgreSQL connection string |
| `JWT_SECRET` | Sí | Secreto JWT (mín. 32 caracteres) |
| `SMTP_HOST` | Sí | Servidor SMTP (ej: `smtp.gmail.com`) |
| `SMTP_PORT` | Sí | Puerto SMTP (ej: `587`) |
| `SMTP_USER` | Sí | Email SMTP |
| `SMTP_PASS` | Sí | Contraseña de app SMTP |
| `SMTP_FROM` | Sí | Dirección remitente |
| `MIGRATE_SECRET` | Sí | Secreto para endpoint de migraciones |
| `PANIC_ALERT_RADIUS_M` | No | Radio de alerta en metros (default: 2000) |
| `JWT_EXPIRES_IN` | No | Duración del JWT (default: 24h) |

**Frontend** (Vercel):

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | URL del backend (ej: `https://silenteye-xxx.fly.dev`) |
| `NEXT_PUBLIC_WS_URL` | URL WebSocket (ej: `wss://silenteye-xxx.fly.dev/ws`) |

## Roles y acceso

| Rol | Login | Acceso |
|-----|-------|--------|
| **admin** | Teléfono + OTP | Panel completo: incidentes, alertas, vehículos, conductores, mapa, reportes PDF, testigos |
| **helper** | Teléfono + OTP | Recibe alertas cercanas, puede responder "Voy en camino", mapa de seguimiento |
| **driver** | IMEI del GPS | Ve sus vehículos asignados, recibe alertas |
| **citizen** | Email + OTP | Botón SOS de emergencia, envía ubicación GPS |

## Funcionalidades principales

- **Rastreo GPS en vivo** — Teltonika FMB920/FMC920 via TCP, ubicación en mapa OpenStreetMap
- **Botón de pánico físico** — DIN1 del GPS genera incidente automático (priority=2)
- **Botón SOS móvil** — Cualquier persona desde el navegador, sin app
- **Notificaciones** — WebSocket + Push + Email al ciudadano cuando un helper responde
- **Gestión de incidentes** — Estados: active → attending → resolved
- **Reportes PDF** — Descarga con datos del incidente, responders y testigos
- **Sistema de testigos** — Solicitud voluntaria por email con aceptar/declinar
- **PWA** — Instalable como app, funciona offline para el service worker

## GPS Teltonika (FMB920)

Configurar en Teltonika Configurator:
- **Domain**: `silenteye-3rrwnq.fly.dev`
- **Port**: `5000`
- **Protocol**: TCP
- **DIN1**: High Level (botón de pánico)

Comandos SMS (contraseña default `0000`):
- `0000 getinfo` — Estado del dispositivo
- `0000 flush` — Forzar envío de datos
- `0000 cpureset` — Reiniciar dispositivo

## Licencia

Privado — Todos los derechos reservados.

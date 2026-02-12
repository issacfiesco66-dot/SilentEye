# SilentEye

Plataforma de seguridad vehicular en tiempo real. Monitorea flotas con GPS Teltonika (FMB920/FMC920), detecta eventos de pánico y notifica a conductores/helpers cercanos al vehículo en peligro.

## Stack

| Capa | Tecnología |
|------|-----------|
| **Backend** | Node.js · Express · TypeScript · PostgreSQL + PostGIS |
| **Frontend** | Next.js 14 · React · Tailwind CSS · Mapbox GL |
| **GPS** | Teltonika FMB920 · Codec 8 / 8E · TCP |
| **Tiempo real** | WebSocket (alertas, ubicaciones, incidentes) |
| **Deploy** | Fly.io (backend) · Vercel (frontend) |

## Estructura

```
SilentEye/
├── backend/src/
│   ├── api/
│   │   ├── auth.ts            # OTP + JWT autenticación
│   │   └── routes.ts          # Todas las rutas REST
│   ├── db/
│   │   ├── pool.ts            # Conexión PostgreSQL
│   │   ├── schema.sql         # Schema con PostGIS
│   │   ├── schema-simple.sql  # Schema sin PostGIS (Haversine)
│   │   ├── migrations/        # Migraciones incrementales
│   │   ├── migrate.ts         # Runner de migraciones
│   │   └── seed.ts            # Datos iniciales
│   ├── services/
│   │   ├── gps-service.ts     # Procesa datos GPS + crea incidentes
│   │   ├── alert-service.ts   # Detecta alertas + notifica cercanos
│   │   └── websocket.ts       # Broadcast tiempo real
│   ├── teltonika/
│   │   ├── tcp-server.ts      # Servidor TCP para dispositivos GPS
│   │   ├── avl-decoder.ts     # Decodificador Codec 8/8E
│   │   ├── alert-detector.ts  # Clasifica eventos AVL en alertas
│   │   └── crc16.ts
│   └── index.ts               # Entry point
├── frontend/
│   ├── app/                   # Páginas Next.js (login, admin, dashboard)
│   ├── components/
│   │   ├── MapboxMap.tsx       # Mapa con geolocalización del browser
│   │   ├── admin/             # Panel administrador
│   │   └── helper/            # Panel conductor/helper
│   └── hooks/useWebSocket.ts  # Hook WebSocket tiempo real
├── simulator/                 # Simulador GPS Teltonika (desarrollo)
├── Dockerfile                 # Build backend para Fly.io
├── fly.toml                   # Configuración Fly.io
└── .github/workflows/         # CI/CD automático
```

## Inicio rápido

```bash
npm install
npm run dev            # Backend + Frontend
npm run dev:backend    # Solo backend
npm run dev:frontend   # Solo frontend
```

## Base de datos

```bash
npm run migrate        # Aplicar schema + migraciones
npm run seed           # Datos iniciales (admin)
npm run migrate:alerts # Migración de alertas
```

## Deploy

```bash
fly deploy --remote-only   # Backend → Fly.io
vercel --prod              # Frontend → Vercel
```

Push a `main` o `master` despliega automáticamente via GitHub Actions.

## Variables de entorno

Ver `backend/.env.example`. Críticas:

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — Secreto para tokens JWT
- `NEXT_PUBLIC_MAPBOX_TOKEN` — Token de Mapbox (frontend)
- `NGROK_AUTHTOKEN` — Túnel TCP GPS en producción
- `PANIC_ALERT_RADIUS_M` — Radio de alerta en metros (default: 2000)

## Roles

| Rol | Permisos |
|-----|----------|
| **admin** | Ve todo: alertas, incidentes, vehículos, conductores, mapa completo |
| **driver** | Ve sus vehículos, recibe alertas si está cerca de un incidente |
| **helper** | Recibe alertas de incidentes cercanos, puede asistir |

## GPS Teltonika (FMB920)

Configurar en Teltonika Configurator:
- **Domain**: `silenteye-3rrwnq.fly.dev`
- **Port**: `5000`
- **Protocol**: TCP

El botón de pánico (DIN1) genera `priority=2` → crea incidente → notifica usuarios en radio de 2km del vehículo.

Comandos SMS útiles (enviar al número de la SIM del GPS, contraseña default `0000`):
- `0000 getinfo` — Estado del dispositivo
- `0000 flush` — Forzar envío de datos al servidor
- `0000 cpureset` — Reiniciar dispositivo

## Licencia

Privado — Todos los derechos reservados.

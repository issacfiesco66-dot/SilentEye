# SilentEye - Plataforma de Seguridad Vehicular

Plataforma completa de seguridad vehicular basada en GPS físico Teltonika FMB920 con botón de pánico conectado a DIN1.

## Arquitectura

- **Backend**: Servidor TCP para dispositivos Teltonika + API REST + WebSockets
- **Frontend**: PWA Next.js con Mapbox para visualización en tiempo real
- **Simulador**: Herramienta para probar localmente sin dispositivo real

## Requisitos

- Node.js 18+
- PostgreSQL 14+ con extensión PostGIS
- Cuenta Mapbox (token gratuito)

## Configuración

### 1. Base de datos PostgreSQL

```bash
# Crear base de datos
createdb silenteye

# Habilitar PostGIS
psql -d silenteye -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# Ejecutar migraciones
cd backend && npm run migrate

# Datos de prueba (opcional)
npm run seed
```

### 2. Variables de entorno

Copiar `backend/.env.example` a `backend/.env` y configurar:

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/silenteye
JWT_SECRET=tu_clave_secreta_muy_segura
MAPBOX_TOKEN=tu_token_mapbox
TCP_PORT=5000
HTTP_PORT=3001
WS_PORT=3002
```

### 3. Iniciar servicios

```bash
# Instalar dependencias
npm install

# Modo desarrollo (backend + frontend)
npm run dev

# Simulador GPS (en otra terminal)
npm run dev:simulator
```

## Puertos

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| TCP Teltonika | 5000 | Conexiones de dispositivos GPS |
| API REST | 3001 | API HTTP con JWT |
| WebSockets | 3002 | Tiempo real |
| Frontend | 3000 | PWA Next.js |

## Roles

- **admin**: Panel completo, gestión de vehículos, usuarios e incidentes
- **helper**: Conductores cercanos que reciben alertas y pueden asistir
- **driver**: Conductor asociado a vehículo, ve su ubicación

Tras `npm run seed`: Admin +51999999999, Helper +51999999998, Driver +51999999997

## Protocolo Teltonika

- Handshake: IMEI (2 bytes length + ASCII) → ACK 0x01/0x00
- AVL: Codec 8 / 8E con CRC-16
- DIN1 activo (1) = evento de pánico

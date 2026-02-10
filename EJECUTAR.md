# Cómo ejecutar SilentEye

## Requisitos previos

1. **Node.js 18+** (verifica con `node -v`)
2. **PostgreSQL 14+** con PostGIS (para base de datos)

## Pasos para ejecutar

### 1. Instalar dependencias (si no lo has hecho)

```powershell
cd e:\SilentEye
npm install
```

### 2. PostgreSQL (obligatorio para login, incidentes, etc.)

**PostGIS (opcional):** Si tienes PostGIS instalado, el proyecto lo usará automáticamente. Si no, usa schema-simple (Haversine). Para migrar a PostGIS más adelante:
```powershell
npm run reset:postgis
npm run migrate
npm run seed
```

**Si tienes PostgreSQL instalado:**

```powershell
psql -U postgres -c "CREATE DATABASE silenteye;"
psql -U postgres -d silenteye -c "CREATE EXTENSION postgis;"
```

Edita `backend\.env` y ajusta `DATABASE_URL` si tu contraseña es diferente.

**Si ya tenías la BD con schema antiguo (sin PostGIS):**
```powershell
psql -U postgres -d silenteye -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres;"
```

```powershell
cd e:\SilentEye
npm run migrate
npm run seed
```

**Instalación automática (PowerShell):**

```powershell
cd e:\SilentEye
.\INSTALAR_POSTGIS.ps1
```

Este script: si tienes Docker, crea un contenedor PostgreSQL+PostGIS; si no, abre Stack Builder.

**O manualmente con Docker:**

```powershell
docker run -d --name silenteye-db -e POSTGRES_PASSWORD=CAMBIAR_PASSWORD_SEGURO -e POSTGRES_DB=silenteye -p 5433:5432 postgis/postgis:16-3.4
```

Luego ejecuta `npm run migrate` y `npm run seed`.

### 3. Iniciar el backend

```powershell
cd e:\SilentEye
npm run dev:backend
```

Deja la terminal abierta. Deberías ver:
- Servidor TCP Teltonika en puerto 5000
- API HTTP en puerto 3001
- WebSocket en puerto 3002

### 4. Iniciar el frontend (otra terminal)

```powershell
cd e:\SilentEye
npm run dev:frontend
```

Abre **http://localhost:3000** en el navegador.

Si el frontend falla por SWC, prueba reinstalando:

```powershell
cd e:\SilentEye\frontend
Remove-Item -Recurse -Force node_modules
cd ..
npm install
npm run dev:frontend
```

### 6. (Opcional) Simulador GPS

En una tercera terminal, para simular un dispositivo Teltonika:

```powershell
cd e:\SilentEye\simulator
npm run start
```

**Nota:** El simulador usa IMEI `356307042441013`, registrado en el seed. Cualquier IMEI no presente en `vehicles` será rechazado por el servidor TCP (whitelist).

## Credenciales de prueba (después del seed)

| Rol     | Teléfono     |
|---------|--------------|
| Admin   | +51999999999 |
| Helper  | +51999999998 |
| Driver  | +51999999997 |

Para el login OTP: solicita código con el teléfono, y en la consola del backend verás el código generado (o mira la respuesta del API en DevTools).

## Resumen de comandos

```powershell
# Desde la raíz del proyecto (e:\SilentEye)

# 1. Migraciones (una sola vez, requiere PostgreSQL)
npm run migrate
npm run seed

# 2. Iniciar todo
npm run dev
# Esto arranca backend (puertos 5000, 3001, 3002) + frontend (puerto 3000)

# O por separado en terminales distintas:
npm run dev:backend    # Terminal 1
npm run dev:frontend   # Terminal 2
npm run dev:simulator  # Terminal 3 (opcional)
```

## Si no tienes PostgreSQL

### Opción A: Docker

```powershell
docker run -d --name silenteye-db -e POSTGRES_PASSWORD=tu_password_local -e POSTGRES_DB=silenteye -p 5432:5432 postgis/postgis:16-3.4
```

Luego: `npm run migrate` y `npm run seed`

### Opción B: Instalar PostgreSQL

1. Descarga: https://www.postgresql.org/download/windows/
2. Durante la instalación, incluye **Stack Builder** y agrega **PostGIS**
3. Crea la BD:
   ```powershell
   psql -U postgres -c "CREATE DATABASE silenteye;"
   psql -U postgres -d silenteye -c "CREATE EXTENSION postgis;"
   ```
4. Ajusta `backend/.env` con tu contraseña de PostgreSQL

## Problemas comunes

- **"server does not support SSL, but SSL was required"**: Usa `?sslmode=disable` en la URL o `$env:PGSSLMODE="disable"` antes de psql
- **"la extensión postgis no está disponible"**: Instala PostGIS (Stack Builder en Windows, o `apt install postgis` en Linux)
- **"tsx no se reconoce"**: Ejecuta `npm install` en la raíz
- **"Connection timeout"**: PostgreSQL no está corriendo. Inícialo o usa Docker
- **Mapa en blanco**: Añade `NEXT_PUBLIC_MAPBOX_TOKEN` en `frontend/.env.local` (gratis en mapbox.com)

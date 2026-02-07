# Objetivo: GPS enviando datos a SilentEye

Pasos para que tu FMB920 envíe alertas y datos a tu servidor en la nube.

---

## Paso 1: Desplegar el backend en Railway

### 1.1 Crear proyecto en Railway

1. Entra a **https://railway.app** e inicia sesión (con GitHub).
2. **New Project** → **Deploy from GitHub repo**.
3. Selecciona **issacfiesco66-dot/SilentEye**.
4. Railway creará un servicio. **Importante:** en **Settings** → **Build** → **Root Directory** pon: `backend`. Así Railway usará la carpeta del backend.

### 1.2 Variables de entorno

En **Variables** del servicio, agrega:

| Variable | Valor | Nota |
|----------|-------|------|
| `DATABASE_URL` | `postgresql://...` | Ver Paso 2 (PostgreSQL) |
| `JWT_SECRET` | Una cadena aleatoria de 32+ caracteres | Obligatorio |
| `TCP_PORT` | `5000` | Puerto TCP para Teltonika |
| `HTTP_PORT` | `3001` | API REST |
| `WS_PORT` | `3002` | WebSocket |
| `TELTONIKA_SKIP_WHITELIST` | `true` | Aceptar cualquier IMEI |
| `NODE_ENV` | `production` | Entorno de producción |

### 1.3 PostgreSQL en Railway

1. En el mismo proyecto, **Add New** → **Database** → **PostgreSQL**.
2. Railway creará la base de datos y expondrá `DATABASE_URL`.
3. En el servicio del backend, **Variables** → **Add Reference** → selecciona `DATABASE_URL` del Postgres.

### 1.4 Activar TCP Proxy (crítico para el GPS)

1. En el servicio del backend → **Settings**.
2. Sección **Networking**.
3. En **TCP Proxy**, introduce el puerto interno: `5000`.
4. Pulsa **Enable TCP Proxy**.
5. Railway generará algo como: `shuttle.proxy.rlwy.net:15140`.

Anota el **dominio** y el **puerto** (ej. `shuttle.proxy.rlwy.net` y `15140`). El GPS debe usar ese dominio y ese puerto.

### 1.5 Migrar la base de datos

En **Settings** del backend → **Deploy** → añade un comando de release (o ejecútalo manualmente una vez):

```bash
npm run migrate
```

O en un despliegue anterior, en la consola del servicio:

```bash
npx tsx src/db/migrate.ts
```

---

## Paso 2: Configurar el GPS (Configurator)

1. **GPRS → Server Settings**
   - **Domain:** el dominio del TCP Proxy de Railway (ej. `shuttle.proxy.rlwy.net`)
   - **Port:** el puerto del TCP Proxy (ej. `15140`)
   - **Protocol:** TCP

2. **Second Server** → **Disabled**

3. **Save to device** → **Reboot device**

---

## Paso 3: Comprobar que llegan datos

1. En Railway → **Logs** del backend.
2. Al encender o mover el GPS deberías ver líneas como:
   - `[TCP] Cliente conectado`
   - `[TCP] IMEI recibido: 353691846029642`
   - `[TCP][353691846029642] AVL decodificado: X registros`
3. Si aparecen, el GPS ya está enviando datos al servidor.

---

## Alternativa: Fly.io (si Railway da problemas)

Fly.io permite exponer TCP de forma explícita. En la raíz del proyecto:

```bash
cd e:\SilentEye\backend
fly launch
```

Responde a las preguntas. Luego crea `fly.toml` con:

```toml
app = "silenteye-backend"

[build]
  dockerfile = "Dockerfile"

[env]
  TCP_PORT = "5000"
  HTTP_PORT = "3001"
  WS_PORT = "3002"

[[services]]
  internal_port = 5000
  protocol = "tcp"
  [[services.ports]]
    port = 5000
    handlers = ["tls", "connection"]

[[services]]
  internal_port = 3001
  protocol = "tcp"
  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]
```

Despliega:

```bash
fly deploy
```

La IP o dominio de Fly se usa en el GPS como en el Paso 2.

---

## Resumen

| Paso | Acción |
|------|--------|
| 1 | Desplegar backend en Railway (root: backend) |
| 2 | Añadir PostgreSQL y `DATABASE_URL` |
| 3 | Configurar variables (JWT_SECRET, etc.) |
| 4 | Activar TCP Proxy en puerto 5000 |
| 5 | Ejecutar migraciones |
| 6 | Configurar GPS: domain + puerto TCP de Railway |
| 7 | Revisar logs para ver datos entrantes |

Cuando aparezcan `[TCP] IMEI recibido` y `AVL decodificado` en los logs, el GPS ya está trabajando con tu proyecto.

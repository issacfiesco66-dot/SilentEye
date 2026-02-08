# Desplegar SilentEye en Fly.io (24/7)

Backend + TCP para GPS en Fly.io con dominio fijo.

---

## 1. Prerrequisitos

- Cuenta en [Fly.io](https://fly.io)
- [flyctl](https://fly.io/docs/hands-on/install-flyctl/) instalado
- Repo SilentEye en GitHub conectado a Fly

---

## 2. Crear PostgreSQL en Fly

```powershell
# Crear base de datos Postgres
fly postgres create --name silenteye-db --region mia

# Anotar el nombre del app (ej: silenteye-db)
# Crear usuario y base si no existe:
fly postgres connect -a silenteye-db
# Dentro de psql: CREATE DATABASE silenteye; \q
```

Obtén la `DATABASE_URL`:

```powershell
fly postgres config show -a silenteye-db
```

---

## 3. Configurar la app

Desde la raíz del proyecto:

```powershell
cd e:\SilentEye

# Login (si no lo has hecho)
fly auth login

# Crear la app (si fly launch no se ejecutó ya)
fly launch --no-deploy
```

Si ya creaste la app desde el dashboard, solo necesitas el `fly.toml` (ya está en el repo).

---

## 4. Secretos y variables

```powershell
# Base de datos (reemplaza con tu URL real)
fly secrets set DATABASE_URL="postgresql://postgres:PASSWORD@silenteye-db.internal:5432/silenteye"

# JWT
fly secrets set JWT_SECRET="tu_cadena_segura_de_al_menos_32_caracteres"

# CORS (dominio del frontend)
fly secrets set CORS_ORIGINS="https://silent-eye.com,https://www.silent-eye.com"
```

---

## 5. Vincular Postgres (si usaste Fly Postgres)

```powershell
fly postgres attach silenteye-db -a silenteye
```

Esto inyecta `DATABASE_URL` automáticamente.

---

## 6. Desplegar

```powershell
fly deploy
```

---

## 7. URLs después del despliegue

| Uso | URL |
|-----|-----|
| API | `https://silenteye.fly.dev` |
| WebSocket | `wss://silenteye.fly.dev/ws` |
| GPS (TCP) | `silenteye.fly.dev:5000` |

---

## 8. Usar tu dominio (gps.silent-eye.com)

### En Fly.io

```powershell
fly certs add gps.silent-eye.com -a silenteye
```

### En tu DNS (Cloudflare o donde tengas silent-eye.com)

- **Tipo:** `A` o `CNAME`
- **Nombre:** `gps`
- **Valor:** La IP que te indique Fly, o `silenteye.fly.dev` (CNAME)
- **Proxy:** Desactivado (gris) si es CNAME a Fly

Para TCP, Fly necesita que el certificado esté activo. Los GPS se configurarían así:

- **Domain:** `gps.silent-eye.com`
- **Port:** `5000`

---

## 9. Configurar el GPS

En Teltonika Configurator → GPRS:

- **Domain:** `silenteye.fly.dev` (o `gps.silent-eye.com` cuando esté configurado)
- **Port:** `5000`
- **Save to device** → **Reboot**

---

## 10. Verificar

```powershell
# Logs en tiempo real
fly logs -a silenteye

# Estado
fly status -a silenteye
```

En los logs deberías ver: `[TCP] IMEI recibido` y `AVL decodificado`.

---

## 11. Ejecutar seed (datos iniciales)

```powershell
fly ssh console -a silenteye -C "node dist/db/seed.js"
```

O desde tu máquina si tienes acceso a la DB:

```powershell
cd e:\SilentEye
npm run seed
```

---

## Frontend

El frontend (Next.js) puede desplegarse en Vercel, Netlify o el hosting de tu dominio. Variables de entorno:

```
NEXT_PUBLIC_API_URL=https://silenteye.fly.dev
NEXT_PUBLIC_WS_URL=wss://silenteye.fly.dev/ws
NEXT_PUBLIC_MAPBOX_TOKEN=tu_token
```

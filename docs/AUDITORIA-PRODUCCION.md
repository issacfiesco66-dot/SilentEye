# Auditoría completa – SilentEye para producción

**Fecha:** Febrero 2026  
**Objetivo:** Identificar todo lo necesario para llevar SilentEye a producción con seguridad y estabilidad.

---

## 1. Estado actual: ✅ Implementado

| Área | Estado | Notas |
|------|--------|-------|
| **JWT_SECRET obligatorio** | ✅ | Validación al arranque, mínimo 32 caracteres |
| **WebSocket con JWT** | ✅ | Token en query string, rol/vehicleId desde BD |
| **IDOR incidents** | ✅ | Admin/helper/driver filtrados correctamente |
| **IDOR gps/logs** | ✅ | Verificación por rol y permiso sobre vehículo |
| **IDOR incidents/:id/status** | ✅ | Helper/driver solo incidentes en incident_followers |
| **CORS restrictivo** | ✅ | En producción usa CORS_ORIGINS; desarrollo permite todo |
| **Rate limiting** | ✅ | 200 req/15min, soporta Cloudflare IP |
| **Error handler genérico** | ⚠️ | Middleware final devuelve mensaje genérico, pero algunos endpoints exponen `err?.message` |
| **Trust proxy** | ✅ | Para Cloudflare/Fly |
| **TCP límites** | ✅ | MAX_AVL_DATA_LENGTH 512KB, MAX_IMEI_LENGTH 64 |
| **Health check** | ✅ | GET /health para Fly |
| **Despliegue Fly.io** | ✅ | Dockerfile, fly.toml, región dfw |

---

## 2. Pendiente crítico (antes de producción)

### ~~2.1 OTP devuelto en la API~~ ✅ CORREGIDO

**Ubicación:** `backend/src/api/routes.ts` línea 46

```javascript
res.json({ success: true, code });  // ⚠️ El OTP se expone
```

**Riesgo:** Cualquiera que intercepte la petición obtiene el código OTP.

**Solución:**
- En producción (`NODE_ENV=production`), **no** devolver `code` en la respuesta
- El OTP debe enviarse solo por SMS/WhatsApp (integración externa)
- Respuesta en prod: `{ success: true }` sin `code`

---

### 2.2 CORS_ORIGINS sin configurar en Fly

**Problema:** Si `CORS_ORIGINS` está vacío en producción, el backend rechazará todas las peticiones del frontend.

**Solución:** Añadir en Fly Secrets o Variables:
```
CORS_ORIGINS=https://tu-dominio.com,https://www.tu-dominio.com
```

Para desarrollo local con frontend en localhost, añadir temporalmente:
```
CORS_ORIGINS=https://silenteye-3rrwnq.fly.dev,http://localhost:3000
```

---

### 2.3 DATABASE_URL en producción

**Problema:** `pool.ts` tiene fallback a `postgresql://postgres:postgres@localhost:5432/silenteye`. En Fly no hay Postgres en localhost.

**Solución:**
- Vincular Postgres de Fly: `flyctl postgres attach silenteye-db -a silenteye-3rrwnq`
- O definir `DATABASE_URL` en Secrets con la URL de tu proveedor (Railway, Supabase, etc.)

**Recomendación adicional:** En producción, fallar al arrancar si `DATABASE_URL` no está definido (quitar el fallback).

---

### ~~2.4 Migraciones idempotentes~~ ✅ CORREGIDO

**Problema:** `schema.sql` usa `CREATE TABLE` sin `IF NOT EXISTS`. El `release_command` ejecuta migrate en cada deploy. En el segundo deploy fallará con "table already exists".

**Solución:**
- Opción A: Cambiar schema.sql para usar `CREATE TABLE IF NOT EXISTS` (como schema-simple)
- Opción B: Migración incremental: solo ejecutar migraciones nuevas (por ejemplo `001_add_alerts.sql`) y no el schema completo una vez aplicado
- Opción C: Ejecutar migrate solo en el primer deploy (manual) y quitar release_command

---

## 3. Pendiente alto (primeras semanas)

### ~~3.1 Dockerfile.backend desactualizado~~ ✅ CORREGIDO

**Problema:** `fly.toml` usa `Dockerfile.backend` que tiene:
- `npx tsc` (puede instalar paquete equivocado)
- No instala `@types/pg` explícitamente

El `Dockerfile` principal en la raíz sí tiene las correcciones. Unificar o actualizar `Dockerfile.backend`:

```dockerfile
# En Dockerfile.backend, reemplazar:
RUN npx tsc && cp ...
# Por:
RUN npm install --save-dev @types/pg
RUN node ./node_modules/typescript/bin/tsc
RUN cp src/db/schema.sql src/db/schema-simple.sql dist/db/
```

---

### ~~3.2 Errores 500 exponen mensajes internos~~ ✅ CORREGIDO

**Ubicación:** `backend/src/api/routes.ts` líneas 50, 71

```javascript
res.status(500).json({ error: err?.message || '...' });
```

**Solución:** En producción, devolver siempre mensaje genérico:
```javascript
res.status(500).json({ error: 'Error interno del servidor' });
logger.error('OTP request error:', err);
```

---

### 3.3 Validación de entrada

**Campos sin límite de longitud:**
- `phone` (routes)
- `name`, `plate`, `imei` (vehicles, users)

**Solución:** Validar longitud máxima antes de insertar (ej. phone 20, name 255, plate 20, imei 20).

---

### ~~3.4 helpers/nearby solo devuelve role='helper'~~ ✅ CORREGIDO

**Ubicación:** `backend/src/api/routes.ts` – query `helpers/nearby`

**Contexto:** Con el modelo de "ayuda mutua", los conductores cercanos (con vehículo y ubicación) también pueden asistir.

**Solución:** Incluir en la búsqueda a usuarios con `role='driver'` que tengan vehículo asignado y ubicación, no solo `role='helper'`.

---

## 4. Pendiente medio (mejoras)

### 4.1 Logs de autenticación

- Registrar intentos fallidos de login (OTP inválido)
- Registrar accesos denegados (401/403) con userId si aplica
- Útil para auditoría y detección de ataques

---

### 4.2 Headers de seguridad (frontend)

Añadir en Next.js o en el servidor que sirve el frontend:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` o `SAMEORIGIN`
- `Referrer-Policy: strict-origin-when-cross-origin`
- CSP (Content-Security-Policy) si es posible

---

### 4.3 SMS/WhatsApp para OTP

Actualmente el OTP se genera y se devuelve en la API. Para producción real:
- Integrar Twilio, WhatsApp Business API o similar
- Enviar el código por SMS/WhatsApp al teléfono
- No exponer nunca el código en la respuesta API

---

### 4.4 Monitorización

- Sentry o similar para errores en producción
- Alertas si el health check falla
- Logs centralizados (Fly tiene Grafana)

---

## 5. Frontend para producción

### 5.1 Variables de entorno

En Vercel/Netlify (o donde despliegues el frontend):

| Variable | Ejemplo | Descripción |
|----------|---------|-------------|
| NEXT_PUBLIC_API_URL | https://silenteye-3rrwnq.fly.dev | URL del backend |
| NEXT_PUBLIC_WS_URL | wss://silenteye-3rrwnq.fly.dev/ws | WebSocket |
| NEXT_PUBLIC_MAPBOX_TOKEN | pk... | Token Mapbox |

### 5.2 Rewrites

El `next.config.js` tiene:
```javascript
{ source: '/api/:path*', destination: 'http://localhost:3001/api/:path*' }
```

En producción, el frontend debe llamar directamente a la URL del backend (NEXT_PUBLIC_API_URL). Los rewrites a localhost solo tienen sentido en desarrollo local.

---

## 6. Secrets/variables en Fly.io

Verificar en el Dashboard de Fly (Secrets):

| Secreto | Obligatorio | Notas |
|---------|-------------|-------|
| JWT_SECRET | ✅ | Mínimo 32 caracteres |
| DATABASE_URL | ✅ | O usar `fly postgres attach` |
| CORS_ORIGINS | ✅ | Dominios del frontend separados por coma |

Variables en fly.toml [env]:
- NODE_ENV, TCP_PORT, PORT, TELTONIKA_SKIP_WHITELIST ✅

---

## 7. Checklist pre-producción

- [ ] OTP no devuelto en API (o solo en desarrollo)
- [ ] CORS_ORIGINS configurado en Fly
- [ ] DATABASE_URL configurado (Postgres vinculado o secreto)
- [ ] Migraciones idempotentes (schema con IF NOT EXISTS o migración incremental)
- [ ] Dockerfile.backend actualizado o usar Dockerfile principal
- [ ] Errores 500 no exponen err.message
- [ ] Frontend desplegado con variables correctas (API, WS, Mapbox)
- [ ] Seed ejecutado (usuario admin, etc.): `fly ssh console -a silenteye-3rrwnq -C "node dist/db/seed.js"`
- [ ] TELTONIKA_SKIP_WHITELIST: en prod con IMEIs reales, considerar `false` y usar whitelist
- [ ] Dominio personalizado (opcional): certificados, DNS

---

## 8. Orden sugerido de implementación

1. **Inmediato:** CORS_ORIGINS, migraciones idempotentes, OTP en producción
2. **Corto plazo:** Dockerfile.backend, errores 500 genéricos, DATABASE_URL sin fallback
3. **Mediano:** Validación de entrada, helpers/nearby con drivers, logs de auth
4. **Largo plazo:** SMS/WhatsApp OTP, headers seguridad, Sentry, dominio propio

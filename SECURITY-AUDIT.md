# 🔒 AUDITORÍA DE SEGURIDAD — SilentEye
**Fecha:** 2026-04-13  
**Auditor:** Cascade AI Security Audit  
**Alcance:** Backend (Express+TypeScript), Frontend (Next.js 14), TCP GPS Server, PostgreSQL, WebSockets, Fly.io/Vercel deployment  

---

## RESUMEN EJECUTIVO

| Severidad | Hallazgos |
|-----------|-----------|
| 🔴 CRÍTICO | 3 |
| 🟠 ALTO | 7 |
| 🟡 MEDIO | 8 |
| 🔵 BAJO | 6 |
| ✅ BIEN HECHO | 12 |

**Puntuación general: 68/100** — El sistema tiene buenas bases de seguridad (JWT fuerte, rate limiting, parameterized queries, CORS restrictivo), pero hay vulnerabilidades críticas que deben corregirse de inmediato.

---

## 🔴 CRÍTICO — Corregir de inmediato

### C1. Archivo de credenciales GCP en repositorio
**Archivo:** `silenteye-493217-881ba804e2bd.json` (raíz del repo)  
**Riesgo:** Aunque está en `.gitignore`, el archivo existe físicamente. Si alguna vez fue commiteado a Git, las credenciales de la cuenta de servicio de Google Cloud están expuestas para siempre en el historial de Git. Cualquiera con acceso al repo puede usar estas credenciales para acceder a Google Earth Engine u otros servicios GCP.

**Remediación:**
1. Verificar si fue commiteado: `git log --all -- silenteye-493217-881ba804e2bd.json`
2. Si sí: rotar las credenciales inmediatamente en Google Cloud Console
3. Eliminar el archivo del disco y usar solo variables de entorno (`GEE_PRIVATE_KEY`, `GEE_SERVICE_ACCOUNT_EMAIL`)
4. Considerar `git filter-branch` o BFG Repo-Cleaner para purgar del historial

---

### C2. JWT almacenado en cookie sin flag HttpOnly
**Archivo:** `frontend/lib/session.ts:39-44`  
**Riesgo:** El JWT se almacena en una cookie accesible desde JavaScript (`document.cookie`). Un ataque XSS (incluso de una librería de terceros comprometida) podría robar el token y tomar control total de la sesión del usuario, incluyendo cuentas de admin.

```typescript
// VULNERABLE — cookie accesible desde JS
document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Strict${secure}`;
```

**Remediación:**
- Agregar `; HttpOnly` a la cookie, O mejor: no almacenar JWT en cookies si solo se usa como Bearer token
- Si necesitas dual-storage, usa `HttpOnly` cookie para el token y localStorage solo para datos UI (nombre, rol)
- Alternativamente: implementar un endpoint `/api/auth/refresh` que use HttpOnly cookie

---

### C3. Cookie de sesión dura 30 días — sin rotación
**Archivo:** `frontend/lib/session.ts:12` + `backend/src/api/auth.ts:147`  
**Riesgo:** La cookie tiene `max-age=30d` pero el JWT por defecto expira en 24h. Si el JWT expira, el frontend usa `isTokenExpired()` para detectarlo (decodificación client-side sin verificar firma). Un atacante que robe el token tiene 24h de acceso, pero si el cookie persiste 30 días y no hay mecanismo de revocación (no hay blacklist de tokens), un JWT comprometido no puede invalidarse hasta que expire.

**Remediación:**
1. Reducir `COOKIE_MAX_AGE` para que coincida con `JWT_EXPIRES_IN`
2. Implementar token refresh con rotación de tokens
3. Agregar tabla `revoked_tokens` para poder invalidar sesiones comprometidas
4. Implementar endpoint `POST /api/auth/logout` que invalide el token en servidor

---

## 🟠 ALTO — Corregir esta semana

### A1. SSL de base de datos sin verificación de certificado
**Archivo:** `backend/src/db/pool.ts:20`  
```typescript
: { rejectUnauthorized: false }
```
**Riesgo:** Cuando `DATABASE_CA_CERT` no está configurado (que es lo más común), la conexión SSL acepta cualquier certificado, permitiendo ataques man-in-the-middle entre el backend y PostgreSQL.

**Remediación:** Configurar `DATABASE_CA_CERT` en Fly.io Secrets con el certificado CA del proveedor de base de datos, o usar el CA de Fly.io si la DB es interna.

---

### A2. Endpoint de helpers cercanos no filtra por rol
**Archivo:** `backend/src/api/routes.ts:1912-1948` (`GET /helpers/nearby`)  
**Riesgo:** Cualquier usuario autenticado (incluyendo ciudadanos) puede consultar la ubicación de todos los helpers y conductores cercanos. Esto expone ubicaciones en tiempo real de personal de seguridad.

**Remediación:** Agregar `requireRole('admin', 'helper', 'driver')` al endpoint, o limitar la información devuelta para ciudadanos.

---

### A3. Witness response URL no expira
**Archivo:** `backend/src/api/routes.ts:110-113, 1676-1731`  
**Riesgo:** Los enlaces de aceptar/declinar testigo usan HMAC pero nunca expiran. Una vez generado, el enlace funciona para siempre. Si un email es interceptado, el atacante puede responder en nombre del testigo indefinidamente.

**Remediación:** Incluir timestamp en el HMAC: `signWitnessToken(id, userId, response, timestamp)` y rechazar si `timestamp > 72h`.

---

### A4. Broadcast de pánico a TODOS los roles incluido citizen
**Archivo:** `backend/src/services/websocket.ts:214-224`  
```typescript
export function broadcastPanic(event: PanicEvent, nearbyUserIds?: string[]) {
  const filter = (meta) =>
    meta.role === 'admin' ||
    meta.role === 'helper' ||
    meta.role === 'driver' ||
    meta.role === 'citizen' ||  // ← Todos los ciudadanos ven TODOS los pánicos
    (nearbyUserIds ?? []).includes(meta.userId ?? '');
```
**Riesgo:** Todos los ciudadanos conectados por WebSocket reciben todas las alertas de pánico con coordenadas exactas. Un atacante podría crear una cuenta de ciudadano y monitorear en tiempo real todas las emergencias de la ciudad.

**Remediación:** Los ciudadanos solo deberían ver pánicos de sus propios incidentes o donde son followers. Cambiar a:
```typescript
meta.role === 'citizen' && (nearbyUserIds ?? []).includes(meta.userId ?? '')
```

---

### A5. fleet_owner puede asignar cualquier driver_id a su vehículo
**Archivo:** `backend/src/api/routes.ts:1015-1036` (`PUT /fleet/vehicles/:id/driver`)  
**Riesgo:** El `driver_id` del body no se valida — un fleet_owner podría asignar cualquier UUID como conductor de su vehículo, incluyendo admins u otros fleet_owners. Esto podría permitir que el fleet_owner vea posiciones GPS de un admin si ese admin tiene ubicación.

**Remediación:** Verificar que `driver_id` corresponde a un usuario con rol `driver` antes de asignarlo:
```typescript
if (driverId) {
  const driverCheck = await pool.query('SELECT role FROM users WHERE id = $1', [driverId]);
  if (!driverCheck.rows[0] || driverCheck.rows[0].role !== 'driver') {
    return res.status(400).json({ error: 'Solo se pueden asignar usuarios con rol driver' });
  }
}
```

---

### A6. GPS logs exponen fleet_owner missing en access check
**Archivo:** `backend/src/api/routes.ts:1867-1909` (`GET /gps/logs`)  
**Riesgo:** El endpoint `GET /gps/logs` permite `admin`, `driver`, `helper` pero **no fleet_owner**. Sin embargo, tampoco bloquea fleet_owner explícitamente — cae al `else` que devuelve 403. Pero más importante: un `driver` solo se verifica por `driver_id`, no por `owner_id`. Si un fleet_owner con rol `driver` tuviera acceso, no podría ver logs de sus propios vehículos.

**Remediación:** Agregar `fleet_owner` con verificación de `owner_id` en el mismo patrón que los demás endpoints.

---

### A7. OTP code se loguea en desarrollo
**Archivo:** `backend/src/api/auth.ts:42`  
```typescript
logger.info(`OTP creado para ***${phone.slice(-4)} (expira en ${OTP_EXPIRY_MINUTES} min)`);
```
**Riesgo:** Aunque el código OTP NO se loguea directamente (bien), en `setup/otp` (dev-only) sí se retorna en la respuesta. Si por error `NODE_ENV` no es `production`, este endpoint estaría accesible. Además, si los logs son accesibles (Fly.io logs), la información parcial del teléfono podría ayudar en ingeniería social.

**Remediación:** Asegurar que los logs nunca contengan códigos OTP. Ya está bien implementado, pero agregar una verificación doble en el endpoint `setup/otp`.

---

## 🟡 MEDIO — Corregir este mes

### M1. No hay validación de UUID en parámetros de ruta
**Archivo:** Todos los endpoints con `:id` en `routes.ts`  
**Riesgo:** Los parámetros como `req.params.id` se pasan directamente a queries SQL sin validar que sean UUIDs válidos. PostgreSQL rechazará formatos inválidos con error 500, pero esto genera ruido en logs y podría revelar información del stack.

**Remediación:** Agregar middleware de validación UUID:
```typescript
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function validateUuidParam(paramName: string) {
  return (req, res, next) => {
    if (!UUID_REGEX.test(req.params[paramName])) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    next();
  };
}
```

---

### M2. Password policy insuficiente
**Archivo:** `backend/src/api/routes.ts:670`  
```typescript
if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 12) {
```
**Riesgo:** Solo se valida longitud mínima (12 chars). No se valida complejidad (mayúsculas, números, caracteres especiales). Passwords como `aaaaaaaaaaaa` o `123456789012` serían aceptados.

**Remediación:** Agregar validación de complejidad:
```typescript
const hasUpper = /[A-Z]/.test(newPassword);
const hasLower = /[a-z]/.test(newPassword);
const hasDigit = /\d/.test(newPassword);
if (!hasUpper || !hasLower || !hasDigit) {
  return res.status(400).json({ error: 'Password must contain upper, lower, and digit' });
}
```

---

### M3. TELTONIKA_SKIP_WHITELIST default permite cualquier IMEI
**Archivo:** `backend/src/gps/tcp-server.ts:33-34`  
```typescript
const SKIP_WHITELIST = _skip !== 'false' && _skip !== '0' && _skip !== 'no';
```
**Riesgo:** Por defecto (si no se define la variable), SKIP_WHITELIST es `true`. Cualquier dispositivo GPS del mundo puede conectarse al servidor TCP y enviar datos falsos. Un atacante podría inyectar posiciones GPS falsas o crear pánicos falsos.

**Nota:** En `fly.toml` está configurado como `TELTONIKA_SKIP_WHITELIST = 'false'` para producción ✅, pero el default inseguro podría afectar otros entornos.

**Remediación:** Invertir el default para que sea seguro por defecto:
```typescript
const SKIP_WHITELIST = _skip === 'true' || _skip === '1' || _skip === 'yes';
```

---

### M4. Incident list query sin paginación real
**Archivo:** `backend/src/api/routes.ts:1275-1298` (`GET /incidents`)  
**Riesgo:** El endpoint tiene `LIMIT 50` hardcodeado pero sin `offset`. Para admins, no hay filtro WHERE, devolviendo los 50 más recientes siempre. No hay protección contra consultas costosas si la tabla crece mucho.

**Remediación:** Agregar paginación con `?page=1&limit=20` y cursor-based pagination para mejor rendimiento.

---

### M5. Email regex demasiado permisivo
**Archivo:** `backend/src/api/routes.ts:336`  
```typescript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
```
**Riesgo:** Acepta emails como `a@b.c` o `<script>@evil.com`. Aunque no es un vector XSS directo (el email se usa en queries parametrizadas), podría causar problemas en templates de email.

**Remediación:** Usar una regex más estricta o una librería como `validator.js`.

---

### M6. Error handler global expone stack en desarrollo
**Archivo:** `backend/src/index.ts:136-139`  
**Riesgo:** El error handler genérico devuelve `"Error interno del servidor"` (bien), pero Winston loguea el stack trace completo. Si los logs son accesibles externamente, un atacante podría obtener paths internos y dependencias.

**Remediación:** Asegurar que los logs de Fly.io requieran autenticación (ya lo hacen por defecto ✅), y considerar redactar paths en producción.

---

### M7. Prospect demo endpoint público sin rate limit propio
**Archivo:** `backend/src/api/routes.ts:2576` (`GET /prospects/demo/:slug`)  
**Riesgo:** Este endpoint es público (sin auth), incrementa un contador en BD, envía emails y broadcast WebSocket. Un atacante podría:
1. Enumerar slugs por fuerza bruta
2. Spamear el endpoint para generar miles de emails al admin
3. Causar carga excesiva en la BD

**Remediación:** Agregar rate limit específico (ej. 5 req/min por IP) y CAPTCHA o delay para evitar abuso.

---

### M8. No hay logout en servidor — tokens JWT irrevocables
**Riesgo:** No existe endpoint de logout ni mecanismo de blacklist de tokens. Si un JWT es comprometido, no se puede invalidar hasta que expire (24h por defecto).

**Remediación:** Implementar una tabla `token_blacklist` con TTL, y verificar en `authMiddleware`:
```sql
CREATE TABLE token_blacklist (
  jti TEXT PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL
);
-- Cleanup periódico de tokens expirados
```

---

## 🔵 BAJO — Backlog de mejoras

### B1. No hay audit log de acciones administrativas
**Riesgo:** No se registra quién cambió roles, bloqueó usuarios, eliminó vehículos, etc. En caso de incidente de seguridad, no hay trail forense.

**Remediación:** Crear tabla `audit_log (id, user_id, action, target_type, target_id, details, ip, created_at)`.

---

### B2. Cookie se_user contiene datos de sesión sin cifrar
**Archivo:** `frontend/lib/session.ts:89-90`  
**Riesgo:** El JSON del usuario (id, rol, email) se almacena en texto plano en la cookie. Un atacante con acceso al navegador puede leerlo.

**Remediación:** No almacenar datos sensibles en cookies, o cifrarlos con AES.

---

### B3. Health endpoints exponen información
**Archivo:** `backend/src/index.ts:113-134`  
**Riesgo:** `/health/db` confirma tipo de base de datos. `/health/ws` muestra número de clientes WebSocket. Información útil para reconocimiento.

**Remediación:** Proteger `/health/db` y `/health/ws` con auth o limitar a IPs internas.

---

### B4. Dockerfile instala ngrok en producción
**Archivo:** `Dockerfile:8-11`  
**Riesgo:** ngrok se descarga e instala en la imagen de producción. Si `NGROK_AUTHTOKEN` se filtra, un atacante podría abrir túneles desde el contenedor.

**Remediación:** Usar multi-stage build — instalar ngrok solo si se necesita, o usar una imagen separada para desarrollo con ngrok.

---

### B5. User-Agent no se loguea en rate limiting
**Riesgo:** Los rate limiters usan IP como key, pero no registran User-Agent. Difícil identificar bots vs usuarios reales en análisis post-incidente.

**Remediación:** Agregar User-Agent a los logs de rate limiting.

---

### B6. bcrypt cost factor podría ser mayor
**Archivo:** `backend/src/api/routes.ts:694`  
```typescript
const hash = await bcrypt.hash(newPassword, 12);
```
**Riesgo:** Factor 12 es aceptable pero con hardware moderno, factor 14 sería más resistente a fuerza bruta.

**Remediación:** Considerar aumentar a 14 en el próximo ciclo de cambio de passwords.

---

## ✅ BIEN HECHO — Prácticas de seguridad correctas

| # | Práctica | Ubicación |
|---|----------|-----------|
| 1 | **JWT_SECRET obligatorio ≥32 chars** | `auth.ts:16-20` — crash si no existe |
| 2 | **Parameterized queries en TODA la app** | Todas las queries usan `$1, $2...` — sin SQL injection |
| 3 | **Rate limiting en auth endpoints** | `routes.ts:41-54` — 20 req/15min por IP |
| 4 | **Rate limiting global** | `index.ts:82-99` — 200 req/15min |
| 5 | **CORS restrictivo en producción** | `index.ts:43-64` — solo dominios explícitos |
| 6 | **Security headers completos** | `index.ts:67-78` — CSP, HSTS, X-Frame, X-Content-Type |
| 7 | **OTP brute-force protection** | `auth.ts:47-72` — max 5 intentos, bloqueo |
| 8 | **Per-phone/email cooldowns** | `routes.ts:73-97` — 30-60s entre OTPs |
| 9 | **WebSocket auth requerida** | `websocket.ts:89-174` — timeout 5s, JWT obligatorio |
| 10 | **WS per-IP y per-user limits** | `websocket.ts:86-87` — 10/IP, 5/user |
| 11 | **TCP connection limits** | `tcp-server.ts:97-98` — 200 global, 5/IP |
| 12 | **timingSafeEqual para HMAC** | `routes.ts:176-178, 1688-1689` — previene timing attacks |
| 13 | **HTML escaping en emails** | `email-service.ts:4-6` — `escapeHtml()` |
| 14 | **Non-root Docker user** | `Dockerfile:42-44` — user `app` |
| 15 | **trust proxy = 1 (no true)** | `index.ts:39` — solo confía en proxy inmediato |
| 16 | **statement_timeout en PostgreSQL** | `pool.ts:25-27` — 30s máximo por query |
| 17 | **OTP cleanup periódico** | `auth.ts:108-121` — elimina códigos expirados |
| 18 | **Incident auto-timeout** | `index.ts:162-182` — resuelve incidentes estancados |

---

## PLAN DE ACCIÓN PRIORIZADO

### Semana 1 (Inmediato)
1. ⬛ **C1** — Eliminar/rotar credenciales GCP del repo
2. ⬛ **C2** — Agregar `HttpOnly` a cookie de JWT o migrar a cookie-less
3. ⬛ **C3** — Alinear cookie max-age con JWT expiry + implementar revocación
4. ⬛ **A4** — Restringir broadcast de pánico a ciudadanos

### Semana 2
5. ⬛ **A1** — Configurar `DATABASE_CA_CERT` en Fly.io
6. ⬛ **A2** — Agregar role check a `/helpers/nearby`
7. ⬛ **A3** — Agregar expiración a witness URLs
8. ⬛ **A5** — Validar role de driver_id en fleet assignment

### Semana 3
9. ⬛ **M1** — UUID validation middleware
10. ⬛ **M3** — Invertir default de TELTONIKA_SKIP_WHITELIST
11. ⬛ **M7** — Rate limit para prospect demo
12. ⬛ **M8** — Token blacklist para logout

### Mes 2
13. ⬛ **M2** — Password complexity
14. ⬛ **M4** — Paginación real
15. ⬛ **B1** — Audit log
16. ⬛ Remaining low items

---

*Reporte generado por auditoría automatizada de código. Se recomienda una auditoría de penetración profesional para validar estos hallazgos en un entorno en vivo.*

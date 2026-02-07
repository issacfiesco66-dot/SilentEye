# Auditoría de Seguridad Defensiva – SilentEye

**Fecha:** Febrero 2025  
**Alcance:** Backend (Node.js/TypeScript), TCP Teltonika, API REST, WebSockets, PostgreSQL

---

## Resumen ejecutivo

Se identificaron **vulnerabilidades de severidad alta y media** que requieren mitigación antes de un despliegue en producción. Las áreas más sensibles son la autenticación del WebSocket, el control de acceso (IDOR) en varios endpoints y la exposición de secretos/credenciales.

---

## 1. OWASP Top 10 – Hallazgos

### A01 Broken Access Control

| Hallazgo | Severidad | Descripción |
|----------|-----------|-------------|
| **IDOR en GET /incidents/:id** | Alta | Cualquier usuario autenticado puede consultar cualquier incidente por UUID. Los helpers solo deberían ver incidentes donde están en `incident_followers`; los drivers solo los suyos. |
| **IDOR en GET /gps/logs** | Alta | Cualquier usuario autenticado puede solicitar el historial GPS de cualquier vehículo indicando `vehicle_id`. No hay comprobación de que el vehículo pertenezca al usuario o que tenga permiso. |
| **IDOR en PUT /incidents/:id/status** | Media | Un helper puede cambiar el estado de cualquier incidente. Debería limitarse a incidentes en los que figure en `incident_followers`. |

### A02 Cryptographic Failures

| Hallazgo | Severidad | Descripción |
|----------|-----------|-------------|
| **JWT_SECRET por defecto** | Alta | Si `JWT_SECRET` no está definido, se usa `default_secret_change_in_production`, lo que permite forjar tokens válidos. |
| **Credenciales en código** | Media | `pool.ts` usa credenciales por defecto en el fallback de `DATABASE_URL`. Riesgo de fuga si el código se publica. |

### A05 Security Misconfiguration

| Hallazgo | Severidad | Descripción |
|----------|-----------|-------------|
| **CORS `origin: true`** | Media | Se refleja cualquier origen. En producción debe restringirse a dominios del frontend. |
| **OTP en respuesta** | Media | En desarrollo el OTP se devuelve en la respuesta. En producción el OTP no debe aparecer en la API. |
| **WebSocket sin autenticación** | Crítica | Cualquiera puede conectarse al WebSocket y enviar `{ userId, role: 'admin' }` para recibir todas las ubicaciones y alertas de pánico. |

### A07 Identification and Authentication Failures

| Hallazgo | Severidad | Descripción |
|----------|-----------|-------------|
| **WebSocket sin JWT** | Crítica | El WebSocket no valida JWT. El cliente envía `userId` y `role` en texto plano y se confía sin verificación. |

### A09 Security Logging and Monitoring Failures

| Hallazgo | Severidad | Descripción |
|----------|-----------|-------------|
| **Logs de errores detallados** | Baja | Algunos endpoints exponen `err?.message` en respuestas 500, lo que puede filtrar información sensible. |
| **Logs de autenticación** | Baja | No hay registro de intentos fallidos de login o accesos denegados para análisis forense. |

---

## 2. Seguridad IoT / TCP Teltonika

| Riesgo | Mitigación propuesta |
|--------|----------------------|
| **Paquetes malformados / DoS por memoria** | Validar `dataFieldLength` contra un máximo (ej. 65535 bytes). Rechazar y cerrar conexión si supera el límite. |
| **TCP sin TLS** | En producción, considerar TLS para el canal TCP o red privada/VPN para dispositivos. |
| **Buffer overflow en decodificador** | En `avl-decoder.ts`, reforzar comprobaciones de longitud antes de cada `read*`. Verificar que `offset + size <= data.length` en cada lectura. |
| **IMEI spoofing** | La whitelist actual mitiga esto. Mantener registro de rechazos para auditoría. |

---

## 3. Base de datos

| Riesgo | Mitigación propuesta |
|--------|----------------------|
| **Inyección SQL** | Las consultas usan parámetros preparados; estado actual correcto. |
| **Credenciales en variables de entorno** | Nunca commitear `.env`. Usar secretos gestionados (Vault, AWS Secrets Manager, etc.) en producción. |
| **Conexiones sin límite** | El pool tiene `max: 20`. Valor adecuado. |

---

## 4. Recomendaciones priorizadas

### Críticas (antes de producción)

1. **Autenticación WebSocket**
   - Exigir token JWT en el handshake (query string o header).
   - Validar el token y extraer `userId` y `role` del payload, nunca del mensaje del cliente.

2. **Corregir IDOR en endpoints**
   - `GET /incidents/:id`: Añadir filtro por rol (helper → incidentes en `incident_followers`, driver → `driver_id`, admin → todos).
   - `GET /gps/logs`: Verificar que el usuario tenga permiso sobre el vehículo (admin, helper o conductor del vehículo).
   - `PUT /incidents/:id/status`: En helpers, comprobar que el incidente esté en `incident_followers` para ese usuario.

3. **JWT_SECRET obligatorio**
   - No usar valor por defecto. Validar al arranque que `JWT_SECRET` exista y tenga longitud mínima (ej. 32 caracteres).

### Altas

4. **CORS restrictivo**  
   - `origin`: lista de dominios permitidos (ej. `['https://app.silenteye.com']`).

5. **OTP fuera de la API**  
   - En producción, no devolver el OTP en la respuesta. Solo enviar por SMS/WhatsApp.

6. **Quitar credenciales por defecto en pool**  
   - Si `DATABASE_URL` no está definido, fallar al arrancar en lugar de usar un valor por defecto.

### Medias

7. **Validación de entrada**
   - Límites de longitud para `phone`, `name`, `plate`, `imei`.
   - Validar formato de teléfono (E.164 o similar).

8. **Respuestas de error genéricas**
   - En producción, no exponer `err?.message`. Usar mensajes genéricos y registrar el detalle en logs.

9. **Límite de tamaño de paquete TCP**
   - Rechazar paquetes con `dataFieldLength` superior a un máximo definido.

---

## 5. Checklist de seguridad previo a producción

- [ ] WebSocket con autenticación JWT
- [ ] IDOR corregidos en incidents y gps/logs
- [ ] JWT_SECRET obligatorio y fuerte
- [ ] CORS restrictivo
- [ ] OTP no devuelto en respuesta API
- [ ] Sin credenciales por defecto en código
- [ ] Validación de longitud en inputs
- [ ] Límite de tamaño en paquetes TCP
- [ ] Logs de autenticación y accesos denegados
- [ ] Revisión de headers de seguridad (CSP, HSTS, etc.) en frontend

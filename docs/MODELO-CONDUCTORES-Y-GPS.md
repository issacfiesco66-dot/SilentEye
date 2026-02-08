# Modelo de conductores, GPS y ayuda mutua – SilentEye

## Tu descripción (flujo correcto)

> "Todos son conductores. No existen conductores y aparte helpers. La ayuda es entre conductores siempre. Todos se ayudan entre todos. Cualquiera con GPS puede pedir ayuda a quienes también tienen GPS."

**Resumen:** Una red de conductores (autos, camiones, trailers, etc.) donde cada uno tiene un GPS. Cualquiera puede pedir ayuda y cualquiera cercano puede asistir. Es ayuda mutua, no roles separados.

---

## Cómo funciona HOY en SilentEye (y la diferencia)

### Modelo actual

| Concepto | Implementación actual | Diferencia con tu visión |
|----------|------------------------|--------------------------|
| **Usuario** | `users` con `role`: driver, helper, admin | Hay "driver" y "helper" como roles distintos |
| **Vehículo / GPS** | `vehicles`: plate, imei, driver_id | Vehículo se asocia a UN conductor |
| **Ayuda en pánico** | Solo usuarios con `role = 'helper'` cercanos reciben la alerta | En tu modelo, todos los conductores cercanos deberían recibirla |
| **Ubicación helper** | `POST /helpers/location` – la envía la app del "helper" | En tu modelo, la ubicación viene del GPS del vehículo de cada conductor |

### Registro de GPS (flujo actual)

1. **Admin crea vehículo** en el panel:
   - Placa
   - Nombre
   - **IMEI** (del dispositivo Teltonika)
   - (Opcional) Asigna un conductor (`driver_id`)

2. **Whitelist:** El servidor TCP solo acepta IMEIs que estén en `vehicles.imei`.

3. **Cuando el GPS envía datos:** Se guarda en `gps_logs`. Si el vehículo tiene `driver_id`, se actualiza `users.last_location` con la posición.

4. **Pánico (DIN1):** Se buscan usuarios con `role = 'helper'` dentro de 3 km. Solo ellos ven el incidente y pueden asistir.

---

## Flujo correcto según tu visión

### Registro de GPS

1. Se crea un **vehículo** con IMEI (como ahora).
2. Se asocia (o no) a un **usuario** como conductor.
3. Todos los usuarios que tienen vehículo asignado son "conductores" en la red.
4. Cualquiera con GPS registrado puede:
   - Pedir ayuda (pánico).
   - Recibir alertas de otros conductores cercanos y asistir.

### Ayuda mutua

- Conductor A dispara pánico → sistema busca **conductores cercanos** (cualquiera con vehículo/GPS).
- Los conductores cercanos reciben la alerta.
- No hay rol "helper" separado: todos son conductores que pueden ayudar.

---

## Qué habría que cambiar en el código

### 1. Quién recibe la alerta de pánico

**Hoy:** Solo `role = 'helper'`.

**Objetivo:** Cualquier usuario que tenga vehículo (o GPS reciente) y esté cerca.

Ejemplo de lógica nueva:

```sql
-- En vez de: WHERE u.role = 'helper'
-- Usar: usuarios con vehículo asignado O con ubicación reciente
SELECT u.id FROM users u
JOIN vehicles v ON v.driver_id = u.id
WHERE u.is_active AND (ubicación dentro de 3km)
```

### 2. Rol "helper"

- **Opción A:** Eliminar el rol `helper` y usar solo `driver` (y `admin`).
- **Opción B:** Mantener `helper` como "disponible para ayudar" (ej. toggle en la app).
- **Opción C:** Un solo rol `member` o `driver` para todos los que participan en la red.

### 3. Ubicación de quien asiste

- **Hoy:** El "helper" envía su ubicación con `POST /helpers/location`.
- **Objetivo:** Si el asistente tiene vehículo con GPS, la ubicación puede venir del GPS del vehículo, no de la app.

---

## Resumen rápido

| Pregunta | Respuesta actual | Respuesta según tu visión |
|----------|------------------|---------------------------|
| ¿Quién se registra? | Admin crea usuarios y vehículos | Igual: admin registra vehículos (IMEI) y conductores |
| ¿Cómo se registra un GPS? | Creando un vehículo con IMEI en el panel admin | Igual |
| ¿Quién puede pedir ayuda? | Cualquiera con GPS que active pánico | Igual |
| ¿Quién recibe la alerta? | Solo usuarios con rol "helper" | Todos los conductores cercanos con GPS |
| ¿Quién es "helper"? | Rol distinto, sin vehículo | No existe: todos son conductores que se ayudan entre sí |

---

## Cambios implementados (feb 2025)

1. **gps-service.ts**: `processPanicEvent` ahora busca **conductores cercanos** (usuarios con vehículo asignado y ubicación dentro de 3 km), no solo `role = 'helper'`.
2. **API**: Los endpoints de incidentes y ubicación permiten ahora a `driver` lo mismo que a `helper`:
   - `POST /helpers/location` – driver puede enviar ubicación
   - `PUT /incidents/:id/status` – driver puede marcar "Voy en camino"
   - `DELETE /incidents/:id/followers/me` – driver puede declinar
3. **WebSocket**: El evento `panic` se envía a admin, helper y a los conductores cercanos (no a todos los drivers).
4. **Frontend**: El dashboard de asistencia (HelperDashboardLayout) se muestra tanto para `helper` como para `driver`.

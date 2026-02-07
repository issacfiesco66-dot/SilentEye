# Diseño del Dashboard Helper de SilentEye

Documento técnico y UX para la mejora del dashboard del rol **helper**, orientado a operadores en campo que reaccionan a alertas de pánico desde dispositivos móviles.

---

## 1. Contexto y restricciones

### SilentEye existente
- **Backend**: Node.js, API REST + WebSocket con JWT (`?token=...`)
- **Roles**: admin, helper, driver
- **APIs relevantes para helper**:
  - `GET /api/incidents` → solo incidentes donde el helper está en `incident_followers`
  - `GET /api/incidents/:id` → mismo filtro IDOR
  - `PUT /api/incidents/:id/status` → helper solo puede actualizar incidentes que sigue
  - `POST /helpers/location` → actualiza ubicación del helper
  - `GET /api/vehicles` → helper tiene acceso
- **WebSocket**: eventos `panic` y `location`
- **Tablas**: `incident_followers` (status: notified, en_route, on_site, completed), `helper_locations`

### Restricciones del diseño
- Mobile-first
- Un solo incidente activo a la vez (prioridad del helper)
- Acciones en 1–2 taps
- No mostrar IMEI, datos internos ni listas largas
- Helper no puede resolver incidentes (solo admin)

---

## 2. Arquitectura de pantallas

```
/dashboard (role=helper)
└── HelperDashboardLayout (wrapper condicional)
    ├── HelperHeader (estado + logout)
    ├── HelperIncidentCard (si hay incidente asignado)
    ├── HelperMapSection (mapa simplificado)
    └── SinIncidentePlaceholder (si no hay incidente)
```

---

## 3. Componentes propuestos

### 3.1 `HelperDashboardLayout`
**Responsabilidad**: Contenedor que detecta `role === 'helper'` y renderiza la vista específica de helper en lugar del dashboard genérico.

- **Estados**: `user`, `incidents` (del API filtrado por backend), `activeIncident` (derivado: el primero activo/attending)
- **Lógica**: Un solo incidente activo; si hay varios (caso raro), se toma el más reciente por `started_at`.

### 3.2 `HelperHeader`
**Responsabilidad**: Cabecera compacta con estado del helper y logout.

- **Estados**:
  - `helperStatus`: `'disponible' | 'en_ruta' | 'ocupado' | 'offline'`
  - `wsConnected`: boolean
- **Derivación de estado**:
  - `offline`: WebSocket desconectado
  - `ocupado`: tiene incidente con status `attending` y follower status `on_site`
  - `en_ruta`: tiene incidente asignado y follower status `en_route`
  - `disponible`: tiene incidente `notified` o sin incidente
- **UI**: Badge de estado + nombre + botón Salir (1 tap)

### 3.3 `HelperIncidentCard`
**Responsabilidad**: Tarjeta única del incidente activo asignado al helper. Solo visible si existe incidente en `incident_followers` con status activo/attending.

- **Datos mostrados**:
  - Tipo: `PANIC`
  - Placa del vehículo
  - Tiempo desde activación (relativo: "hace 3 min")
  - Distancia aproximada (helper ↔ vehículo) en km
  - Última actualización GPS (timestamp o "en vivo")
- **Acciones (1–2 taps)**:
  - **"Voy en camino"** → `PUT /incidents/:id/status` con `{ status: 'attending' }` + actualizar `incident_followers.status` a `en_route` (si hay API para ello)
  - **"Abrir en Google Maps"** → enlace `https://www.google.com/maps?q=lat,lng`
  - **"Llamar emergencia"** → `tel:911` (o número configurable)
  - **"No puedo atender"** → requiere endpoint para declinar (ver sección 7)

- **Estados**: `incident`, `vehicleLocation` (de WebSocket o último conocido), `helperLocation`, `loading` para acciones

### 3.4 `HelperMapSection`
**Responsabilidad**: Mapa en tiempo real simplificado: solo vehículo del incidente + posición del helper.

- **Markers**:
  - Marker del vehículo (ubicación live o última reportada)
  - Marker del helper (geolocalización del navegador)
- **Fuente de datos**: WebSocket `location` filtrado por `vehicleId` del incidente activo; geolocalización del helper.
- **Sin mostrar**: otros vehículos, otros helpers, lista de incidentes.

- **Estados**: `vehicleLocation`, `helperLocation`, `wsConnected`, `geoLoading`

### 3.5 `SinIncidentePlaceholder`
**Responsabilidad**: Pantalla cuando el helper no tiene incidente asignado.

- **Mensaje**: "Sin alertas asignadas. Esperando próximas alertas de pánico."
- **Opcional**: mini-mapa centrado en el helper (estado disponible).
- **Sin acciones** excepto logout.

---

## 4. Estados por componente

| Componente              | Estado local                                      | Estado derivado                                  |
|-------------------------|---------------------------------------------------|--------------------------------------------------|
| HelperDashboardLayout   | `user`, `incidents`, `liveLocations`, `wsConnected` | `activeIncident`                                 |
| HelperHeader            | -                                                 | `helperStatus` (de ws, incident, follower)       |
| HelperIncidentCard      | `actionLoading`, `copied`                         | `distance`, `timeAgo`, `vehicleCoords`           |
| HelperMapSection        | `helperLocation`, `geoDone`                       | `vehicleLocation` (de liveLocations + incident)  |
| SinIncidentePlaceholder | -                                                 | -                                                |

---

## 5. Hooks y flujos de datos

### 5.1 `useEffect` – Autenticación y carga inicial
- Verificar `localStorage` (token, user)
- Redirigir a `/login` si no hay token
- Redirigir a `/dashboard` si no es helper (o mostrar vista genérica)

### 5.2 `useEffect` – Fetch incidentes
- `GET /api/incidents` con JWT
- Backend ya filtra por `incident_followers`; el helper solo recibe sus incidentes

### 5.3 `useEffect` – WebSocket
- Conexión: `new WebSocket(WS_URL + '?token=' + encodeURIComponent(token))`
- Eventos:
  - `panic` → añadir/actualizar incidente en estado, notificación push
  - `location` → actualizar `liveLocations` solo para el `vehicleId` del incidente activo (filtrado)

### 5.4 Geolocalización
- `navigator.geolocation.getCurrentPosition` al montar
- `navigator.geolocation.watchPosition` (opcional) para actualizar posición del helper
- Envío periódico: `POST /helpers/location` con `{ latitude, longitude }` (ej. cada 30 s cuando hay incidente activo)

### 5.5 Cálculo de distancia
- Fórmula Haversine o similar entre `helperLocation` y `vehicleLocation`
- Mostrar en km (ej. "1.2 km")

### 5.6 Tiempo relativo
- `started_at` del incidente → "hace X min" (actualizable cada minuto o con librería tipo `date-fns/formatDistanceToNow`)

---

## 6. Flujo de usuario paso a paso

### 6.1 Helper sin incidente
1. Login → `/dashboard`
2. Si `role === 'helper'` y no hay incidentes → `SinIncidentePlaceholder`
3. WebSocket conectado; si llega `panic` → notificación, fetch incidentes, transición a vista con incidente

### 6.2 Helper recibe alerta
1. WebSocket recibe `panic`
2. Notificación del navegador (si permitida)
3. Fetch `GET /api/incidents` (o actualizar estado con payload del panic)
4. Mostrar `HelperIncidentCard` + `HelperMapSection`
5. Mapa centrado entre helper y vehículo

### 6.3 Helper responde "Voy en camino"
1. Tap en "Voy en camino"
2. `PUT /api/incidents/:id/status` con `{ status: 'attending' }`
3. Opcional: actualizar `incident_followers.status` a `en_route` (si existe API)
4. Header pasa a estado "En ruta"
5. Inicio de envío de ubicación vía `POST /helpers/location` (si no estaba activo)

### 6.4 Navegación
1. Tap en "Abrir en Google Maps" → nueva pestaña con coordenadas
2. Tap en "Llamar emergencia" → `tel:911`

### 6.5 "No puedo atender"
1. Tap en "No puedo atender"
2. **Nota**: requiere endpoint para declinar (p. ej. `DELETE /api/incidents/:id/followers/me` o `PUT` con status `declined` en `incident_followers`)

---

## 7. Consideraciones de seguridad y permisos

### 7.1 Permisos backend (ya implementados)
- `GET /api/incidents`: filtrado por `incident_followers`
- `GET /api/incidents/:id`: mismo filtro IDOR
- `PUT /api/incidents/:id/status`: helper solo incidentes que sigue
- Helper no debe poder enviar `status: 'resolved'`; el backend debería rechazarlo (validación adicional recomendada)

### 7.2 Frontend
- No exponer IMEI ni datos internos
- No mostrar acciones de admin (resolver, cancelar, ver todos los incidentes)
- Solo llamar `PUT /incidents/:id/status` con `attending` desde helper; ocultar/deshabilitar `resolved` y `cancelled`

### 7.3 WebSocket
- JWT en query string (ya implementado)
- Filtrar `location` por `vehicleId` del incidente activo para no exponer ubicaciones ajenas

### 7.4 Geolocalización
- Pedir permiso con mensaje claro ("Para mostrar tu posición en el mapa y calcular distancias")
- Manejar rechazo sin bloquear el resto de la UI

---

## 8. Integración con código existente

### Reutilización
- `MapboxMap` / `MapView`: usar con props reducidos (solo `incidents` con un elemento, `liveLocations` filtradas)
- `HelperIncidentActions`: extender o reemplazar por `HelperIncidentCard` con las nuevas acciones y datos
- Lógica de WebSocket del dashboard actual: extraer a hook `useHelperWebSocket` o similar

### Cambios en `/dashboard`
- Detección de rol: si `user.role === 'helper'`, renderizar `HelperDashboardLayout` en lugar del layout actual
- Admin y driver mantienen la vista actual

---

## 9. Resumen de entregables (implementación futura)

| Elemento              | Descripción                                                                 |
|-----------------------|-----------------------------------------------------------------------------|
| HelperDashboardLayout | Layout condicional para helper en `/dashboard`                             |
| HelperHeader          | Estado (disponible/en_ruta/ocupado/offline) + logout                       |
| HelperIncidentCard    | Tarjeta del incidente + acciones (Voy en camino, Maps, Llamar, No puedo)   |
| HelperMapSection      | Mapa con marker vehículo + marker helper                                   |
| SinIncidentePlaceholder | Mensaje cuando no hay incidente asignado                                 |
| useHelperWebSocket    | Hook para WebSocket filtrado para helper                                   |
| useHelperLocation     | Hook para geolocalización + POST /helpers/location                         |

### Pendiente en backend
- Endpoint o convención para "No puedo atender" (declinar incidente)
- Validación: helper no puede enviar `status: 'resolved'` en `PUT /incidents/:id/status`
- API para actualizar `incident_followers.status` (en_route, on_site) si se desea reflejar en el header

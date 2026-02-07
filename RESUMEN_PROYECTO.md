# SilentEye – Resumen del Proyecto

## Estado actual (febrero 2025)

### ✅ Lo que funciona

| Área | Detalle |
|------|---------|
| **Backend** | Servidor TCP Teltonika (5000), API REST (3001), WebSockets (3002), handshake IMEI, decodificador AVL Codec 8/8E, detección de pánico (DIN1) |
| **Base de datos** | PostgreSQL (5433). Soporta PostGIS o schema-simple (Haversine). Tablas: users, vehicles, gps_logs, incidents, incident_followers, helper_locations, otp_codes |
| **Auth** | Login OTP (código en alerta), JWT, roles: admin, helper, driver |
| **IMEI whitelist** | Solo IMEIs registrados en `vehicles` |
| **Frontend** | Login, dashboard, panel admin, proxy /api |
| **Mapbox** | Mapa con incidentes, ubicaciones en vivo, geolocalización del usuario, botón "Mi ubicación" |
| **Helpers** | Panel de acciones al seleccionar incidente: Llamar 911, Copiar ubicación exacta, Abrir en Google Maps. Usa ubicación en tiempo real si está disponible |
| **Simulador** | TCP, IMEI del seed, simulación de pánico |

### Puertos

| Puerto | Servicio |
|--------|----------|
| 3000 | Frontend Next.js |
| 3001 | API REST |
| 3002 | WebSockets |
| 5000 | TCP Teltonika |

### Credenciales de prueba

| Rol | Teléfono |
|-----|----------|
| Admin | +51999999999 |
| Helper | +51999999998 |
| Driver | +51999999997 |

### Cómo ejecutar

```powershell
cd e:\SilentEye
npm run reset:postgis   # Solo si migras a PostGIS
npm run migrate
npm run seed
npm run dev
```

---

## Lo que falta por implementar

| # | Tarea | Prioridad | Descripción |
|---|-------|-----------|-------------|
| 1 | **SMS/WhatsApp para OTP** | Alta | Enviar OTP por SMS o WhatsApp en lugar de mostrarlo en pantalla |
| 2 | **Service Worker (PWA)** | Media | `manifest.json` existe; falta service worker para instalación y modo offline |
| 3 | **Comandos GPRS** | Baja | Cambiar frecuencia del GPS vía Codec 12/14 (el dispositivo no lo soporta de forma estándar) |
| 4 | **Tests** | Media | Tests unitarios y de integración |
| 5 | **Notificaciones push** | Media | Alertar a helpers cercanos con notificaciones push además de WebSocket |
| 6 | **Número emergencia configurable** | Baja | 911 hardcodeado; hacer configurable por país (ej. 105 en Perú) |
| 7 | **Historial de incidentes** | Baja | Ver incidentes resueltos, reportes, etc. |
| 8 | **Actualización ubicación helper** | Media | El frontend no envía `POST /helpers/location` automáticamente; el helper debe hacerlo desde una app o se usa `PUT /me/location` |
| 9 | **Modo offline básico** | Baja | Cachear datos para uso sin conexión |

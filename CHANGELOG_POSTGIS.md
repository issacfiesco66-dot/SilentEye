# Changelog – Migración PostGIS

## Resumen

Migración del esquema a PostGIS para geolocalización escalable. Sin cambios en frontend, lógica de pánico, puertos ni simulador.

---

## 1. Schema (schema.sql)

### Cambios en tablas

| Tabla | Cambio |
|-------|--------|
| **gps_logs** | `geom GEOMETRY(Point, 4326)` añadido; se mantienen `latitude`, `longitude` |
| **incidents** | `geom GEOMETRY(Point, 4326)` añadido; se mantienen `latitude`, `longitude` |
| **users** | `last_location GEOMETRY(Point, 4326)` (antes `last_lat`, `last_lng`) |
| **helper_locations** | Nueva tabla: `user_id`, `geom`, `updated_at` |

### Índices espaciales GIST

- `idx_gps_logs_geom`
- `idx_incidents_geom`
- `idx_users_last_location`
- `idx_helper_locations_geom`

### Requisito: PostGIS instalado

Si `CREATE EXTENSION postgis` falla con «no está disponible», instala PostGIS en tu PostgreSQL (Stack Builder en Windows, o paquete `postgis` en Linux).

### Migración desde schema-simple

**Reinicio necesario.** Si tenías schema-simple:

```sql
psql -d silenteye -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres;"
```

Luego: `npm run migrate` y `npm run seed`.

---

## 2. Consultas geoespaciales (PostGIS)

### Sustitución de Haversine por ST_DWithin

| Antes (Haversine) | Después (PostGIS) |
|-------------------|-------------------|
| `6371000 * acos(...)` | `ST_DWithin(geom::geography, punto::geography, metros)` |
| `last_lat`, `last_lng` | `ST_SetSRID(ST_MakePoint(lng, lat), 4326)` |
| Comparación manual | `ST_Distance` para ordenar |

### Archivos modificados

- **gps-service.ts**: `INSERT` con `ST_SetSRID(ST_MakePoint)`, consulta de helpers cercanos con `ST_DWithin` sobre `helper_locations`
- **routes.ts**: `/me`, `PUT /me/location`, `GET /helpers/nearby` usando PostGIS

---

## 3. Ubicación de helpers en tiempo real

### Nueva tabla: helper_locations

```sql
helper_locations (user_id PK, geom, updated_at)
```

### Nuevo endpoint: POST /helpers/location

- **Auth**: JWT requerido
- **Rol**: `helper`
- **Body**: `{ "latitude": number, "longitude": number }`
- **Acción**: Actualiza `helper_locations` y `users.last_location` (upsert)

Los helpers deben enviar su ubicación cada X segundos vía este endpoint para que la detección de cercanía funcione.

---

## 4. Whitelist de IMEI

- **Origen**: `vehicles.imei`
- **Regla**: Solo se aceptan dispositivos cuyo IMEI está registrado en `vehicles`
- **Comportamiento**: Si el IMEI no está en la whitelist, se envía ACK 0x00 y se cierra la conexión TCP
- **Logs**: `IMEI rechazado (no registrado en whitelist): XXXXX`

Archivo: `teltonika/tcp-server.ts`

---

## Compatibilidad

- Simulador: IMEI `356307042441013` incluido en el seed → sigue funcionando
- Puertos: sin cambios (5000, 3001, 3002, 3000)
- Frontend: sin cambios

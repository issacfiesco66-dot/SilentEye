# Solución: OTP 500 (Error al generar OTP)

El error 500 en `/api/auth/otp/request` indica que **la base de datos no está conectada** o **las tablas no existen**.

---

## 1. Verificar estado de la base de datos

Después de desplegar, visita:
```
https://silenteye-3rrwnq.fly.dev/health/db
```

- **`database: "connected"`** → La BD funciona. El problema puede ser que las tablas no existen.
- **`database: "disconnected"`** → Falta configurar `DATABASE_URL` o la conexión es incorrecta.

---

## 2. Configurar PostgreSQL en Fly.io

### Opción A: Crear Postgres en Fly (recomendado)

```powershell
# 1. Crear base de datos Postgres
flyctl postgres create --name silenteye-db --region dfw

# 2. Vincular a tu app (inyecta DATABASE_URL automáticamente)
flyctl postgres attach silenteye-db -a silenteye-3rrwnq

# 3. Redesplegar para que las migraciones creen las tablas
flyctl deploy -a silenteye-3rrwnq --config fly.toml
```

### Opción B: Postgres externo (Railway, Supabase, Neon, etc.)

1. Crea una base de datos en tu proveedor
2. Obtén la URL de conexión (ej: `postgresql://user:pass@host:5432/dbname`)
3. En Fly → **Secrets** → **Set secret**:
   - **Nombre:** `DATABASE_URL`
   - **Valor:** tu URL de conexión (con `?sslmode=require` si usa SSL)

---

## 3. Verificar que las tablas existen

El `release_command` en fly.toml ejecuta migraciones en cada deploy. Si las tablas no se crearon:

```powershell
# Conectarse por SSH y ejecutar migración manualmente
flyctl ssh console -a silenteye-3rrwnq -C "node dist/db/migrate.js"
```

---

## 4. Crear usuario admin (seed)

Después de que la BD funcione, crea el usuario admin para poder hacer login:

```powershell
flyctl ssh console -a silenteye-3rrwnq -C "node dist/db/seed.js"
```

Esto crea: Admin +51999999999, Helper +51999999998, Driver +51999999997 (todos con código 123456 para desarrollo).

---

## 5. Resumen rápido

| Paso | Acción |
|------|--------|
| 1 | `flyctl postgres create --name silenteye-db --region dfw` |
| 2 | `flyctl postgres attach silenteye-db -a silenteye-3rrwnq` |
| 3 | `flyctl deploy -a silenteye-3rrwnq --config fly.toml` |
| 4 | Esperar deploy y probar https://silenteye-3rrwnq.fly.dev/health/db |
| 5 | `flyctl ssh console -a silenteye-3rrwnq -C "node dist/db/seed.js"` |
| 6 | Probar login en el frontend |

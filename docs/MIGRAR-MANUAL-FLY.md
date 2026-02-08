# Ejecutar migraciones manualmente en Fly.io

El `release_command` se desactivó porque fallaba. Ejecuta las migraciones a mano después de cada deploy (solo la primera vez o cuando añadas tablas nuevas).

---

## Opción 1: Con flyctl (terminal)

```powershell
# Migraciones (crear tablas)
flyctl ssh console -a silenteye-3rrwnq -C "node dist/db/migrate.js"

# Seed (crear usuario admin de prueba)
flyctl ssh console -a silenteye-3rrwnq -C "node dist/db/seed.js"
```

---

## Opción 2: Desde el Dashboard de Fly (sin flyctl)

1. Entra en https://fly.io/apps/silenteye-3rrwnq
2. Abre **Console** o **SSH** (menú de la app)
3. Conéctate a la máquina
4. Ejecuta:
   ```bash
   node dist/db/migrate.js
   ```
5. Luego:
   ```bash
   node dist/db/seed.js
   ```

---

## Verificar

- **BD conectada:** https://silenteye-3rrwnq.fly.dev/health/db
- **Login:** Usuario del seed (ej. +51999999999, código 123456)

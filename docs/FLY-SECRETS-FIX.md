# Solución: Máquinas reiniciando (JWT_SECRET obligatorio)

La app crashea al arrancar con:
```
Error: JWT_SECRET es obligatorio y debe tener al menos 32 caracteres.
```

## Solución rápida

### Opción 1: Fly.io Dashboard (Web)

1. Entra a https://fly.io/apps/silenteye-3rrwnq
2. **Secrets** (menú lateral)
3. **Set secret**
4. Añade:
   - **JWT_SECRET** = `silenteye_prod_2026_cambiar_por_valor_seguro_32chars` (o genera uno más largo)
5. Si tienes Postgres: añade **DATABASE_URL** con tu conexión

### Opción 2: Línea de comandos (flyctl)

```powershell
# JWT_SECRET (obligatorio)
flyctl secrets set JWT_SECRET="silenteye_prod_2026_cambiar_por_valor_seguro_32chars" -a silenteye-3rrwnq

# DATABASE_URL (si usas Postgres en Fly)
flyctl postgres attach silenteye-db -a silenteye-3rrwnq

# O si tu Postgres está en otro proveedor:
flyctl secrets set DATABASE_URL="postgresql://user:pass@host:5432/silenteye" -a silenteye-3rrwnq
```

### Después de configurar

Las máquinas se reiniciarán automáticamente. O fuerza un deploy:

```powershell
flyctl deploy -a silenteye-3rrwnq --config fly.toml
```

---

## Verificar

```powershell
flyctl secrets list -a silenteye-3rrwnq
flyctl logs -a silenteye-3rrwnq
```

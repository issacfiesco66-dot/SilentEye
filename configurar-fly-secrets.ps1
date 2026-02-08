# Configurar secretos en Fly.io para silenteye-3rrwnq
# La app crashea porque faltan JWT_SECRET y probablemente DATABASE_URL
#
# OPCION A - Desde PowerShell (con flyctl instalado):
# ------------------------------------------------

$APP = "silenteye-3rrwnq"

# 1. JWT_SECRET (OBLIGATORIO - la app crashea sin él)
# Ejecuta esto - usa un valor de al menos 32 caracteres:
flyctl secrets set "JWT_SECRET=silenteye_prod_jwt_2026_cambiar_por_seguro_32chars" -a $APP

# 2. DATABASE_URL - Si usas Postgres en Fly:
#    flyctl postgres attach silenteye-db -a $APP
#
#    Si usas Postgres externo:
#    flyctl secrets set "DATABASE_URL=postgresql://user:pass@host:5432/silenteye" -a $APP

Write-Host "`nListo. Verifica: flyctl secrets list -a $APP"
Write-Host "Despliega: flyctl deploy -a $APP --config fly.toml"

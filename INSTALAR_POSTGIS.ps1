# INSTALAR_POSTGIS.ps1
# Opción 1: Docker (recomendado, un solo comando)
# Opción 2: Stack Builder (PostgreSQL ya instalado)

$ErrorActionPreference = "Stop"

Write-Host "=== SilentEye - Instalacion PostgreSQL + PostGIS ===" -ForegroundColor Cyan
Write-Host ""

# --- OPCION A: Docker ---
$dockerReady = $false
if (Get-Command docker -ErrorAction SilentlyContinue) {
    try {
        $null = docker info 2>&1
        $dockerReady = ($LASTEXITCODE -eq 0)
    } catch {
        $dockerReady = $false
    }
    if (-not $dockerReady) {
        Write-Host "Docker instalado pero no esta corriendo. Inicia Docker Desktop y vuelve a ejecutar." -ForegroundColor Yellow
        Write-Host ""
    }
}

if ($dockerReady) {
    Write-Host "Docker detectado. Creando contenedor PostgreSQL+PostGIS..." -ForegroundColor Green
    Write-Host "(Si falla por puerto 5433 en uso, deten Postgres actual o edita el puerto en este script)" -ForegroundColor DarkGray
    $pass = "Silenteye1989"
    $port = "5433"
    
    # Detener contenedor previo si existe (sin fallar si no existe)
    $ErrorActionPreference = "SilentlyContinue"
    docker stop silenteye-db 2>$null | Out-Null
    docker rm silenteye-db 2>$null | Out-Null
    $ErrorActionPreference = "Stop"
    
    docker run -d --name silenteye-db `
        -e POSTGRES_PASSWORD=$pass `
        -e POSTGRES_DB=silenteye `
        -p "${port}:5432" `
        postgis/postgis:16-3.4
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "Contenedor creado. Esperando 5 segundos a que arranque..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
        Write-Host ""
        Write-Host "PostgreSQL + PostGIS listo en localhost:$port" -ForegroundColor Green
        Write-Host "Usuario: postgres | Password: $pass | DB: silenteye" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Siguiente paso:" -ForegroundColor Cyan
        Write-Host "  npm run migrate" -ForegroundColor White
        Write-Host "  npm run seed" -ForegroundColor White
        exit 0
    }
}

# --- OPCION B: Stack Builder (PostgreSQL ya instalado) ---
Write-Host "Buscando Stack Builder (PostgreSQL instalado)..." -ForegroundColor Yellow
$pgPaths = @(
    "C:\Program Files\PostgreSQL\17\Stack Builder.exe",
    "C:\Program Files\PostgreSQL\16\Stack Builder.exe",
    "C:\Program Files\PostgreSQL\15\Stack Builder.exe",
    "C:\Program Files (x86)\PostgreSQL\17\Stack Builder.exe",
    "C:\Program Files (x86)\PostgreSQL\16\Stack Builder.exe"
)

$found = $false
foreach ($p in $pgPaths) {
    if (Test-Path $p) {
        Write-Host "Encontrado: $p" -ForegroundColor Green
        Write-Host "Abriendo Stack Builder. Selecciona: PostgreSQL -> PostGIS" -ForegroundColor Cyan
        Start-Process $p
        $found = $true
        break
    }
}

if ($found) {
    Write-Host ""
    Write-Host "Cuando termines de instalar PostGIS, ejecuta:" -ForegroundColor Yellow
    Write-Host "  psql -U postgres -d silenteye -c `"CREATE EXTENSION postgis;`"" -ForegroundColor White
    Write-Host "  npm run migrate" -ForegroundColor White
    exit 0
}

# --- No hay Docker ni Stack Builder ---
Write-Host ""
Write-Host "No se encontro Docker ni Stack Builder." -ForegroundColor Red
Write-Host ""
Write-Host "OPCION 1 - Docker (mas facil):" -ForegroundColor Cyan
Write-Host "  1. Instala Docker Desktop: https://www.docker.com/products/docker-desktop" -ForegroundColor Gray
Write-Host "  2. Ejecuta de nuevo este script" -ForegroundColor Gray
Write-Host ""
Write-Host "OPCION 2 - PostgreSQL + PostGIS manual:" -ForegroundColor Cyan
Write-Host "  1. Descarga PostgreSQL: https://www.postgresql.org/download/windows/" -ForegroundColor Gray
Write-Host "  2. Durante la instalacion, incluye Stack Builder" -ForegroundColor Gray
Write-Host "  3. Despues de instalar, ejecuta Stack Builder y agrega PostGIS" -ForegroundColor Gray
Write-Host "  4. psql -U postgres -d silenteye -c `"CREATE EXTENSION postgis;`"" -ForegroundColor Gray
Write-Host ""
exit 1

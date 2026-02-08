# Desplegar SilentEye desde main en Fly.io

## Problema
Fly está desplegando desde la rama `fix-tsc-not-found-...` (creada por Fly con Dockerfile preset) en lugar de `main`, que ya tiene el fix.

## Solución

### Opción 1: Cambiar el branch de deploy en Fly (recomendado)

1. Entra a [Fly.io Dashboard](https://fly.io/dashboard)
2. Selecciona la app **silenteye**
3. Ve a **Settings** → **Source**
4. Cambia el branch de deploy a **main**
5. Guarda y haz **Retry deployment** o **Deploy**

### Opción 2: Desplegar desde la terminal (usa tu Dockerfile local)

Si tienes `flyctl` instalado:

```powershell
cd e:\SilentEye
fly deploy -a silenteye
```

Esto usa tu `fly.toml` y `Dockerfile` locales (que ya tienen el fix).

### Opción 3: Actualizar el preset en Fly

Si Fly sigue usando el Dockerfile preset:

1. En el dashboard de Fly, abre la app
2. Ve a **Deploy** o **Build**
3. Busca "Use preset Dockerfile" o similar
4. Desactívalo para que use el Dockerfile del repo
5. O pega manualmente el contenido correcto del `Dockerfile` del repo

---

## Verificar que el fix está en main

```powershell
git show main:Dockerfile | Select-String "RUN"
```

Debe mostrar: `RUN npx tsc -p backend` (no `npm run build -w backend`).

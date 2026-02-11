# Deploy automático en cada cambio

Al hacer **push a `main` o `master`**, GitHub Actions despliega automáticamente:

- **Backend** → Fly.io
- **Frontend** → Vercel

---

## Configurar los secretos en GitHub

1. Ve a tu repositorio en GitHub → **Settings** → **Secrets and variables** → **Actions**

2. Añade estos secretos:

### Fly.io (obligatorio para backend)

| Secreto        | Cómo obtenerlo                          |
|----------------|------------------------------------------|
| `FLY_API_TOKEN` | `flyctl tokens create deploy` en tu máquina |

### Vercel (obligatorio para frontend)

| Secreto           | Cómo obtenerlo                                                                 |
|-------------------|---------------------------------------------------------------------------------|
| `VERCEL_TOKEN`    | [vercel.com/account/tokens](https://vercel.com/account/tokens) → Create Token   |
| `VERCEL_ORG_ID`   | En `vercel.json` del proyecto o en **Vercel** → Project → Settings → General  |
| `VERCEL_PROJECT_ID` | En **Vercel** → Project → Settings → General (Project ID)                    |

Para obtener `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID`:

```bash
cd e:\SilentEye
npx vercel link
# Selecciona el proyecto existente
cat .vercel/project.json
# Ahí verás orgId y projectId
```

---

## Comportamiento

- **Push a `main` o `master`** → Se ejecutan los dos jobs en paralelo
- Los jobs son independientes: si uno falla, el otro puede haber terminado bien
- Puedes ver el estado en la pestaña **Actions** del repositorio

---

## Si no usas GitHub

Puedes seguir desplegando manualmente:

```powershell
cd e:\SilentEye
vercel --prod          # Frontend
fly deploy             # Backend
```

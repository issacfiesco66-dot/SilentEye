# Configurar CORS – Paso a paso

CORS permite que tu frontend (en otro dominio) pueda llamar a la API del backend.

---

## 1. ¿Qué está configurado ya?

En `fly.toml` tienes:

```
CORS_ORIGINS = "http://localhost:3000,https://silenteye-3rrwnq.fly.dev"
```

Esto permite:
- **localhost:3000** – Frontend local al probar contra la API en Fly
- **silenteye-3rrwnq.fly.dev** – Peticiones desde el mismo dominio del backend

---

## 2. Añadir tu frontend en producción

Cuando despliegues el frontend (Vercel, Netlify, etc.), debes añadir su URL a CORS.

### Opción A: Fly Dashboard

1. Entra en https://fly.io/apps/silenteye-3rrwnq  
2. **Secrets** (menú lateral)  
3. **Set secret**  
4. **Nombre:** `CORS_ORIGINS`  
5. **Valor:** lista de URLs separadas por coma, por ejemplo:
   ```
   http://localhost:3000,https://silenteye-3rrwnq.fly.dev,https://tu-app.vercel.app
   ```
   O con dominio propio:
   ```
   http://localhost:3000,https://silenteye-3rrwnq.fly.dev,https://app.tudominio.com,https://www.tudominio.com
   ```
6. Guardar. Fly reiniciará las máquinas automáticamente.

### Opción B: Línea de comandos (flyctl)

```powershell
flyctl secrets set CORS_ORIGINS="http://localhost:3000,https://silenteye-3rrwnq.fly.dev,https://tu-frontend.vercel.app" -a silenteye-3rrwnq
```

> Los Secrets sobrescriben las variables de `fly.toml`. Si defines `CORS_ORIGINS` como Secret, tendrás que incluir todos los orígenes que quieras permitir.

---

## 3. Comprobar que CORS funciona

1. Abre tu frontend en el navegador.  
2. Haz login o cualquier petición a la API.  
3. Si CORS falla, en la consola del navegador (F12) verás algo como:
   ```
   Access to fetch at 'https://silenteye-3rrwnq.fly.dev/api/...' from origin 'https://tu-frontend.com' has been blocked by CORS policy
   ```
4. En ese caso, añade `https://tu-frontend.com` a `CORS_ORIGINS`.

---

## 4. URLs habituales a incluir

| Caso | URL a añadir |
|------|--------------|
| Desarrollo local | `http://localhost:3000` |
| Vercel | `https://tu-proyecto.vercel.app` |
| Netlify | `https://tu-app.netlify.app` |
| Dominio propio | `https://app.tudominio.com` |
| Varias versiones del mismo dominio | `https://www.tudominio.com` y `https://tudominio.com` |

---

## 5. Tras cambiar CORS

Las máquinas se reinician solas. O puedes forzar un reinicio:

```powershell
flyctl apps restart silenteye-3rrwnq
```

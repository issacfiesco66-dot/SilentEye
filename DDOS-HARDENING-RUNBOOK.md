# SilentEye — Runbook de Endurecimiento Anti-DDoS

**Audiencia:** Christian (operador único).
**Tiempo total:** ~3 horas, dividido en 3 fases.
**Costo:** $0 (planes free de Cloudflare + Upstash) + ~$2/mes (VM extra en Fly).
**Estado actual:** la app está expuesta directo a internet, sin CDN/WAF. 10k req/s la tiran en ~30 segundos.
**Estado al terminar:** absorbe múltiples Gbps, rate-limit distribuido entre VMs, sin punto único de fallo.

> Si solo tienes 30 minutos hoy, haz **Fase 1** completa. Mueve el riesgo de "crítico" a "manejable".

---

## Fase 1 — Cloudflare delante (30–60 min, $0)

### 1.1 Crear cuenta y agregar el dominio

1. Crea cuenta en [cloudflare.com](https://www.cloudflare.com/) (plan **Free**).
2. *Add a Site* → introduce `silenteye.mx`.
3. Cloudflare escanea tus DNS actuales. Revisa que detecte:
   - `silenteye.mx` (apex) y `www.silenteye.mx` apuntando a Vercel
   - `api.silenteye.mx` (si ya existe) apuntando a Fly
4. Selecciona plan **Free** ($0/mes).
5. Cloudflare te muestra **2 nameservers** (algo como `nina.ns.cloudflare.com` + `rick.ns.cloudflare.com`).

### 1.2 Cambiar nameservers en tu registrador

Donde compraste `silenteye.mx` (GoDaddy, Namecheap, NIC México, etc.):

1. Entra al panel de DNS del dominio.
2. Cambia los nameservers a los **2 que te dio Cloudflare**. Borra los anteriores.
3. **Propagación:** 5 min a 24 h (típico 30 min). Cloudflare te notifica por email cuando termina.

### 1.3 Configurar registros DNS con Proxy activo

En el panel DNS de Cloudflare, asegúrate que cada registro tenga la **nube naranja activa** (Proxied), no la gris (DNS only):

| Tipo  | Nombre | Contenido                            | Proxy |
|-------|--------|--------------------------------------|-------|
| CNAME | `@`    | `cname.vercel-dns.com`               | 🟠 ON  |
| CNAME | `www`  | `cname.vercel-dns.com`               | 🟠 ON  |
| CNAME | `api`  | `silenteye-3rrwnq.fly.dev`           | 🟠 ON  |

> ⚠️ Para el subdominio `api`: Fly.io necesita que agregues `api.silenteye.mx` en `fly certs`:
> ```bash
> flyctl certs add api.silenteye.mx -a silenteye-3rrwnq
> ```
> Cuando Cloudflare está delante (con Proxy), Fly emite el cert via el flujo `Origin Server` — sigue las instrucciones de `fly certs check api.silenteye.mx`.

### 1.4 Activar protecciones (toma 5 clicks)

En el panel de Cloudflare → **Security**:

- **Bot Fight Mode** → ON (filtra bots conocidos, gratis)
- **Security Level** → **Medium** (revisa challenge a IPs con mala reputación)
- **Browser Integrity Check** → ON
- **DDoS Protection** → confirma que está activo (es automático en Free)

En **SSL/TLS**:
- Modo → **Full (strict)** — requiere que Fly tenga cert válido (ya lo tiene)
- **Always Use HTTPS** → ON
- **Automatic HTTPS Rewrites** → ON
- **Minimum TLS Version** → 1.2

En **Rules → Page Rules** (3 gratis en Free):
- `api.silenteye.mx/api/auth/*` → Security Level: High, Cache Level: Bypass
- `api.silenteye.mx/api/prospects/demo/*` → Security Level: High

### 1.5 Verificar que está funcionando

```bash
curl -sI https://api.silenteye.mx/health | grep -i 'cf-ray\|server'
# Debes ver:
#   cf-ray: 8f2a1b3c4d5e-DFW
#   server: cloudflare
```

Si ves `server: Fly/...` en lugar de `cloudflare`, el Proxy no está activo (nube gris). Vuelve a 1.3.

### 1.6 Actualizar CORS en Fly

Tu CORS actual (`fly.toml:13`) ya incluye `silenteye.mx` ✅. Solo agrega `api.silenteye.mx` si vas a usar ese subdominio para el backend desde el frontend:

```bash
flyctl secrets set CORS_ORIGINS='https://silenteye-3rrwnq.fly.dev,https://silent-eye-frontend.vercel.app,https://silenteye.mx,https://www.silenteye.mx,https://api.silenteye.mx' -a silenteye-3rrwnq
```

> Nota: el código ya lee `cf-connecting-ip` para rate-limit por IP real ([index.ts:143](backend/src/index.ts:143), [routes.ts:2894](backend/src/api/routes.ts:2894)). No hay nada que cambiar.

---

## Fase 2 — Turnstile en login y demo (30 min, $0)

Cloudflare Turnstile es un CAPTCHA invisible que reemplaza reCAPTCHA. Gratis, sin tracking de usuarios.

### 2.1 Crear sitio en Turnstile

1. Cloudflare panel → **Turnstile** → *Add Site*.
2. Domain: `silenteye.mx`
3. Widget Mode: **Managed** (recomendado — Cloudflare decide cuándo mostrar challenge)
4. Cloudflare te da:
   - **Site Key** (público, va al frontend)
   - **Secret Key** (privado, va al backend)

### 2.2 Configurar secrets

**Frontend (Vercel):**
```
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAA...    # tu site key
```

**Backend (Fly):**
```bash
flyctl secrets set TURNSTILE_SECRET=0x4AAAB... -a silenteye-3rrwnq
```

### 2.3 Snippet de integración en el frontend

Agrega al `<head>` del layout principal (`frontend/app/layout.tsx`):
```html
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
```

En tu form de login (`frontend/app/login/page.tsx` o equivalente), justo antes del botón submit:
```tsx
<div
  className="cf-turnstile"
  data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
  data-callback="onTurnstileSuccess"
/>
```

Captura el token en JS:
```tsx
const [turnstileToken, setTurnstileToken] = useState('');
useEffect(() => {
  (window as any).onTurnstileSuccess = (token: string) => setTurnstileToken(token);
}, []);
```

Envíalo en el body del OTP request:
```tsx
fetch('/api/auth/otp/request', {
  method: 'POST',
  body: JSON.stringify({ phone, turnstileToken }),
  ...
});
```

### 2.4 Validar el token en el backend

Crea un helper en `backend/src/services/turnstile.ts`:
```typescript
const SECRET = process.env.TURNSTILE_SECRET || '';
export async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  if (!SECRET) return true; // dev: si no hay secret, no bloquea
  if (!token) return false;
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: `secret=${SECRET}&response=${token}&remoteip=${ip}`,
  });
  const j = await r.json() as { success: boolean };
  return j.success === true;
}
```

Llámalo al inicio de los endpoints sensibles. En `routes.ts` para `POST /auth/otp/request`:
```typescript
const ok = await verifyTurnstile(req.body.turnstileToken, req.ip);
if (!ok) {
  res.status(403).json({ error: 'Captcha inválido' });
  return;
}
```

Aplica también a `GET /prospects/demo/:slug` y al form de SOS.

---

## Fase 3 — Fly: escalar y reducir blast radius (15 min, ~$2/mes)

### 3.1 Mínimo 2 máquinas (evita single point of failure)

Edita `fly.toml`:
```toml
[http_service]
  min_machines_running = 2     # antes: 1
  # ... resto igual
```

```bash
flyctl deploy --build-arg INSTALL_NGROK=true -a silenteye-3rrwnq
```

> El `--build-arg INSTALL_NGROK=true` mantiene ngrok (lo necesitas según el README). Cuando migres todos los Teltonika a TCP directo (puertos 5000/8443/15140), cambia a `false`.

### 3.2 Aumentar concurrency y agregar auto-scaling

En `fly.toml`:
```toml
[http_service.concurrency]
  type = 'requests'
  hard_limit = 250     # antes: 100 — VMs modernas aguantan más
  soft_limit = 200     # antes: 80
```

Para auto-escalar bajo carga, usa la CLI:
```bash
flyctl autoscale set min=2 max=5 -a silenteye-3rrwnq
```

### 3.3 Confirmar el deploy

```bash
flyctl status -a silenteye-3rrwnq
# Debes ver 2 machines en estado "started"

flyctl logs -a silenteye-3rrwnq | grep -i "boot\|listening"
```

---

## Fase 4 — Rate-limit distribuido con Upstash Redis (1 hora, $0)

`express-rate-limit` actualmente guarda contadores en memoria por VM. Con 2+ VMs, un atacante distribuido tiene 2x el límite efectivo. Upstash Redis lo arregla.

### 4.1 Crear instancia Upstash

1. Cuenta en [upstash.com](https://upstash.com/) (Free: 10k comandos/día).
2. Create Database:
   - Name: `silenteye-ratelimit`
   - Type: **Regional** (no Global — más barato y suficiente)
   - Region: `us-east-1` (cerca de `dfw` de Fly)
   - Plan: **Free**
3. Copia el `REDIS_URL` que se ve `rediss://default:****@****.upstash.io:6379`.

### 4.2 Agregar secret en Fly

```bash
flyctl secrets set REDIS_URL='rediss://default:xxx@xxx.upstash.io:6379' -a silenteye-3rrwnq
```

### 4.3 Instalar dependencias

```bash
cd backend
npm install rate-limit-redis ioredis
```

### 4.4 Actualizar el store en `backend/src/index.ts`

Reemplaza el setup del rate limiter global con:
```typescript
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1, enableReadyCheck: false })
  : null;

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: RATE_LIMIT_MAX,
    message: { error: 'Demasiadas peticiones' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'OPTIONS',
    // Fallback a memoria si Redis no está disponible — no romper boot si Upstash falla
    store: redis ? new RedisStore({ sendCommand: (...args) => redis.call(...args) }) : undefined,
    keyGenerator: (req) => {
      const cfIp = req.headers['cf-connecting-ip'];
      if (typeof cfIp === 'string') return cfIp;
      const forwarded = req.headers['x-forwarded-for'];
      if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
      return req.ip || req.socket?.remoteAddress || 'unknown';
    },
  })
);
```

Haz lo mismo con `authRateLimit`, `panicRateLimit`, `mediaUploadLimit`, `prospectDemoRateLimit`, `diagRateLimit`, `dbHealthRateLimit` en [routes.ts](backend/src/api/routes.ts) e [index.ts](backend/src/index.ts).

> ⚠️ Free tier de Upstash es 10k cmd/día. Cada request consume 1–2 comandos. Si tu tráfico supera ~5k req/día, considera upgrade a `Pay as you go` (~$0.20 por 100k comandos).

### 4.5 Verificar

```bash
flyctl logs -a silenteye-3rrwnq | grep -i "redis\|ratelimit"
# Debes ver señales de que Redis está conectado, no "ECONNREFUSED"
```

En Upstash dashboard verás los comandos llegar en tiempo real.

---

## Fase 5 — Limpieza opcional (cuando tengas tiempo)

### 5.1 Quitar ngrok del Dockerfile

Cuando hayas migrado todos los Teltonika a TCP directo (`silenteye-3rrwnq.fly.dev:5000` o puerto alterno):

```bash
flyctl deploy --build-arg INSTALL_NGROK=false -a silenteye-3rrwnq
flyctl secrets unset NGROK_AUTHTOKEN NGROK_TCP_URL -a silenteye-3rrwnq
```

Esto reduce ~50 MB de la imagen y elimina la posibilidad de tunneling reverso si el token se filtra.

### 5.2 Geo-blocking en Cloudflare

Si SilentEye solo opera en México/USA:

Cloudflare → **Security → WAF → Custom Rules**:
- Rule name: `Block non-MX-US traffic`
- If: `Country != MX AND Country != US`
- Then: **Block**

Esto detiene el 70-90% de tráfico de bots residenciales (la mayoría vienen de IPs en Asia/Europa del Este).

### 5.3 Subir pool de Postgres

Si Upstash + Cloudflare reducen el ruido y aún ves saturación de pool:
- En `backend/src/db/pool.ts:14` cambia `max: 20` → `max: 50`.
- Confirma que tu Postgres (Fly Postgres, Supabase, Neon) soporta ≥100 conexiones.

### 5.4 Cuotas diarias para SMS/email

Crea una tabla `daily_quotas` y un middleware que decrementa antes de enviar:
- `MAX_OTP_SMS_PER_DAY=500`
- `MAX_OTP_EMAIL_PER_DAY=2000`

Esto te protege del peor escenario: que alguien queme tu saldo de Twilio antes de que te enteres.

---

## Checklist de aceptación

Al terminar Fase 1+2+3 ya estás en buena forma. Marca cada uno:

- [ ] `curl -sI https://api.silenteye.mx/health` devuelve `server: cloudflare`
- [ ] Login muestra el widget de Turnstile (puede ser invisible)
- [ ] OTP rechaza el request si el token Turnstile falta o es inválido
- [ ] `flyctl status -a silenteye-3rrwnq` muestra 2 machines started
- [ ] Cloudflare → Analytics muestra tráfico siendo proxied
- [ ] Bot Fight Mode bloquea al menos 1 request en las primeras 24h (es normal)
- [ ] (Si hiciste Fase 4) `flyctl logs` muestra Redis conectado, no en memoria

## Rollback

Cada fase es reversible:
- **Cloudflare:** cambia los registros a "DNS only" (nube gris) → tráfico va directo a Vercel/Fly otra vez.
- **Turnstile:** `flyctl secrets unset TURNSTILE_SECRET` → backend deja de validar token.
- **Fly autoscale:** `flyctl autoscale set min=1 max=1` → vuelve al estado previo.
- **Upstash:** `flyctl secrets unset REDIS_URL` → rate-limit vuelve a memoria.

---

## Estimación de costos a 30 días

| Item                                   | Costo/mes |
|----------------------------------------|-----------|
| Cloudflare Free (DNS + WAF + Turnstile)| **$0**    |
| Upstash Redis Free (10k cmd/día)       | **$0**    |
| Fly VM extra (shared-cpu-1x 256MB)     | ~$2       |
| **Total mínimo**                       | **~$2**   |
| Si necesitas Cloudflare Pro (WAF avanzado) | +$20  |
| Si excedes 10k cmd Upstash → PAYG      | +$1–5     |

## Bibliografía interna

- Auditoría inicial: [SECURITY-AUDIT.md](SECURITY-AUDIT.md) (abril 2026)
- Estado actual de vulnerabilidades: este documento es el complemento operativo

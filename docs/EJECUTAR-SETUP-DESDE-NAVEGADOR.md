# Ejecutar migraciones y seed desde el navegador

Sin flyctl, puedes ejecutar migraciones y seed desde el navegador.

---

## 1. Configurar MIGRATE_SECRET en Fly

1. Entra en https://fly.io/apps/silenteye-3rrwnq
2. **Secrets** → **New Secret**
3. **Name:** `MIGRATE_SECRET`
4. **Value:** una clave que solo tú conozcas, ej: `silenteye-setup-2026-abc`
5. Guarda

---

## 2. Desplegar (para que el endpoint esté disponible)

Haz deploy desde el dashboard (Redeploy) o con flyctl.

---

## 3. Ejecutar desde la consola del navegador

1. Abre https://silent-eye-frontend.vercel.app (o cualquier página)
2. Pulsa **F12** (DevTools) → pestaña **Console**
3. Pega y ejecuta (cambia `TU_SECRET` por el valor que pusiste):

```javascript
// Migraciones (crear tablas)
fetch('https://silenteye-3rrwnq.fly.dev/api/setup/migrate?secret=TU_SECRET', { method: 'POST' })
  .then(r => r.json())
  .then(console.log);
```

4. Espera a ver `{ok: true, message: "..."}`

5. Luego ejecuta el seed:

```javascript
// Seed (crear admin, helper, driver de prueba)
fetch('https://silenteye-3rrwnq.fly.dev/api/setup/seed?secret=TU_SECRET', { method: 'POST' })
  .then(r => r.json())
  .then(console.log);
```

---

## 4. Obtener OTP para el primer login (producción)

En producción el OTP no se devuelve al pedirlo desde la app. Usa este endpoint (con tu secret) para crear y ver el código. En la consola del navegador (F12 → Console):

```javascript
fetch('https://silenteye-3rrwnq.fly.dev/api/setup/otp?secret=TU_SECRET', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone: '+51999999999' })
}).then(r => r.json()).then(console.log);
```

La respuesta incluirá `code` con el OTP. Úsalo en la app para hacer login.

---

## 5. Probar login

- **Teléfono:** +51999999999
- **Código:** el que obtuviste en el paso 4
</think>

<｜tool▁calls▁begin｜><｜tool▁call▁begin｜>
StrReplace
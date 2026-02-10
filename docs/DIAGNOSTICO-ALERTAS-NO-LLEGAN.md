# Diagnóstico: Las alertas no llegan a la app

## Cambios realizados

1. **Frontend ahora maneja tipo `alert`** – El backend envía pánico por dos vías:
   - `type: 'panic'` (processPanicEvent)
   - `type: 'alert'` con alertType=panic (processAlert)
   El frontend antes solo escuchaba `panic`; ahora también escucha `alert`.

2. **Endpoint de diagnóstico** – `GET /health/ws` devuelve cuántos clientes WebSocket están conectados.

---

## Cómo diagnosticar

### 1. Comprobar que el GPS envía a Fly.io

En el GPS (Teltonika Configurator):

- **Server Domain:** `silenteye-3rrwnq.fly.dev`
- **Port:** `5000`
- **Protocol:** TCP

Si está en ngrok u otra URL, los datos no llegarán al backend de producción.

### 2. Ver logs cuando disparas el pánico

```powershell
fly logs -a silenteye-3rrwnq
```

1. Deja los logs abiertos
2. Con la app abierta en el cel (admin o helper), pulsa el botón de pánico del GPS
3. En los logs busca:
   - `[ALERT] Detectada: type=panic` – el backend detectó la alerta
   - `broadcastPanic incident=... → N clientes` – si **N=0**, no hay nadie conectado por WebSocket
   - `broadcastAlert type=panic ... → N clientes` – mismo mensaje

### 3. Comprobar clientes WebSocket conectados

Con la app abierta en el cel (panel admin o helper):

```
https://silenteye-3rrwnq.fly.dev/health/ws
```

Deberías ver algo como:
```json
{"status":"ok","websocket":{"clients":1,"byRole":{"admin":1}}}
```

Si `clients` es 0 cuando la app está abierta, el WebSocket no se está conectando.

### 4. Posibles causas si clients=0

- **NEXT_PUBLIC_API_URL** no configurada en Vercel (el frontend usa localhost por defecto)
- El navegador del cel cierra/suspende el WebSocket cuando la app pasa a segundo plano
- Bloqueo de red o firewall en el cel

### 5. Cold start en Fly.io

Si la máquina estaba parada (`auto_stop_machines = 'stop'`), al llegar el pánico:

1. El TCP del GPS despierta la máquina
2. El broadcast se ejecuta de inmediato
3. Si el WebSocket del cel aún no se reconectó, no habrá clientes

Solución: mantener la app abierta unos segundos antes de disparar el pánico, para que el WebSocket tenga tiempo de reconectarse.

---

## Resumen

1. Verifica configuración del GPS: `silenteye-3rrwnq.fly.dev:5000`
2. Revisa `fly logs` al disparar el pánico
3. Comprueba `/health/ws` con la app abierta
4. Despliega los cambios (frontend + backend) y prueba de nuevo

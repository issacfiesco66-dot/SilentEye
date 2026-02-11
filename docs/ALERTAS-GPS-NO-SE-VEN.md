# No veo las alertas de mi GPS

## Comprueba primero: ¿el GPS está conectando al servidor?

En los **logs de Fly.io** (Dashboard → tu app → Logs) deberías ver algo como:

- `[GPS] TCP client connected | ...`
- `[GPS] IMEI recibido: 35xxxxxxxxxxxxx`
- `[AVL][IMEI][rec=1] ts=... priority=... eventIoId=...`

**Si no aparece nada de eso**, el dispositivo **no está llegando al servidor**. Las alertas solo existen cuando el servidor recibe datos AVL del GPS.

---

## 1. Usar ngrok para el GPS (recomendado si solo así funciona)

Si en tu red/operador **solo funciona con ngrok**, el backend ya lo soporta: con `NGROK_AUTHTOKEN` en Fly Secrets se inicia ngrok TCP hacia el puerto 5000.

### URL fija para no reconfigurar el GPS en cada reinicio

La URL de ngrok **cambia en cada reinicio** del contenedor (ej. `0.tcp.ngrok.io:16913` → `12871` → `13345`). Para no tener que actualizar el GPS cada vez:

1. **Reserva una dirección TCP en ngrok** (plan de pago):
   - https://dashboard.ngrok.com/cloud-edge/tcp-addresses
   - Crea una TCP Address; te asignan algo como `0.tcp.ngrok.io:12345` (ese host:puerto no cambia).

2. **Configura el secret en Fly** con esa URL:
   ```powershell
   fly secrets set NGROK_TCP_URL="tcp://0.tcp.ngrok.io:12345" -a silenteye-3rrwnq
   ```
   (Sustituye por el host:puerto que te dio ngrok.)

3. Tras el próximo deploy, ngrok usará siempre esa URL y el GPS puede quedarse configurado con ese dominio y puerto.

### Si no tienes dirección reservada (plan free)

- Tras cada deploy o reinicio, revisa los logs de Fly: `fly logs -a silenteye-3rrwnq`
- Busca `url=tcp://0.tcp.ngrok.io:XXXXX`
- Actualiza el GPS en Teltonika Configurator con ese **Domain** y **Port** y guarda en el dispositivo.

### Configurar el GPS (con ngrok)

En **Teltonika Configurator** → **GPRS** (o **Server**):

| Campo     | Valor |
|----------|--------|
| **Domain** | El host de ngrok (ej. `0.tcp.ngrok.io`) |
| **Port**   | El puerto que muestra ngrok (ej. `12345`) |
| **Protocol** | TCP |

Guarda y reinicia el dispositivo.

---

## 2. Configura el botón de pánico (DIN1) para que genere alertas

Si el GPS solo envía posiciones periódicas (prioridad 0), no se crean alertas. Tienes que configurar el **Digital Input 1** como evento de alta prioridad:

En Configurator → **I/O** → **Digital Input 1**:

- **Priority**: **High** o **Panic**
- **Operand**: **On Change** o **On Entrance**
- **Low Level**: 0, **High Level**: 1

Guarda y reinicia el dispositivo. Ver guía: [CONFIGURAR-DIN1-PANICO.md](./CONFIGURAR-DIN1-PANICO.md).

---

## 3. Qué ver en los logs cuando todo va bien

1. Al conectar el GPS: `TCP client connected` y `IMEI recibido: ...`
2. Cada vez que envía datos: `[AVL][IMEI][rec=N] ... priority=... eventIoId=...`
3. Cuando pulses el pánico: `[ALERT] Detectada: type=panic ...` y en la app (Admin → Alertas) aparecerá la alerta.

Si ves `[AVL] Sin alerta: priority=X eventIoId=Y io={...}` es que el registro llegó pero no se reconoce como alerta; con ese log se puede ajustar el detector (Event IO ID / IO elements).

---

## 4. Resumen

| Problema              | Qué hacer |
|-----------------------|-----------|
| No hay "[GPS] TCP client connected" | GPS no llega al servidor. Si usas ngrok: Domain = host ngrok (ej. `0.tcp.ngrok.io`), Port = puerto de los logs o de tu TCP Address reservada. Comprueba NGROK_AUTHTOKEN en Fly Secrets. |
| Hay AVL pero no alertas      | Configurar DIN1 (u otro evento) con **Priority = High/Panic** en Configurator. |
| Hay "[AVL] Sin alerta"       | El evento llega con otro eventIoId/IO; compartir ese log para mapear el tipo de alerta. |

# Guía paso a paso: Tabla alerts + prueba ngrok

## Paso 1: Crear la tabla `alerts` en tu base de datos local

La tabla `alerts` guarda las alertas del GPS (unplug, panic, etc.). Si tu BD se creó antes de añadir esta tabla, debes ejecutar la migración.

### 1.1 Abre PowerShell y ve al proyecto

```powershell
cd e:\SilentEye
```

### 1.2 Ejecuta la migración de alerts

```powershell
npm run migrate:alerts
```

**Resultado esperado:** `Tabla alerts creada correctamente.`

Si ves error de conexión, verifica que:
- PostgreSQL esté corriendo (Docker o instalación local)
- `backend/.env` tenga `DATABASE_URL` correcto (ej. `postgresql://postgres:tu_password@localhost:5432/silenteye`)

---

## Paso 2: Probar el GPS con ngrok (desarrollo local)

### 2.1 Terminal 1 – Iniciar el backend

```powershell
cd e:\SilentEye
npm run dev:backend
```

Espera hasta ver algo como:
```
TCP Teltonika escuchando en 0.0.0.0:5000
API HTTP + WebSocket en 0.0.0.0:3001 (path /ws)
```

### 2.2 Terminal 2 – Iniciar ngrok

```powershell
ngrok tcp 5000
```

En la salida, anota:
- **Domain:** ej. `0.tcp.ngrok.io`
- **Port:** ej. `10159`

### 2.3 Configurar el GPS (Teltonika Configurator)

1. GPRS → Server Settings
2. **Domain:** el que mostró ngrok (ej. `0.tcp.ngrok.io`)
3. **Port:** el que mostró ngrok (ej. `10159`)
4. **Protocol:** TCP
5. **Save to device** → **Reboot device**

### 2.4 Verificar

En la consola del backend deberías ver:
- `TCP client connected`
- `IMEI recibido: 353691846029642`
- `[AVL][353691846029642][rec=X] ts=... lat=... lng=...`
- Si hay alertas: `[ALERT] Detectada: type=unplug` (sin error de "no existe la relación alerts")

---

## Paso 3: Si todo funciona con ngrok

Entonces el flujo GPS → ngrok → backend funciona. Para producción 24/7, la opción recomendada es:

1. Contratar **ngrok Hobbyist** (~$8–10/mes)
2. Integrar el agente de ngrok en el contenedor de Fly.io
3. Configurar el GPS con la URL reservada de ngrok

(Ver conversación anterior para detalles de implementación.)

---

## Resumen de comandos

| Acción | Comando |
|--------|---------|
| Crear tabla alerts | `cd e:\SilentEye` → `npm run migrate:alerts` |
| Iniciar backend | `cd e:\SilentEye` → `npm run dev:backend` |
| Iniciar ngrok | `ngrok tcp 5000` |

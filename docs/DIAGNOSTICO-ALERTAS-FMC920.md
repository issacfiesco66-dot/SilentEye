# Diagnóstico: Alertas no llegan desde FMC920

## Causas más probables

### 1. Configuración del dispositivo FMC920

Las alertas se generan **solo** cuando el dispositivo está configurado para enviar registros con **prioridad alta** o **pánico**. Por defecto, el FMC920 envía datos periódicos con prioridad baja (0).

#### Botón de pánico (DIN1)

1. Entra en **Configurator** o **TELTONIKA_CONFIG** (https://config.teltonika-gps.com)
2. Ve a **I/O Elements** → **Digital Input 1**
3. Configura:
   - **Priority**: **High** o **Panic** (no Low)
   - **Operand**: **On Change** o **On Entrance**
   - **High Level**: 1
   - **Low Level**: 0 (para que al activar DIN1=1 se genere el evento)

Si está en **Low** o **None**, el registro se envía en el siguiente envío periódico, no de inmediato, y puede que no se detecte como alerta.

#### Escenarios (Overspeed, Jamming, Crash, etc.)

Cada escenario tiene un parámetro "Scenario settings" que por defecto suele ser **0 (Disable)**:

| Escenario      | Parámetro | Valor para alertas |
|----------------|-----------|--------------------|
| Overspeeding   | 11100     | 1=Low, 2=High, 3=Panic |
| GNSS Jamming   | 11300     | 1, 2 o 3          |
| Crash          | 11400     | 1, 2 o 3          |
| Green driving  | 11000     | 1, 2 o 3          |
| Towing         | 11600     | 1, 2 o 3          |
| Unplug         | 11500     | 1, 2 o 3          |

### 2. Envío de datos al servidor

- **Server Domain** (2004): IP o dominio de tu servidor
- **Port** (2005): Puerto TCP (ej. 5000)
- **Protocol** (2006): TCP
- **Data Protocol** (113): Codec 8 Extended recomendado (1)

### 3. Base de datos

Asegúrate de que la tabla `alerts` existe:

```bash
cd backend
npx dotenv -e .env -- node -e "
const { pool } = require('./dist/db/pool.js');
pool.query('SELECT 1 FROM alerts LIMIT 1').then(() => console.log('OK: tabla alerts existe')).catch(e => console.error('ERROR:', e.message));
"
```

Si falla, ejecuta la migración:

```bash
psql $DATABASE_URL -f src/db/migrations/001_add_alerts.sql
```

### 4. Logs del servidor

Con los cambios recientes, el backend registra:

- `[AVL][IMEI][rec=N]` – Cada registro AVL con `priority`, `eventIoId`, `ignition`
- `[ALERT] Detectada: type=...` – Cuando se detecta una alerta
- `[AVL] Sin alerta: priority=X eventIoId=Y io={...}` – Registros con prioridad/evento que no generaron alerta (para diagnóstico)

Para ver más detalle, configura:

```
LOG_LEVEL=debug
```

## Qué deberías ver en los logs

1. **AVL decodificado**: Si aparecen estos mensajes, el GPS está enviando datos correctamente.
2. **priority=2** o **priority=1**: Indica registro de evento (pánico o alta prioridad).
3. **eventIoId=0**: Datos periódicos (movimiento), no evento.
4. **eventIoId=37** u otro no-cero: Evento concreto (ej. alarm button).
5. **io[1]=1** o similar: DIN1 activo (botón pánico).

Si solo ves `priority=0` y `eventIoId=0`, el dispositivo no está configurado para enviar alertas; está enviando solo datos periódicos.

## Comprobación rápida

1. Presiona el botón de pánico (DIN1).
2. Revisa los logs del backend inmediatamente.
3. Si aparece `[ALERT] Detectada: type=panic` → todo correcto.
4. Si aparece `[AVL] Sin alerta: priority=...` → el registro llega pero no coincide con el mapeo; comparte esos logs para ajustar el detector.
5. Si no aparece nada → el dispositivo no envía el evento o hay un problema de red/servidor.

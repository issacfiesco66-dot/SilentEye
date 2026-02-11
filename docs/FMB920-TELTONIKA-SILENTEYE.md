# FMB920: Configuración Teltonika para SilentEye

Guía consolidada basada en la [Wiki de telemática Teltonika](https://wiki.teltonika-gps.com/) y las necesidades de SilentEye.

---

## Cómo funciona SilentEye con el FMB920

| Dirección | Protocolo | Descripción |
|-----------|-----------|-------------|
| **GPS → SilentEye** | TCP, Codec 8/8E | El FMB920 envía datos AVL (posición, DIN1, prioridad) a nuestro servidor |
| **SilentEye → GPS** | — | No enviamos comandos al GPS; usamos Configurator o SMS/GPRS para configurar |

La wiki de Teltonika describe **comandos SMS/GPRS** que tú envías al dispositivo (desde un móvil o desde Configurator). Nuestro backend **solo recibe** datos AVL por TCP.

---

## 1. Configuración del servidor (GPRS/Server)

El GPS debe saber **dónde** enviar los datos.

### Opción A: Teltonika Configurator (recomendado)

1. Abre **Teltonika Configurator** y conecta el FMB920 (o carga un backup).
2. Ve a **GPRS** → **Server Settings** (o **Server**).
3. Configura:

| Campo | Valor |
|-------|--------|
| **Domain** | `0.tcp.ngrok.io` (o tu dominio ngrok/Fly) |
| **Port** | Puerto TCP (ej. `12345` con ngrok, o `5000` si usas Fly directo) |
| **Protocol** | **TCP** |
| **Data protocol** | Codec 8 o Codec 8 Extended |

> Si usas ngrok con dirección reservada, ve [NGROK-PRODUCCION-FLY.md](./NGROK-PRODUCCION-FLY.md).

### Opción B: Comando SMS/GPRS `download` (sin Configurator)

Según la wiki, puedes redirigir el dispositivo vía comando:

```
download IMEI,APN,LOGIN,PASSWORD,IP,PUERTO,MODO
```

- **MODO**: 0 = TCP, 1 = UDP → usar **0** para SilentEye
- **IP**: dirección del servidor (o IP pública de tu máquina/ngrok)
- **PUERTO**: 5000 (o el puerto TCP que uses)

> Requiere acceso SMS o GPRS al dispositivo. Si tienes Configurator, es más sencillo usarlo.

---

## 2. Configuración del botón de pánico (DIN1)

Sin esto, el GPS enviará solo posiciones periódicas; **no se generarán alertas** al pulsar el botón.

En Configurator → **I/O** → **Digital Input 1**:

| Campo | Valor |
|-------|--------|
| **Priority** | **High** o **Panic** |
| **Low Level** | 0 |
| **High Level** | 1 |
| **Operand** | On Change o On Entrance |

Guía detallada: [CONFIGURAR-DIN1-PANICO.md](./CONFIGURAR-DIN1-PANICO.md).

---

## 3. Verificar que el GPS responde (comandos SMS/GPRS)

Estos comandos los envías **tú** al dispositivo (por SMS o desde Configurator). No los ejecuta SilentEye.

### Formato SMS

```
[LOGIN] [PASSWORD] [comando]
```

Si no configuraste login/password SMS, deja dos espacios antes del comando:
```
  getinfo
```

### Comandos útiles para verificación

| Comando | Descripción |
|---------|-------------|
| `getinfo` | Versión de código, IMEI, versión modem, hora RTC, dirección MAC BT |
| `getstatus` | Estado del módem |
| `getgps` | Datos GPS actuales, fecha y hora |
| `ggps` | Ubicación con enlace a Google Maps |
| `getio` | Lectura de entradas digitales (incluye DIN1) |
| `read #` | Estado de I/O por ID de AVL |

Ejemplo: enviar `getgps` por SMS y esperar la respuesta del dispositivo confirma que:
- El dispositivo tiene señal GSM
- El módulo GPS obtiene posición
- Los comandos llegan correctamente

---

## 4. Verificar que SilentEye recibe datos

### Desde el admin

| Qué revisar | Dónde | Qué indica |
|-------------|-------|------------|
| Posiciones en tiempo real | Admin → **Mapa en vivo** | El GPS envía AVL y el backend lo procesa |
| Posiciones por vehículo | Admin → **Conductores** (mapa) | Vehículos asignados con posición |
| Alertas de pánico | Admin → **Alertas GPS** | DIN1 configurado con prioridad High/Panic y botón pulsado |

### Logs del backend (Fly.io)

```bash
flyctl logs -a silenteye-3rrwnq
```

| Mensaje | Significado |
|---------|-------------|
| `TCP client connected` | Algo se conectó al puerto TCP |
| `IMEI recibido: 35369...` | El GPS envió su IMEI |
| `ACK IMEI 0x01 enviado` | Aceptamos la conexión |
| `AVL decodificado: X registros` | Datos GPS procesados (Codec 8/8E) |
| `[ALERT] Detectada: type=panic` | Se detectó pánico (DIN1) |

### Si no llegan datos

1. **No hay "TCP client connected"**
   - Ngrok/Fly no alcanza el puerto 5000
   - Dominio/puerto mal configurados en el GPS
   - Firewall u operador bloquea la conexión

2. **Llega IMEI pero no AVL**
   - Codec no soportado (SilentEye soporta Codec 8 y 8E)
   - Revisar Data Protocol en Configurator

3. **Hay AVL pero no alertas**
   - DIN1 sin prioridad High/Panic → [CONFIGURAR-DIN1-PANICO.md](./CONFIGURAR-DIN1-PANICO.md)

---

## 5. Resumen rápido

| Paso | Acción |
|------|--------|
| 1 | Configurar GPRS/Server: Domain + Port TCP en Configurator |
| 2 | Configurar DIN1 con Priority = High o Panic |
| 3 | Registrar el vehículo en SilentEye (Admin → Vehículos) con el IMEI |
| 4 | Revisar Admin → Mapa en vivo y logs del backend |
| 5 | Probar el botón de pánico y revisar Admin → Alertas |

---

## Referencias

- [Wiki Teltonika – Comandos SMS/GPRS FMB920](https://wiki.teltonika-gps.com/)
- [NGROK-PRODUCCION-FLY.md](./NGROK-PRODUCCION-FLY.md)
- [CONFIGURAR-DIN1-PANICO.md](./CONFIGURAR-DIN1-PANICO.md)
- [VERIFICAR-CONEXION-GPS.md](./VERIFICAR-CONEXION-GPS.md)

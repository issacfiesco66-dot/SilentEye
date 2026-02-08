# Comandos listos para copiar y pegar - GPS SilentEye

## Opción rápida: Script automático

Ejecuta (doble clic o desde terminal):

```
e:\SilentEye\INICIAR-GPS.bat
```

Esto abre dos ventanas: Backend y Ngrok.

---

## Opción manual: Comandos uno por uno

### Terminal 1 - Backend

```powershell
cd e:\SilentEye
npm run dev:backend
```

Espera hasta ver: `TCP Teltonika listening on 0.0.0.0:5000`

---

### Terminal 2 - Ngrok

```powershell
ngrok tcp 5000
```

Cuando arranque, anota la línea tipo: `tcp://0.tcp.ngrok.io:18848`

- **Dominio:** `0.tcp.ngrok.io`  
- **Puerto:** `18848`  
*(cambia 0 y 18848 por lo que te muestre ngrok)*

---

### Terminal 3 - Probar conexión TCP

Sustituye `DOMINIO` y `PUERTO` por los de ngrok:

```powershell
Test-NetConnection -ComputerName DOMINIO -Port PUERTO
```

Ejemplo:

```powershell
Test-NetConnection -ComputerName 0.tcp.ngrok.io -Port 18848
```

Si `TcpTestSucceeded: True` → la conexión funciona.

---

## Configurar el GPS (Teltonika Config Tool)

1. Abre **Teltonika Configurator**
2. Conecta el dispositivo
3. **GPRS** → **Data acquisition server**
4. Pega:

| Campo   | Valor (ejemplo) |
|---------|------------------|
| Domain  | `0.tcp.ngrok.io` |
| Port    | `18848`          |
| APN     | (el de tu SIM)   |

5. **Save to device** → **Reboot device**

---

## Verificar que llegan datos

En la ventana del **Backend** deberías ver:

- `TCP client connected`
- `IMEI recibido: XXXXX`
- `AVL decodificado: X registros`

Si no aparece nada: revisa que dominio y puerto en el GPS coincidan con ngrok.

---

## Ver el GPS en el frontend (Admin / Dashboard)

1. **Registrar el vehículo** (si no lo tienes):
   - Login como admin → Vehículos → Añadir
   - Placa: `GPS-PUEBLA` (o la que uses)
   - IMEI: `353691846029642` (el de tu dispositivo)

2. O ejecutar seed para crear el vehículo automáticamente:
   ```powershell
   cd e:\SilentEye
   npm run seed
   ```

3. **Abrir el dashboard admin**: http://localhost:3000/admin
   - Deberías ver el vehículo en el mapa (punto verde) con posición en tiempo real
   - Las posiciones se cargan al abrir y se actualizan por WebSocket

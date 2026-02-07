# Verificar conexión GPS → Backend

## Checklist antes de probar

### 1. Backend `.env`

En `backend/.env` debe tener al menos:

```
DATABASE_URL=postgresql://usuario:password@localhost:5432/silenteye
JWT_SECRET=una_cadena_segura_de_al_menos_32_caracteres
TELTONIKA_SKIP_WHITELIST=true
```

**Importante:** `TELTONIKA_SKIP_WHITELIST=true` evita rechazar el GPS cuando el IMEI no está en la tabla `vehicles`.

### 2. Base de datos

- PostgreSQL en ejecución
- Base de datos `silenteye` creada
- Tablas creadas: `gps_logs`, `vehicles`, `alerts`, etc. (ejecutar `npm run migrate` o el schema)

### 3. Ngrok y backend

1. Backend corriendo: `cd backend && npm run dev`
2. Ngrok TCP activo: `ngrok tcp 5000`
3. GPS configurado con el dominio y puerto de ngrok (ej. `6.tcp.ngrok.io:15173`)

### 4. Qué ver en los logs del backend

| Log | Significado |
|-----|-------------|
| `TCP client connected` | Algo se conectó al puerto 5000 |
| `TCP data received \| X bytes` | Llegaron datos del GPS |
| `IMEI recibido: 353691846029642` | El GPS envió su IMEI |
| `ACK IMEI 0x01 enviado` | Aceptamos la conexión |
| `AVL decodificado: X registros` | Datos GPS procesados correctamente |
| `[ALERT] Detectada` | Se detectó una alerta (pánico, etc.) |

### 5. Si no aparece nada

- **No "TCP client connected":** Ngrok no está llegando al backend, o el puerto 5000 está ocupado/cerrado
- **"IMEI no en whitelist":** Poner `TELTONIKA_SKIP_WHITELIST=true` en `.env`
- **"Paquete AVL inválido" o "CRC fallida":** Posible incompatibilidad de protocolo; revisar codec del dispositivo

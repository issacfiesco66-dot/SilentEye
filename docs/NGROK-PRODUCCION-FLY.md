# ngrok en producción (Fly.io)

Guía para desplegar SilentEye con ngrok TCP, de modo que el GPS funcione 24/7 con operadores móviles.

---

## Requisitos

1. **Cuenta ngrok** – Plan **Hobbyist** (~$8–10/mes) recomendado: incluye 1 TCP address **reservado** (fijo). Con plan Free el puerto cambia en cada reinicio.
2. **Authtoken** de ngrok
3. **Fly.io** con la app desplegada

---

## Paso 1: Obtener authtoken de ngrok

1. Entra en https://dashboard.ngrok.com/
2. Si usas plan Free, añade método de pago (necesario para TCP)
3. En **Your Authtoken**, copia el token
4. O entra en https://dashboard.ngrok.com/get-started/your-authtoken

---

## Paso 2: Configurar el secret en Fly.io

```powershell
flyctl secrets set NGROK_AUTHTOKEN="tu_authtoken_aqui" -a silenteye-3rrwnq
```

Sustituye `tu_authtoken_aqui` por el token que copiaste.

---

## Paso 3: Deploy

```powershell
cd e:\SilentEye
flyctl deploy -a silenteye-3rrwnq --config fly.toml
```

Con `NGROK_AUTHTOKEN` definido, el contenedor iniciará:
1. Backend (HTTP 8080 + TCP 5000)
2. ngrok TCP apuntando a localhost:5000

---

## Paso 4: Obtener la URL de ngrok

**Con plan Hobbyist (recomendado):**
1. Entra en https://dashboard.ngrok.com/cloud-edge/tcp-addresses
2. Crea o usa tu TCP address reservado (ej. `0.tcp.ngrok.io:12345`)
3. Esa URL se mantiene fija entre reinicios

**Con plan Free:**
- La URL cambia en cada reinicio del contenedor
- Revisa los logs de Fly: `flyctl logs -a silenteye-3rrwnq`
- Busca `url=tcp://0.tcp.ngrok.io:XXXXX`
- Tendrás que actualizar el GPS cada vez que reinicie

---

## Paso 5: Configurar el GPS

En Teltonika Configurator → GPRS → Server Settings:

| Campo   | Valor                      |
|--------|----------------------------|
| Domain | `0.tcp.ngrok.io` (o el que te dé ngrok) |
| Port   | El puerto que mostró ngrok (ej. `12345`) |
| Protocol | TCP                     |

Guarda en el dispositivo y reinicia.

---

## Comportamiento

- **Con `NGROK_AUTHTOKEN`:** inicia Node + ngrok. El GPS se conecta vía túnel TCP.
- **Sin `NGROK_AUTHTOKEN`:** solo Node. El GPS debe conectar directo a Fly (puede fallar si el operador bloquea).

---

## Troubleshooting

**No aparecen conexiones en los logs**
- Comprueba que `NGROK_AUTHTOKEN` esté en Fly Secrets
- Comprueba la URL/port en el dashboard de ngrok

**Build falla al descargar ngrok**
- La URL de descarga puede cambiar. Abre un issue o revisa https://ngrok.com/download

**El GPS no conecta**
- Revisa dominio y puerto en el Configurator
- Prueba con ngrok en local para validar que el GPS funciona

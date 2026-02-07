# Guía: Cómo encontrar y configurar DIN1 (Botón de pánico) en FMB920/FMC920

## Dónde está Digital Input 1 (DIN1)

En el **Teltonika Configurator**, la sección **I/O** muestra una **tabla larga** con todos los elementos de entrada/salida. Las entradas aparecen en un orden que puede variar según la versión del configurador.

### Pasos para localizar DIN1

1. **Abre el Configurator** y conecta tu dispositivo (o carga un archivo de configuración).

2. En el menú izquierdo, haz clic en **I/O** (Input/Output).

3. **Busca en la columna "Input Name"** (Nombre de entrada). DIN1 puede aparecer como:
   - **Digital Input 1**
   - **DIN 1**
   - **DIN1**

4. **La tabla es larga** — En tu captura se ven elementos como BLE Button, BT Status, User ID, BLE LLS. Los elementos básicos como **Ignition**, **Movement** y **Digital Input 1** suelen estar **más arriba** en la lista. Usa la **barra de desplazamiento** para subir hasta el inicio.

5. **Orden típico** (puede variar):
   - Ignition  
   - Movement  
   - Data Mode  
   - GSM Signal  
   - Sleep Mode  
   - GNSS Status  
   - GNSS PDOP  
   - GNSS HDOP  
   - External Voltage  
   - Speed  
   - Battery Current  
   - Battery Voltage  
   - **Digital Input 1** ← Aquí debería estar  
   - Digital Input 2  
   - ... (y después BLE, User ID, etc.)

6. **Alternativa: Status → I/O Info**
   - Ve a **Status** en el menú izquierdo.
   - Abre la pestaña **I/O Info**.
   - Ahí se listan todos los I/O con su valor actual.
   - Identifica la entrada que corresponde al botón de pánico (por ejemplo, al pulsarlo verás cómo cambia el valor de 0 a 1).

---

## Configuración recomendada para DIN1 (pánico)

Una vez que localices **Digital Input 1**:

| Campo | Valor |
|-------|--------|
| **Priority** | **High** o **Panic** |
| **Low Level** | 0 |
| **High Level** | 1 |
| **Operand** | **On Change** o **On Entrance** |
| **Event Only** | Yes (opcional) |

### Explicación rápida

- **Priority = High o Panic**: El dispositivo envía el evento de inmediato por GPRS.
- **Low Level 0, High Level 1**: La alerta se dispara cuando la entrada pasa de 0 a 1 (pulsación del botón).
- **Operand On Change**: Genera un evento cada vez que cambia el valor (0→1 o 1→0).

---

## Si no encuentras "Digital Input 1"

Algunos dispositivos FMB/FMC usan **Ignition** vinculado a DIN1 (Parámetro 101). En ese caso:

1. Ve a **System** → **Ignition settings** (Parámetro 101).
2. Confirma que la fuente de ignición incluye **DIN 1** (opción 1, 3, 6, 7, etc.).
3. Luego, en **I/O**, busca el elemento **Ignition** y configúralo con **Priority = High** o **Panic** si quieres que el cambio de ignición dispare una alerta.

Para un **botón de pánico dedicado**, el más adecuado es **Digital Input 1** como elemento I/O independiente.

---

## Después de configurar

1. Pulsa **Save to device** (Guardar en dispositivo).
2. Pulsa **Reboot device** (Reiniciar dispositivo).
3. Prueba el botón de pánico y revisa los logs de tu backend (`[ALERT] Detectada: type=panic`).

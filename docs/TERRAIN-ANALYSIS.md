# Módulo de Análisis de Terreno — Documentación Técnica

## Qué es

Un sistema de detección de anomalías en el terreno que combina **dos constelaciones satelitales independientes** a través de **Google Earth Engine**:

- **Sentinel-2** (óptico, 10 m, revisita 5 días) — detecta cambios en vegetación y suelo expuesto mediante índices NDVI/BSI/SAVI. Es el **detector primario**.
- **Sentinel-1** (radar SAR, 10 m, revisita 6–12 días) — detecta cambios en la rugosidad y humedad del suelo. Es el **validador independiente**: atraviesa nubes y no depende de iluminación solar.

Compara cómo se veía un área **antes de una fecha** vs **cómo se ve hoy** para detectar cambios sospechosos: tierra removida, vegetación destruida, suelo expuesto. Una anomalía óptica que además es confirmada por radar tiene confianza mucho mayor — los dos sensores miden fenómenos físicos distintos, así que un falso positivo en uno es improbable que coincida con uno en el otro.

**Caso de uso principal:** priorizar zonas de búsqueda de fosas clandestinas u otras alteraciones del terreno. Es herramienta de priorización — no prueba definitiva — y requiere verificación en campo.

## Dónde vive

Página `/sos` → tab **"Análisis Terreno"** (junto a la tab "Emergencia" del botón SOS).

Requiere sesión activa (cualquier rol autenticado).

---

## Flujo del usuario

### 1. Seleccionar ubicación (3 formas)
- **Buscador:** geocoding vía OpenStreetMap Nominatim (autocomplete con debounce de 400ms, máx. 5 resultados)
- **Botón "Usar mi ubicación":** GPS del dispositivo
- **Click directo en el mapa:** selecciona coordenadas al hacer click

### 2. Poner fecha del evento
La fecha de la desaparición o cuando se sospecha que ocurrió algo. El sistema usará esta fecha como punto de corte para comparar el "antes" vs "después".

### 3. Ajustar radio
De **1 a 10 km** alrededor del punto (slider, pasos de 0.5 km, default 2 km).
> Nota: el backend acepta hasta 20 km vía API directa, pero el slider del frontend limita a 10 km para mantener tiempos de respuesta razonables.

### 4. Click "Analizar"
El sistema procesa en Google Earth Engine (~10-30 segundos). Al terminar, abre automáticamente la capa **NDVI Diff** — el mapa de cambios en vegetación, que es el más informativo para detectar remoción de tierra.

---

## Qué hace el backend al dar "Analizar"

```
POST /api/terrain/analyze
Headers: Authorization: Bearer <jwt>
Body: { latitude, longitude, radiusKm, eventDate }
Rate limit: 10 solicitudes / 15 minutos por IP
```

### Paso a paso:

**1. Conexión y filtrado inicial**
- Conecta con Google Earth Engine vía service account (`GEE_SERVICE_ACCOUNT_EMAIL` + `GEE_PRIVATE_KEY`)
- Filtra la colección `COPERNICUS/S2_SR_HARMONIZED` por área de interés
- **Pre-filtra** imágenes con >30% cobertura de nubes a nivel metadata (`CLOUDY_PIXEL_PERCENTAGE < 30`)

**2. Definición de periodos**
- **ANTES (baseline):** desde 90 días antes del evento hasta **5 días antes del evento**
  - El gap de 5 días es intencional: evita contaminar el "antes" con imágenes del evento mismo
- **DESPUÉS (actual):** últimos 90 días hasta hoy
  - Si el evento fue reciente (<90 días), el inicio del periodo "después" se ajusta automáticamente para **no solaparse** con el baseline

**3. Máscara de nubes pixel-por-pixel**
- Aplica máscara usando banda **QA60** (bit 10 = nubes opacas, bit 11 = cirrus)
- Esto es un segundo nivel de limpieza — el pre-filtro del paso 1 elimina imágenes muy nubladas; este paso limpia píxeles individuales

**4. Mosaico mediano**
- Genera **mosaico mediano** de cada periodo (reduce ruido atmosférico y artefactos temporales)

**5. Cálculo de índices ópticos (Sentinel-2)**

| Índice | Fórmula | Qué mide |
|--------|---------|----------|
| **NDVI** | (B8 − B4) / (B8 + B4) | Vegetación. +1 = vegetación densa, −1 = sin vegetación |
| **BSI** | ((B11+B4) − (B8+B2)) / ((B11+B4) + (B8+B2)) | Suelo desnudo. Valores altos = suelo expuesto |
| **SAVI** | ((B8 − B4) / (B8 + B4 + L)) × (1 + L), L=0.5 | Vegetación ajustada por suelo. Mejor para zonas semi-áridas |
| **NDVI Diff** | NDVI_después − NDVI_antes | Cambio en vegetación. Negativo = vegetación desapareció |
| **BSI Diff** | BSI_después − BSI_antes | Cambio en suelo. Positivo = nuevo suelo expuesto |
| **SAVI Diff** | SAVI_después − SAVI_antes | Cambio en vegetación con corrección de suelo |

**5b. Pipeline de radar (Sentinel-1 GRD)** — *nuevo*

Corre en paralelo al pipeline óptico. Usa `COPERNICUS/S1_GRD` en modo IW con polarizaciones VV y VH (valores ya en dB):

| Producto | Qué mide |
|----------|----------|
| **VV** | Retrodispersión en polarización vertical. Sensible a rugosidad superficial y humedad — **clave para detectar tierra removida** |
| **VH** | Retrodispersión cruzada. Sensible a scattering de volumen (vegetación) — útil para discriminar crecimiento vegetal |
| **VV Diff** | VV_después − VV_antes (dB). Positivo = más rugoso / más seco, negativo = más liso / más húmedo |
| **VH Diff** | VH_después − VH_antes (dB) |

El radar NO dispara anomalías por sí solo. La lluvia, el riego y los cambios estacionales de humedad generan cambios grandes de backscatter que no tienen nada que ver con excavaciones — un detector SAR independiente sería una máquina de falsos positivos. En cambio, SAR se usa como **validador**: si el óptico ya disparó en un píxel y el radar también muestra un cambio fuerte ahí, la confianza sube dramáticamente.

**Degradación grácil**: si S1 no tiene imágenes en la ventana (ciertas regiones tienen cobertura rala), el pipeline continúa solo con el óptico y marca `metadata.sarAvailable: false`.

**6. Detección automática de anomalías (fusión óptico + radar)**

```
Umbrales ópticos (sensitivity=normal):
  - Pérdida de vegetación: NDVI cayó > 0.18 (ndviDiff < −0.18)
  - Suelo expuesto:        BSI subió > 0.14 (bsiDiff > 0.14)
  - SAVI:                  SAVI cayó > 0.16
  - Un píxel se marca anómalo si al menos 2 de los 3 índices disparan

Muestreo + clustering (JS-side):
  1. Cuenta píxeles anómalos con reduceRegion
  2. Muestrea ~100-200 píxeles (según sensibilidad) con sample({geometries:true})
     — el stack muestreado incluye NDVI_diff, BSI_diff, SAVI_diff y, si SAR
     está disponible, VV_diff + VH_diff (un solo round trip a GEE)
  3. Clustering JS de vecino más cercano (~30m de tolerancia)
  4. Descarta clusters pequeños (< minClusterPixels)
  5. Post-filtro: descarta anomalías < minAreaM2 o severidad < minSeverity

Severidad (0-100):
  - 65% magnitud del cambio óptico
  - 25% tamaño del área
  - +10 bonus si los 3 índices ópticos disparan en el cluster
  - +15 bonus si SAR confirma: |vvChange| ≥ sarVVThreshold (2.0 dB en normal)
  - Clasificación: ALTA (≥70), MEDIA (≥40), BAJA (<40)

Confidence flag:
  - 'sar_confirmed'  → SAR corroboró el cambio → badge verde en UI
  - 'optical_only'   → solo óptico (sin radar, o radar por debajo del umbral)

Resultado: top N anomalías (N=cfg.maxAnomalies) ordenadas por severidad,
           con coordenadas exactas, vvChange/vhChange en dB cuando aplica.
```

### Umbrales SAR por nivel de sensibilidad

| Nivel   | `sarVVThreshold` | Interpretación                                  |
|---------|------------------|-------------------------------------------------|
| low     | 3.0 dB           | Solo cambios grandes — mínimos falsos positivos |
| normal  | 2.0 dB           | Default — buen balance                          |
| high    | 1.5 dB           | Captura perturbaciones menores                  |
| max     | 1.0 dB           | Sensible — más ruido por humedad                |

**7. Generación de tiles**
- Genera **8 tile URLs** para capas visuales (en paralelo)
- Las URLs son temporales y se sirven directamente desde los servidores de GEE

**8. Metadata**
- Retorna conteo de imágenes por periodo
- Flag `cloudWarning: true` si algún periodo tiene **menos de 3 imágenes** (resultados poco confiables)

---

## Qué muestra el frontend

### Si hay anomalías → Banner rojo
- Banner con tarjetas horizontales scrolleables (una por anomalía)
- Cada tarjeta muestra:
  - **Severidad** con badge de color (ALTA rojo / MEDIA ámbar / BAJA amarillo)
  - Tipo: "Pérdida de vegetación", "Suelo expuesto", o "Ambos"
  - Área en m² (o hectáreas si ≥ 10,000 m²)
  - Coordenadas exactas
- Click en tarjeta → centra el mapa en esa anomalía
- **Marcadores pulsantes en el mapa:**
  - 🔴 Rojo (severidad ≥ 70) — tamaño 32px
  - 🟠 Ámbar (severidad ≥ 40) — tamaño 26px
  - 🟡 Amarillo (severidad < 40) — tamaño 22px
- Mensaje: *"Estas zonas muestran cambios inusuales. Se recomienda verificar en campo."*

### Si no hay anomalías → Banner verde
- *"No se detectaron anomalías significativas en esta zona y periodo"*

### Advertencia de nubes
- Si `cloudWarning` es true → banner ámbar avisando que hay pocas imágenes disponibles y los resultados pueden ser menos confiables

### 14 capas seleccionables (sidebar derecho en desktop, pills en mobile)

Ópticas (Sentinel-2):

| Capa | Qué muestra | Paleta |
|------|-------------|--------|
| Imagen antes | Foto satelital real pre-evento (true color B4/B3/B2) | Natural |
| Imagen después | Foto satelital actual (true color) | Natural |
| NDVI antes | Mapa de vegetación pre-evento | Verde = sana → Rojo = sin vegetación |
| NDVI después | Mapa de vegetación actual | Verde = sana → Rojo = sin vegetación |
| **NDVI Diff** | **Cambios en vegetación** | Azul = creció → Blanco = sin cambio → **Rojo = desapareció** |
| BSI antes | Mapa de suelo pre-evento | Verde = cubierto → Café = expuesto |
| BSI después | Mapa de suelo actual | Verde = cubierto → Café = expuesto |
| **BSI Diff** | **Cambios en suelo** | Azul = se cubrió → Blanco = sin cambio → **Rojo = nuevo suelo expuesto** |

Radar (Sentinel-1) — solo si `sarAvailable`:

| Capa | Qué muestra | Paleta |
|------|-------------|--------|
| Radar VV antes | Backscatter VV pre-evento (dB) | Escala de grises (−25 → 0 dB) |
| Radar VV después | Backscatter VV actual (dB) | Escala de grises |
| **Radar VV Diff** | **Cambio de rugosidad en VV** | Azul = más liso/húmedo → **Rojo = más rugoso/seco** |
| Radar VH antes | Backscatter VH cross-pol (dB) | Escala de grises (−30 → −5 dB) |
| Radar VH después | Backscatter VH actual (dB) | Escala de grises |
| **Radar VH Diff** | **Cambio de scattering de volumen** | Azul = menos vegetación cayó → **Rojo = aumentó** |

### Controles de visualización

- **Opacidad:** slider 0-100% para la capa satelital sobre el mapa base
- **Modo comparación (split view):** 3 presets disponibles:
  - Foto real (antes / después)
  - NDVI (antes / después)
  - BSI (antes / después)
- Slider de posición del split (10%-90%)
- **Leyenda dinámica:** cambia según la capa activa (NDVI, BSI, o Diff)
- **Metadata:** muestra conteo de imágenes por periodo y rango de fechas

### Puntos de Interés (POIs)
- Guardar puntos sospechosos con **nombre** (máx. 200 chars) y **notas** (máx. 500 chars en UI, 2000 en backend)
- Fecha del evento asociada (opcional)
- Click en un POI guardado → centra el mapa y carga su fecha
- Eliminar POIs individuales
- Máximo **50 POIs por usuario**
- Los POIs son **privados** — cada usuario solo ve los suyos
- Marcadores amarillos (📍) en el mapa para POIs guardados

---

## Arquitectura técnica

```
Frontend (Vercel / Next.js 14)
  ├── app/sos/page.tsx           → tabs: Emergencia | Análisis Terreno
  ├── components/terrain/
  │   ├── TerrainAnalysis.tsx    → controles, alertas, sidebar, POIs, búsqueda
  │   └── TerrainMap.tsx         → react-leaflet + tiles GEE + marcadores anomalías
  └── i18n/es.ts, en.ts         → traducciones del módulo

      ↓ POST /api/terrain/analyze (rewrite vía Vercel → Fly.io)
      ↓ GET/POST/DELETE /api/terrain/pois (CRUD de puntos de interés)

Backend (Fly.io / Express + TypeScript)
  ├── api/routes.ts              → endpoints terrain + rate limit (10/15min) + auth
  ├── services/gee-service.ts    → autenticación GEE + procesamiento Sentinel-2
  └── db/migrations/018_terrain_pois.sql → tabla PostgreSQL/PostGIS

      ↓ @google/earthengine SDK (autenticación vía service account)

Google Earth Engine
  └── COPERNICUS/S2_SR_HARMONIZED (Sentinel-2 Level-2A, 10m, revisita ~5 días)

Geocoding
  └── nominatim.openstreetmap.org (gratuito, sin API key, debounce 400ms)
```

### Dependencias clave

| Dependencia | Uso | Notas |
|-------------|-----|-------|
| `@google/earthengine` | SDK de Earth Engine para Node.js | Lazy import en el endpoint |
| Service Account GCP | Roles: `Earth Engine Resource Writer` + `Service Usage Consumer` | Credenciales vía env vars |
| `react-leaflet` + `leaflet` | Renderiza tiles de GEE sobre OpenStreetMap | Dynamic import (no SSR) |
| `nominatim.openstreetmap.org` | Geocoding gratuito para el buscador | Rate limit propio de Nominatim: 1 req/s |

### Variables de entorno requeridas

```bash
GEE_SERVICE_ACCOUNT_EMAIL=xxx@xxx.iam.gserviceaccount.com
GEE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
GEE_PROJECT_ID=silenteye-493217  # opcional, usa default si no se define
```

Si no están configuradas, el módulo se deshabilita silenciosamente (log warning al startup, 503 si se intenta usar).

---

## Limitaciones

| Limitación | Impacto | Mitigación |
|-----------|---------|------------|
| **Resolución 10m** | Detecta áreas de remoción, no hoyos individuales | Usar como herramienta de priorización, verificar en campo |
| **Dependencia de cielo despejado** | Si ambos periodos tienen <3 imágenes, resultados poco confiables | Sistema muestra advertencia `cloudWarning` automáticamente |
| **Revisita cada 5 días** | Eventos muy recientes pueden no tener imágenes "después" | Esperar unos días y re-analizar |
| **Áreas pequeñas filtradas** | Clusters <1,000 m² se descartan como ruido | Umbral necesario para evitar falsos positivos |
| **Rate limit** | 10 análisis por 15 minutos por IP | Suficiente para uso normal; evita abuso de API de GEE |
| **Gap de 5 días** | No compara el día exacto del evento | Necesario para evitar contaminar el baseline |
| **Cambios estacionales** | Puede confundir cambio estacional natural con anomalía | Interpretar resultados con contexto temporal |
| **Zonas urbanas** | BSI alto natural en áreas construidas | Más efectivo en zonas rurales/semiurbanas |

---

## Errores conocidos y troubleshooting

| Error | Causa | Solución |
|-------|-------|----------|
| 429 Too Many Requests | Rate limit del endpoint terrain | Esperar 15 minutos |
| 503 Service Unavailable | `GEE_SERVICE_ACCOUNT_EMAIL` o `GEE_PRIVATE_KEY` no configurados | Configurar env vars en Fly.io |
| 404 No satellite images | No hay imágenes Sentinel-2 para esas fechas/ubicación | Probar con rango de fechas más amplio o verificar que las coordenadas son correctas |
| Pocas imágenes (cloudWarning) | Zona muy nublada en el periodo seleccionado | Re-intentar con fechas diferentes o aceptar menor confiabilidad |
| Anomaly detection failed | Error interno de GEE en clustering | Las capas de tiles siguen funcionando; solo falla la detección automática |

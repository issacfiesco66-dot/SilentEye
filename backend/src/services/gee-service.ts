/**
 * SilentEye — Google Earth Engine Terrain Analysis Service
 * Detects terrain anomalies (vegetation changes, bare soil) using Sentinel-2 imagery.
 */

import { logger } from '../utils/logger.js';

let ee: any = null;
let geeReady = false;

export interface TerrainLayer {
  name: string;
  tileUrl: string;
  type:
    | 'ndvi'
    | 'bsi'
    | 'ndvi_diff'
    | 'bsi_diff'
    | 'true_color_before'
    | 'true_color_after'
    | 'sar_vv'
    | 'sar_vv_diff'
    | 'sar_vh'
    | 'sar_vh_diff';
}

export interface TerrainAnomaly {
  id: number;
  latitude: number;
  longitude: number;
  areaM2: number;
  severity: number; // 0-100
  type: 'vegetation_loss' | 'soil_exposure' | 'both';
  ndviChange: number;
  bsiChange: number;
  saviChange?: number;
  // Sentinel-1 SAR confirmation (when available)
  vvChange?: number;   // VV backscatter delta in dB
  vhChange?: number;   // VH backscatter delta in dB
  confidence: 'optical_only' | 'sar_confirmed';
}

export type SensitivityLevel = 'low' | 'normal' | 'high' | 'max';

interface SensitivityConfig {
  ndviThreshold: number;     // min NDVI drop to flag
  bsiThreshold: number;      // min BSI rise to flag
  saviThreshold: number;     // min SAVI drop to flag
  minIndexHits: number;      // how many indices must trigger (1=OR, 2=AND-ish, 3=all)
  minClusterPixels: number;  // min connected pixels
  minAreaM2: number;         // post-filter min area
  minSeverity: number;       // post-filter min severity
  windowDays: number;        // composite window size
  cloudPct: number;          // max cloud percentage
  maxAnomalies: number;      // max results returned
  // Sentinel-1 SAR confirmation threshold: min |VV dB delta| for an
  // optically-detected anomaly to count as SAR-confirmed. Lower = more
  // sensitive (and more false confirmations from rain/moisture).
  sarVVThreshold: number;    // dB
}

const SENSITIVITY_CONFIGS: Record<SensitivityLevel, SensitivityConfig> = {
  low: {
    ndviThreshold: 0.25,
    bsiThreshold: 0.20,
    saviThreshold: 0.22,
    minIndexHits: 2,           // must trigger 2 of 3 indices
    minClusterPixels: 15,
    minAreaM2: 500,
    minSeverity: 40,
    windowDays: 90,
    cloudPct: 25,
    maxAnomalies: 10,
    sarVVThreshold: 3.0,
  },
  normal: {
    ndviThreshold: 0.18,
    bsiThreshold: 0.14,
    saviThreshold: 0.16,
    minIndexHits: 2,           // must trigger 2 of 3 indices
    minClusterPixels: 8,
    minAreaM2: 300,
    minSeverity: 30,
    windowDays: 90,
    cloudPct: 30,
    maxAnomalies: 15,
    sarVVThreshold: 2.0,
  },
  high: {
    ndviThreshold: 0.12,
    bsiThreshold: 0.09,
    saviThreshold: 0.10,
    minIndexHits: 1,           // any single index can trigger
    minClusterPixels: 4,
    minAreaM2: 150,
    minSeverity: 20,
    windowDays: 60,
    cloudPct: 35,
    maxAnomalies: 20,
    sarVVThreshold: 1.5,
  },
  max: {
    ndviThreshold: 0.08,
    bsiThreshold: 0.06,
    saviThreshold: 0.07,
    minIndexHits: 1,           // any single index can trigger
    minClusterPixels: 2,
    minAreaM2: 50,
    minSeverity: 10,
    windowDays: 45,
    cloudPct: 40,
    maxAnomalies: 25,
    sarVVThreshold: 1.0,
  },
};

export interface TerrainAnalysisResult {
  layers: TerrainLayer[];
  bounds: { south: number; west: number; north: number; east: number };
  anomalies: TerrainAnomaly[];
  metadata: {
    baselineStart: string;
    baselineEnd: string;
    currentStart: string;
    currentEnd: string;
    baselineImages: number;
    currentImages: number;
    cloudWarning: boolean;
    sensitivity: SensitivityLevel;
    anomalyPixelCount?: number;
    anomalyError?: string;
    // Which optical sensor was used (auto-picked based on event date)
    sourceSensor: SensorId;
    sourceSensorDisplay: string;   // "Sentinel-2" | "Landsat 8" | ...
    sourcePixelScale: number;       // meters — 10 for S2, 30 for Landsat
    // Sentinel-1 SAR (validator channel)
    sarAvailable: boolean;
    sarBaselineImages: number;
    sarCurrentImages: number;
    sarError?: string;
  };
}

/**
 * Initialize Google Earth Engine with service account credentials.
 * Called once at startup — non-blocking, logs success/failure.
 */
let geeLastError: string | null = null;
let geeInitAttemptedAt: Date | null = null;

export async function initializeGEE(): Promise<void> {
  geeInitAttemptedAt = new Date();
  const email = process.env.GEE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GEE_PRIVATE_KEY;
  const projectId = process.env.GEE_PROJECT_ID;

  if (!email || !privateKey) {
    geeLastError = `Missing env: GEE_SERVICE_ACCOUNT_EMAIL=${!!email}, GEE_PRIVATE_KEY=${!!privateKey}`;
    logger.warn(`[GEE] ${geeLastError} — terrain analysis disabled. Set these in fly secrets.`);
    return;
  }

  try {
    const eeModule = await import('@google/earthengine');
    ee = eeModule.default || eeModule;

    // Robust key extraction. The secret CAN legitimately be just the PEM
    // body, but we've also seen production cases where a paste error put
    // adjacent JSON fields into the secret — e.g. the secret actually
    // contains a chunk like `"<key_id>", "private_key": "-----BEGIN..."`.
    // We pull the PEM block out with a regex so the surrounding garbage
    // doesn't reach OpenSSL's decoder.
    //
    // Supports both PKCS#8 ("PRIVATE KEY") and PKCS#1 ("RSA PRIVATE KEY").
    // Google service accounts use PKCS#8.
    const pemRegex = /-----BEGIN (?:RSA )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA )?PRIVATE KEY-----/;
    const match = privateKey.match(pemRegex);
    if (!match) {
      throw new Error(
        `GEE_PRIVATE_KEY does not contain a valid PEM block. ` +
        `Expected "-----BEGIN PRIVATE KEY-----...-----END PRIVATE KEY-----" ` +
        `(got len=${privateKey.length}, starts with: ${JSON.stringify(privateKey.slice(0, 30))})`
      );
    }
    // Convert literal \n to real newlines. Works whether the secret was
    // set from a JSON-escaped string (\\n in source → \n in env) or from
    // a raw PEM paste (already contains real newlines — replace is a no-op).
    const key = match[0].replace(/\\n/g, '\n');
    logger.info(`[GEE] Extracted ${key.length}-byte PEM body from ${privateKey.length}-byte secret`);

    await new Promise<void>((resolve, reject) => {
      ee.data.authenticateViaPrivateKey(
        { client_email: email, private_key: key },
        () => {
          ee.initialize(
            null,
            null,
            () => {
              geeReady = true;
              geeLastError = null;
              logger.info(`[GEE] Initialized successfully (project: ${projectId || 'default'})`);
              resolve();
            },
            (err: Error) => reject(err),
            null,
            projectId || undefined,
          );
        },
        (err: Error) => reject(err),
      );
    });
  } catch (err) {
    const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    geeLastError = msg;
    logger.error(`[GEE] Initialization FAILED: ${msg}`);
    if (err instanceof Error && err.stack) {
      logger.error(`[GEE] Stack: ${err.stack.split('\n').slice(0, 5).join(' | ')}`);
    }
    geeReady = false;
  }
}

export function isGeeReady(): boolean {
  return geeReady;
}

/** Returns a JSON-safe snapshot of GEE state for diagnostic endpoints. */
export function getGeeDiagnostics() {
  return {
    ready: geeReady,
    lastError: geeLastError,
    initAttemptedAt: geeInitAttemptedAt?.toISOString() || null,
    env: {
      hasEmail: !!process.env.GEE_SERVICE_ACCOUNT_EMAIL,
      hasPrivateKey: !!process.env.GEE_PRIVATE_KEY,
      hasProjectId: !!process.env.GEE_PROJECT_ID,
      projectId: process.env.GEE_PROJECT_ID || null,
    },
  };
}

// ── Sensor adapters ──────────────────────────────────────────────────
//
// Each optical satellite we support is wrapped in a SensorAdapter. The
// adapter's job is to return an ImageCollection whose bands have been
// cloud-masked, scaled to [0,1] surface reflectance, and renamed to a
// harmonized vocabulary: BLUE, GREEN, RED, NIR, SWIR1. Downstream code
// (index computation, anomaly detection, visualization) works on those
// harmonized names and is sensor-agnostic.
//
// Adding a new sensor = one adapter. Removing one = delete the adapter
// and the picker will route elsewhere.

export type SensorId = 's2' | 'landsat9' | 'landsat8' | 'landsat5';

interface SensorAdapter {
  id: SensorId;
  displayName: string;
  pixelScale: number;     // meters per pixel — used for GEE sampling + clustering
  areaPerPixel: number;   // m² per pixel — used for area estimation
  startDate: Date;        // earliest date with coverage
  endDate: Date | null;   // latest date (null = still active)
  /**
   * Build a cloud-masked, scaled, band-harmonized ImageCollection for the
   * given AOI and date window. Every returned image has exactly the bands
   * BLUE, GREEN, RED, NIR, SWIR1 in [0,1] reflectance.
   */
  buildCollection(aoi: any, startDate: string, endDate: string, cloudPct: number): any;
}

/**
 * Sentinel-2 adapter — COPERNICUS/S2_SR_HARMONIZED.
 * 10 m optical, 5-day revisit, since 2017-03-28 (L2A harmonized).
 */
const S2Adapter: SensorAdapter = {
  id: 's2',
  displayName: 'Sentinel-2',
  pixelScale: 10,
  areaPerPixel: 100,
  startDate: new Date('2017-03-28'),
  endDate: null,
  buildCollection(aoi, startDate, endDate, cloudPct) {
    return ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
      .filterBounds(aoi)
      .filterDate(startDate, endDate)
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', cloudPct))
      .map((img: any) => {
        // QA60 cloud/cirrus mask
        const qa = img.select('QA60');
        const cloudBit = 1 << 10;
        const cirrusBit = 1 << 11;
        const mask = qa.bitwiseAnd(cloudBit).eq(0).and(qa.bitwiseAnd(cirrusBit).eq(0));
        // Scale: raw DN / 10000 → reflectance
        const scaled = img.select(['B2', 'B3', 'B4', 'B8', 'B11'])
          .divide(10000)
          .rename(['BLUE', 'GREEN', 'RED', 'NIR', 'SWIR1']);
        // CRITICAL: ee.Image(...) cast. `copyProperties()` on an Image
        // returns an `ee.Element` in the JS API, not an `ee.Image`. If
        // we return the raw Element here, the resulting ImageCollection
        // has elements whose server-side type is Element, and downstream
        // operations that inspect image metadata (notably reduceColumns
        // called internally by size(), reduceRegion(), and sample()) fail
        // with "Collection.reduceColumns: Empty date ranges not supported".
        // Wrapping in ee.Image() restores the Image type.
        return ee.Image(scaled.updateMask(mask).copyProperties(img, ['system:time_start']));
      });
  },
};

/**
 * Helper for Landsat 8 / 9 — both use the OLI instrument with identical
 * band layouts, so they only differ in collection ID and start date.
 */
function makeLandsatOliAdapter(id: 'landsat8' | 'landsat9', collectionId: string, displayName: string, startDate: Date): SensorAdapter {
  return {
    id,
    displayName,
    pixelScale: 30,   // OLI optical bands are 30m
    areaPerPixel: 900,
    startDate,
    endDate: null,
    buildCollection(aoi, startDate_, endDate_, cloudPct) {
      return ee.ImageCollection(collectionId)
        .filterBounds(aoi)
        .filterDate(startDate_, endDate_)
        .filter(ee.Filter.lt('CLOUD_COVER', cloudPct))
        .map((img: any) => {
          // Collection 2 QA_PIXEL bits: 3=cloud, 4=shadow, 2=cirrus
          const qa = img.select('QA_PIXEL');
          const cloudBit = 1 << 3;
          const shadowBit = 1 << 4;
          const cirrusBit = 1 << 2;
          const mask = qa.bitwiseAnd(cloudBit).eq(0)
            .and(qa.bitwiseAnd(shadowBit).eq(0))
            .and(qa.bitwiseAnd(cirrusBit).eq(0));
          // L2 SR scaling: DN * 0.0000275 - 0.2 → reflectance
          // OLI: SR_B2=Blue, B3=Green, B4=Red, B5=NIR, B6=SWIR1
          const scaled = img.select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6'])
            .multiply(0.0000275).add(-0.2)
            .rename(['BLUE', 'GREEN', 'RED', 'NIR', 'SWIR1']);
          // ee.Image() cast — see S2Adapter for rationale.
          return ee.Image(scaled.updateMask(mask).copyProperties(img, ['system:time_start']));
        });
    },
  };
}

const L8Adapter = makeLandsatOliAdapter('landsat8', 'LANDSAT/LC08/C02/T1_L2', 'Landsat 8', new Date('2013-04-11'));
const L9Adapter = makeLandsatOliAdapter('landsat9', 'LANDSAT/LC09/C02/T1_L2', 'Landsat 9', new Date('2021-10-31'));

/**
 * Landsat 5 adapter — TM instrument. Different band numbering from OLI:
 * SR_B1=Blue, B2=Green, B3=Red, B4=NIR, B5=SWIR1. Operational 1984-2011.
 * Critical for cold cases predating every other sensor we have.
 */
const L5Adapter: SensorAdapter = {
  id: 'landsat5',
  displayName: 'Landsat 5',
  pixelScale: 30,
  areaPerPixel: 900,
  startDate: new Date('1984-03-01'),
  endDate: new Date('2011-11-30'),   // TM sensor final shutdown
  buildCollection(aoi, startDate_, endDate_, cloudPct) {
    return ee.ImageCollection('LANDSAT/LT05/C02/T1_L2')
      .filterBounds(aoi)
      .filterDate(startDate_, endDate_)
      .filter(ee.Filter.lt('CLOUD_COVER', cloudPct))
      .map((img: any) => {
        const qa = img.select('QA_PIXEL');
        const cloudBit = 1 << 3;
        const shadowBit = 1 << 4;
        const mask = qa.bitwiseAnd(cloudBit).eq(0)
          .and(qa.bitwiseAnd(shadowBit).eq(0));
        // TM: SR_B1=Blue, B2=Green, B3=Red, B4=NIR, B5=SWIR1
        const scaled = img.select(['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5'])
          .multiply(0.0000275).add(-0.2)
          .rename(['BLUE', 'GREEN', 'RED', 'NIR', 'SWIR1']);
        // ee.Image() cast — see S2Adapter for rationale.
        return ee.Image(scaled.updateMask(mask).copyProperties(img, ['system:time_start']));
      });
  },
};

// Ordered newest-to-oldest. pickSensor walks this list and returns the
// first adapter whose coverage window contains the event date.
const ALL_ADAPTERS: SensorAdapter[] = [S2Adapter, L9Adapter, L8Adapter, L5Adapter];

/**
 * Pick the best sensor for an event date. Returns null if no sensor
 * covers it (dates before 1984 or in the 2011-11 → 2013-04 gap).
 */
function pickSensor(eventDate: Date): SensorAdapter | null {
  for (const a of ALL_ADAPTERS) {
    if (eventDate >= a.startDate && (!a.endDate || eventDate <= a.endDate)) {
      return a;
    }
  }
  return null;
}

/** Sentinel-1 SAR data availability — launched Oct 2014. Relevant for
 *  the SAR validator channel: events before this must run optical-only. */
const S1_START_DATE = new Date('2014-10-03');

// ── Harmonized index computation ─────────────────────────────────────
// All three indices operate on the harmonized band names. Identical
// formulas to the original S2-specific implementations, just using
// RED/NIR/BLUE/SWIR1 instead of B4/B8/B2/B11.

/** NDVI = (NIR - Red) / (NIR + Red). +1 = dense vegetation, -1 = none. */
function computeNDVI(image: any): any {
  return image.normalizedDifference(['NIR', 'RED']).rename('NDVI');
}

/**
 * BSI (Bare Soil Index):
 * ((SWIR1 + Red) - (NIR + Blue)) / ((SWIR1 + Red) + (NIR + Blue))
 * High values = exposed soil.
 */
function computeBSI(image: any): any {
  const numerator = image.select('SWIR1').add(image.select('RED'))
    .subtract(image.select('NIR').add(image.select('BLUE')));
  const denominator = image.select('SWIR1').add(image.select('RED'))
    .add(image.select('NIR').add(image.select('BLUE')));
  return numerator.divide(denominator).rename('BSI');
}

/**
 * SAVI (Soil-Adjusted Vegetation Index):
 * ((NIR - Red) / (NIR + Red + L)) * (1 + L)  where L = 0.5
 * Better than NDVI in semi-arid / sparsely vegetated regions.
 */
function computeSAVI(image: any): any {
  const nir = image.select('NIR');
  const red = image.select('RED');
  const L = 0.5;
  return nir.subtract(red).divide(nir.add(red).add(L)).multiply(1 + L).rename('SAVI');
}

/**
 * Get a GEE tile URL for visualization via getMapId.
 */
async function getTileUrl(image: any, visParams: Record<string, any>): Promise<string> {
  return new Promise((resolve, reject) => {
    image.getMapId(visParams, (obj: any, err: string) => {
      if (err) return reject(new Error(err));
      resolve(obj.urlFormat);
    });
  });
}

/**
 * Count images in a collection (for metadata).
 */
async function countImages(collection: any): Promise<number> {
  return new Promise((resolve, reject) => {
    collection.size().evaluate((val: number, err: string) => {
      if (err) return reject(new Error(err));
      resolve(val);
    });
  });
}

// Visualization palettes
const NDVI_VIS = { min: -0.2, max: 0.8, palette: ['d73027', 'fc8d59', 'fee08b', 'd9ef8b', '91cf60', '1a9850'] };
const BSI_VIS = { min: -0.5, max: 0.5, palette: ['1a9850', '91cf60', 'fee08b', 'fc8d59', 'd73027', '7f0000'] };
const DIFF_VIS = { min: -0.5, max: 0.5, palette: ['2166ac', '67a9cf', 'd1e5f0', 'f7f7f7', 'fddbc7', 'ef8a62', 'b2182b'] };
const TRUE_COLOR_VIS = { bands: ['RED', 'GREEN', 'BLUE'], min: 0, max: 0.3 };
// Sentinel-1 GRD backscatter is in dB. Typical land values: -25 to 0 dB.
// Grayscale ramp makes it read like a traditional SAR image.
const SAR_VV_VIS = { min: -25, max: 0, palette: ['000000', '303030', '707070', 'a0a0a0', 'd0d0d0', 'ffffff'] };
const SAR_VH_VIS = { min: -30, max: -5, palette: ['000000', '303030', '707070', 'a0a0a0', 'd0d0d0', 'ffffff'] };
// Symmetric diff palette: red = backscatter rose (disturbed / rougher / drier),
// blue = backscatter fell (smoother / wetter / vegetation grew back).
const SAR_DIFF_VIS = { min: -5, max: 5, palette: ['2166ac', '67a9cf', 'd1e5f0', 'f7f7f7', 'fddbc7', 'ef8a62', 'b2182b'] };

/**
 * Main analysis: compare satellite imagery before/after an event date
 * to detect terrain anomalies (vegetation loss, bare soil exposure).
 */
export async function analyzeTerrainChange(
  lat: number,
  lon: number,
  radiusKm: number,
  eventDate: string,
  afterDate?: string,
  sensitivity: SensitivityLevel = 'normal',
): Promise<TerrainAnalysisResult> {
  if (!geeReady || !ee) {
    throw new Error('GEE_NOT_INITIALIZED');
  }

  const point = ee.Geometry.Point([lon, lat]);
  const aoi = point.buffer(radiusKm * 1000);

  const event = new Date(eventDate);
  const now = new Date();

  const cfg = SENSITIVITY_CONFIGS[sensitivity] || SENSITIVITY_CONFIGS.normal;

  // Baseline: windowDays before event to 5 days before
  // — captures how the terrain looked in its normal state
  const baselineStart = new Date(event);
  baselineStart.setDate(baselineStart.getDate() - cfg.windowDays);
  const baselineEnd = new Date(event);
  baselineEnd.setDate(baselineEnd.getDate() - 5);

  // "After" period logic:
  // - If afterDate is provided, center the 90-day window around it
  // - If event is old (>180 days) and no afterDate, compare right after the event
  // - If event is recent (<180 days), compare against today
  const SIX_MONTHS_MS = 180 * 24 * 3600 * 1000;
  const eventAge = now.getTime() - event.getTime();

  let currentStart: Date;
  let currentEnd: Date;

  if (afterDate) {
    // User specified a custom "after" date — use 5 days after to windowDays+5 days after
    const after = new Date(afterDate);
    currentStart = new Date(after);
    currentStart.setDate(currentStart.getDate() + 5);
    currentEnd = new Date(after);
    currentEnd.setDate(currentEnd.getDate() + cfg.windowDays + 5);
    // Cap at today if after date is recent
    if (currentEnd > now) currentEnd = now;
  } else if (eventAge > SIX_MONTHS_MS) {
    // Historical event (>6 months old): compare right after the event
    // This captures the terrain disruption before nature recovers it
    currentStart = new Date(event);
    currentStart.setDate(currentStart.getDate() + 5);
    currentEnd = new Date(event);
    currentEnd.setDate(currentEnd.getDate() + cfg.windowDays + 5);
    // Cap at today
    if (currentEnd > now) currentEnd = now;
  } else {
    // Recent event: compare against today (original behavior)
    currentEnd = now;
    currentStart = new Date(now);
    currentStart.setDate(currentStart.getDate() - cfg.windowDays);
  }

  // Ensure current period doesn't overlap with baseline
  if (currentStart < baselineEnd) {
    currentStart.setTime(baselineEnd.getTime());
    currentStart.setDate(currentStart.getDate() + 1);
  }

  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  // ── Sensor selection ────────────────────────────────────────────────
  // Pick the best optical sensor for this event date. Preference order:
  // Sentinel-2 (10m) → Landsat 9 (30m) → Landsat 8 (30m) → Landsat 5 (30m).
  // Pre-1984 or the 2011-11→2013-04 gap will return null and error out.
  const sensor = pickSensor(event);
  if (!sensor) {
    throw new Error('NO_SENSOR_COVERAGE');
  }
  logger.info(`[GEE] Sensor selected: ${sensor.displayName} (scale=${sensor.pixelScale}m) for event ${fmt(event)}`);

  const baselineCollection = sensor.buildCollection(aoi, fmt(baselineStart), fmt(baselineEnd), cfg.cloudPct);
  const currentCollection = sensor.buildCollection(aoi, fmt(currentStart), fmt(currentEnd), cfg.cloudPct);

  // Count images for metadata
  const [baselineCount, currentCount] = await Promise.all([
    countImages(baselineCollection),
    countImages(currentCollection),
  ]);

  if (baselineCount === 0 || currentCount === 0) {
    throw new Error('NO_IMAGES_FOUND');
  }

  // Median composites — harmonized bands: BLUE, GREEN, RED, NIR, SWIR1
  const baseline = baselineCollection.median().clip(aoi);
  const current = currentCollection.median().clip(aoi);

  // Compute indices (sensor-agnostic — works on harmonized band names)
  const ndviBefore = computeNDVI(baseline);
  const ndviAfter = computeNDVI(current);
  const ndviDiff = ndviAfter.subtract(ndviBefore).rename('NDVI_diff');

  const bsiBefore = computeBSI(baseline);
  const bsiAfter = computeBSI(current);
  const bsiDiff = bsiAfter.subtract(bsiBefore).rename('BSI_diff');

  // SAVI — better for sparse vegetation / semi-arid regions
  const saviBefore = computeSAVI(baseline);
  const saviAfter = computeSAVI(current);
  const saviDiff = saviAfter.subtract(saviBefore).rename('SAVI_diff');

  const cloudWarning = baselineCount < 3 || currentCount < 3;

  // ── Sentinel-1 SAR (validator channel) ───────────────────────────────
  // S1 is used ONLY to confirm optical anomalies — it never triggers one
  // by itself. Rain, irrigation and soil-moisture swings cause large
  // backscatter changes that have nothing to do with excavation, so a
  // standalone SAR detector would be a false-positive machine. But when
  // optical NDVI/BSI/SAVI already agree something changed, SAR confirmation
  // is an independent signal that massively raises confidence.
  //
  // Using GRD (Ground Range Detected) — values already in dB. We keep
  // VV (sensitive to surface roughness / bare soil) and VH (vegetation
  // volume scattering).
  let vvDiff: any = null;
  let vhDiff: any = null;
  let sarAvailable = false;
  let sarBaselineImages = 0;
  let sarCurrentImages = 0;
  let sarError: string | undefined;
  let sarLayers: TerrainLayer[] = [];

  // S1 didn't exist before 2014-10 — skip the SAR channel entirely for
  // older cold cases. Landsat-era events run optical-only.
  const s1EligibleByDate = event >= S1_START_DATE;

  if (!s1EligibleByDate) {
    logger.info(`[GEE] Event ${fmt(event)} predates Sentinel-1 launch (${fmt(S1_START_DATE)}) — optical-only analysis`);
    sarError = 'Event predates Sentinel-1 launch (2014-10-03)';
  }

  try {
    if (!s1EligibleByDate) throw new Error('SAR_SKIPPED_BY_DATE');
    const s1 = ee.ImageCollection('COPERNICUS/S1_GRD')
      .filterBounds(aoi)
      .filter(ee.Filter.eq('instrumentMode', 'IW'))
      .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
      .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'));

    const s1Baseline = s1.filterDate(fmt(baselineStart), fmt(baselineEnd));
    const s1Current = s1.filterDate(fmt(currentStart), fmt(currentEnd));

    [sarBaselineImages, sarCurrentImages] = await Promise.all([
      countImages(s1Baseline),
      countImages(s1Current),
    ]);

    if (sarBaselineImages > 0 && sarCurrentImages > 0) {
      const s1BaselineImg = s1Baseline.select(['VV', 'VH']).median().clip(aoi);
      const s1CurrentImg = s1Current.select(['VV', 'VH']).median().clip(aoi);

      const vvBefore = s1BaselineImg.select('VV');
      const vvAfter = s1CurrentImg.select('VV');
      vvDiff = vvAfter.subtract(vvBefore).rename('VV_diff');

      const vhBefore = s1BaselineImg.select('VH');
      const vhAfter = s1CurrentImg.select('VH');
      vhDiff = vhAfter.subtract(vhBefore).rename('VH_diff');

      const [
        sarVvBeforeUrl,
        sarVvAfterUrl,
        sarVvDiffUrl,
        sarVhBeforeUrl,
        sarVhAfterUrl,
        sarVhDiffUrl,
      ] = await Promise.all([
        getTileUrl(vvBefore, SAR_VV_VIS),
        getTileUrl(vvAfter, SAR_VV_VIS),
        getTileUrl(vvDiff, SAR_DIFF_VIS),
        getTileUrl(vhBefore, SAR_VH_VIS),
        getTileUrl(vhAfter, SAR_VH_VIS),
        getTileUrl(vhDiff, SAR_DIFF_VIS),
      ]);

      sarLayers = [
        { name: 'sar_vv_before', tileUrl: sarVvBeforeUrl, type: 'sar_vv' },
        { name: 'sar_vv_after', tileUrl: sarVvAfterUrl, type: 'sar_vv' },
        { name: 'sar_vv_diff', tileUrl: sarVvDiffUrl, type: 'sar_vv_diff' },
        { name: 'sar_vh_before', tileUrl: sarVhBeforeUrl, type: 'sar_vh' },
        { name: 'sar_vh_after', tileUrl: sarVhAfterUrl, type: 'sar_vh' },
        { name: 'sar_vh_diff', tileUrl: sarVhDiffUrl, type: 'sar_vh_diff' },
      ];
      sarAvailable = true;
      logger.info(`[GEE] S1 SAR ready: ${sarBaselineImages} before, ${sarCurrentImages} after`);
    } else {
      logger.info(`[GEE] S1 SAR unavailable for window (before=${sarBaselineImages}, after=${sarCurrentImages}) — continuing optical-only`);
    }
  } catch (sarErr: any) {
    const msg = sarErr?.message || String(sarErr);
    if (msg === 'SAR_SKIPPED_BY_DATE') {
      // Already logged above — not really an error, just a skip.
    } else {
      sarError = msg;
      logger.warn(`[GEE] S1 SAR pipeline failed: ${sarError} — continuing optical-only`);
    }
  }

  // Generate optical tile URLs in parallel
  const [
    ndviBeforeUrl,
    ndviAfterUrl,
    ndviDiffUrl,
    bsiBeforeUrl,
    bsiAfterUrl,
    bsiDiffUrl,
    trueColorBeforeUrl,
    trueColorAfterUrl,
  ] = await Promise.all([
    getTileUrl(ndviBefore, NDVI_VIS),
    getTileUrl(ndviAfter, NDVI_VIS),
    getTileUrl(ndviDiff, DIFF_VIS),
    getTileUrl(bsiBefore, BSI_VIS),
    getTileUrl(bsiAfter, BSI_VIS),
    getTileUrl(bsiDiff, DIFF_VIS),
    getTileUrl(baseline, TRUE_COLOR_VIS),
    getTileUrl(current, TRUE_COLOR_VIS),
  ]);

  // ── Anomaly detection (robust approach: sample + JS clustering) ──────
  let anomalies: TerrainAnomaly[] = [];
  let anomalyPixelCount = 0;
  let anomalyError: string | undefined;
  try {
    // Multi-index thresholding with sensitivity-aware parameters
    // Require at least 2 of 3 indices to flag — single-index hits are often noise
    const vegLoss = ndviDiff.lt(-cfg.ndviThreshold);       // NDVI drop (binary)
    const soilExposure = bsiDiff.gt(cfg.bsiThreshold);     // BSI rise (binary)
    const saviLoss = saviDiff.lt(-cfg.saviThreshold);      // SAVI drop (binary)
    // Rename to common band before adding (GEE .add() requires matching band names)
    const indexCount = vegLoss.rename('flag')
      .add(soilExposure.rename('flag'))
      .add(saviLoss.rename('flag')); // 0-3
    // minIndexHits: 1 = any single index triggers (OR), 2 = need 2 of 3 (stricter)
    const anyAnomaly = indexCount.gte(cfg.minIndexHits);

    // Step 1: Count how many anomalous pixels exist (diagnostic).
    // Scale is sensor-native: 10m for S2, 30m for Landsat.
    const pixelCountResult: number = await new Promise((resolve, reject) => {
      anyAnomaly.selfMask().reduceRegion({
        reducer: ee.Reducer.count(),
        geometry: aoi,
        scale: sensor.pixelScale,
        maxPixels: 1e7,
      }).evaluate((result: any, err: string) => {
        if (err) return reject(new Error(err));
        // The band name could be 'NDVI_diff' or 'constant' depending on GEE
        const val = result ? Object.values(result)[0] : 0;
        resolve(typeof val === 'number' ? val : 0);
      });
    });
    anomalyPixelCount = pixelCountResult;
    logger.info(`[GEE] Anomalous pixels found: ${anomalyPixelCount} (sensitivity: ${sensitivity})`);

    if (anomalyPixelCount === 0) {
      logger.info('[GEE] No anomalous pixels — skipping clustering');
    } else {
      // Step 2: Stack index values + coords onto the anomaly mask.
      // If SAR is available we also stack VV_diff / VH_diff so the same
      // sample() pass returns SAR values at each anomalous pixel — no
      // extra GEE round trip needed.
      let anomalyImage: any = anyAnomaly.selfMask()
        .addBands(ndviDiff)
        .addBands(bsiDiff)
        .addBands(saviDiff)
        .addBands(vegLoss.rename('veg_loss'))
        .addBands(soilExposure.rename('soil_exp'))
        .addBands(ee.Image.pixelLonLat());
      if (sarAvailable && vvDiff && vhDiff) {
        anomalyImage = anomalyImage.addBands(vvDiff).addBands(vhDiff);
      }

      // Step 3: Sample anomalous pixels directly (no connectedComponents).
      // Scale matches sensor native resolution.
      const numSamples = sensitivity === 'max' ? 200 : sensitivity === 'high' ? 150 : 100;
      const sampled = anomalyImage.sample({
        region: aoi,
        scale: sensor.pixelScale,
        numPixels: Math.min(numSamples, anomalyPixelCount),
        geometries: true,
      });

      const rawSamples: any[] = await new Promise((resolve, reject) => {
        sampled.evaluate((fc: any, err: string) => {
          if (err) return reject(new Error(err));
          resolve(fc?.features || []);
        });
      });
      logger.info(`[GEE] Sampled ${rawSamples.length} anomalous pixels`);

      // Step 4: Cluster nearby sampled pixels in JS (simple grid-based grouping).
      // "~3 pixels" tolerance — depends on the sensor's native scale.
      // S2 (10m): 30m ≈ 0.00027°.  Landsat (30m): 90m ≈ 0.00081°.
      const CLUSTER_DIST = (3 * sensor.pixelScale) / 111_000; // meters → degrees
      const points = rawSamples.map((f: any) => ({
        lon: f.geometry?.coordinates?.[0] ?? 0,
        lat: f.geometry?.coordinates?.[1] ?? 0,
        ndvi: f.properties?.NDVI_diff ?? 0,
        bsi: f.properties?.BSI_diff ?? 0,
        savi: f.properties?.SAVI_diff ?? 0,
        vegLoss: f.properties?.veg_loss ?? 0,
        soilExp: f.properties?.soil_exp ?? 0,
        // SAR values in dB (null if SAR wasn't available or pixel had no S1 coverage)
        vv: typeof f.properties?.VV_diff === 'number' ? f.properties.VV_diff : null,
        vh: typeof f.properties?.VH_diff === 'number' ? f.properties.VH_diff : null,
        clusterId: -1,
      }));

      // Simple single-pass clustering: assign to nearest existing cluster or create new
      let nextCluster = 0;
      const clusters: Map<number, typeof points> = new Map();
      for (const pt of points) {
        let assigned = false;
        for (const [cid, members] of clusters) {
          const centLon = members.reduce((s, m) => s + m.lon, 0) / members.length;
          const centLat = members.reduce((s, m) => s + m.lat, 0) / members.length;
          if (Math.abs(pt.lon - centLon) < CLUSTER_DIST && Math.abs(pt.lat - centLat) < CLUSTER_DIST) {
            pt.clusterId = cid;
            members.push(pt);
            assigned = true;
            break;
          }
        }
        if (!assigned) {
          pt.clusterId = nextCluster;
          clusters.set(nextCluster, [pt]);
          nextCluster++;
        }
      }

      // Step 5: Build anomalies from clusters (filter small clusters first).
      // The config's minClusterPixels is calibrated for 10m pixels — adapt it
      // so the effective area threshold stays consistent across sensors. For
      // 30m pixels we need ~9× fewer pixels to hit the same area.
      const sensorMinClusterPixels = Math.max(
        1,
        Math.floor(cfg.minClusterPixels * (100 / sensor.areaPerPixel)),
      );
      anomalies = Array.from(clusters.values())
        .filter((members) => members.length >= sensorMinClusterPixels)
        .map((members, i) => {
          const avgLon = members.reduce((s, m) => s + m.lon, 0) / members.length;
          const avgLat = members.reduce((s, m) => s + m.lat, 0) / members.length;
          const avgNdvi = members.reduce((s, m) => s + m.ndvi, 0) / members.length;
          const avgBsi = members.reduce((s, m) => s + m.bsi, 0) / members.length;
          const avgSavi = members.reduce((s, m) => s + m.savi, 0) / members.length;
          const hasVegLoss = members.some(m => m.vegLoss > 0);
          const hasSoilExp = members.some(m => m.soilExp > 0);

          // SAR averages — only over members that actually have values.
          // (Members may have null if the pixel fell outside the S1 swath.)
          const vvSamples = members.map(m => m.vv).filter((v): v is number => typeof v === 'number');
          const vhSamples = members.map(m => m.vh).filter((v): v is number => typeof v === 'number');
          const avgVv = vvSamples.length > 0 ? vvSamples.reduce((s, v) => s + v, 0) / vvSamples.length : null;
          const avgVh = vhSamples.length > 0 ? vhSamples.reduce((s, v) => s + v, 0) / vhSamples.length : null;
          // SAR confirms when VV delta is strong enough in either direction.
          // Disturbed ground usually shows VV rise (rougher) but can fall if
          // the disturbance is smoother or wetter than baseline — so we
          // check absolute value.
          const sarConfirmed = sarAvailable && avgVv !== null && Math.abs(avgVv) >= cfg.sarVVThreshold;

          // Estimate area: each sampled pixel represents (totalAnomalyPixels / sampleCount) pixels.
          // Pixel footprint is sensor-native: 100 m² for S2 (10m), 900 m² for Landsat (30m).
          const scaleFactor = anomalyPixelCount / rawSamples.length;
          const estimatedPixels = members.length * scaleFactor;
          const areaM2 = Math.round(estimatedPixels * sensor.areaPerPixel);

          const maxChange = Math.max(Math.abs(avgNdvi), Math.abs(avgBsi), Math.abs(avgSavi));
          const combinedChange = (Math.abs(avgNdvi) + Math.abs(avgBsi) + Math.abs(avgSavi)) / 3;
          // Harder severity curve: divisor 0.5 instead of 0.3 so only strong changes score high
          const changeMagnitude = Math.min(1, (maxChange * 0.5 + combinedChange * 0.5) / 0.5);
          const areaNorm = Math.min(1, areaM2 / 10000);
          // Bonus for triggering all 3 indices (strongest signal)
          const tripleHit = (hasVegLoss && hasSoilExp && members.some(m => Math.abs(m.savi) > cfg.saviThreshold)) ? 10 : 0;
          // SAR confirmation bonus — an independent sensor corroborating
          // optical change is a much stronger signal than optical alone.
          const sarBonus = sarConfirmed ? 15 : 0;
          const severity = Math.min(100, Math.round(changeMagnitude * 65 + areaNorm * 25 + tripleHit + sarBonus));

          const type: TerrainAnomaly['type'] = (hasVegLoss && hasSoilExp) ? 'both'
            : hasVegLoss ? 'vegetation_loss'
            : 'soil_exposure';

          const anomaly: TerrainAnomaly = {
            id: i + 1,
            latitude: avgLat,
            longitude: avgLon,
            areaM2,
            severity,
            type,
            ndviChange: Math.round(avgNdvi * 1000) / 1000,
            bsiChange: Math.round(avgBsi * 1000) / 1000,
            saviChange: Math.round(avgSavi * 1000) / 1000,
            confidence: sarConfirmed ? 'sar_confirmed' : 'optical_only',
          };
          if (avgVv !== null) anomaly.vvChange = Math.round(avgVv * 10) / 10;
          if (avgVh !== null) anomaly.vhChange = Math.round(avgVh * 10) / 10;
          return anomaly;
        })
        .filter((a) => a.severity >= cfg.minSeverity && a.areaM2 >= cfg.minAreaM2)
        .sort((a, b) => b.severity - a.severity)
        .slice(0, cfg.maxAnomalies);
    }

    const sarConfirmedCount = anomalies.filter(a => a.confidence === 'sar_confirmed').length;
    logger.info(`[GEE] Detected ${anomalies.length} anomalies from ${anomalyPixelCount} pixels (sensitivity: ${sensitivity}, sar_confirmed: ${sarConfirmedCount}/${anomalies.length})`);
  } catch (anomalyErr: any) {
    anomalyError = anomalyErr?.message || String(anomalyErr);
    logger.warn('[GEE] Anomaly detection failed:', anomalyError);
  }

  // Calculate bounds for the AOI
  const boundsOffset = radiusKm / 111; // rough degree conversion
  const bounds = {
    south: lat - boundsOffset,
    west: lon - boundsOffset,
    north: lat + boundsOffset,
    east: lon + boundsOffset,
  };

  return {
    anomalies,
    layers: [
      { name: 'true_color_before', tileUrl: trueColorBeforeUrl, type: 'true_color_before' },
      { name: 'true_color_after', tileUrl: trueColorAfterUrl, type: 'true_color_after' },
      { name: 'ndvi_before', tileUrl: ndviBeforeUrl, type: 'ndvi' },
      { name: 'ndvi_after', tileUrl: ndviAfterUrl, type: 'ndvi' },
      { name: 'ndvi_diff', tileUrl: ndviDiffUrl, type: 'ndvi_diff' },
      { name: 'bsi_before', tileUrl: bsiBeforeUrl, type: 'bsi' },
      { name: 'bsi_after', tileUrl: bsiAfterUrl, type: 'bsi' },
      { name: 'bsi_diff', tileUrl: bsiDiffUrl, type: 'bsi_diff' },
      ...sarLayers,
    ],
    bounds,
    metadata: {
      baselineStart: fmt(baselineStart),
      baselineEnd: fmt(baselineEnd),
      currentStart: fmt(currentStart),
      currentEnd: fmt(currentEnd),
      baselineImages: baselineCount,
      currentImages: currentCount,
      cloudWarning,
      sensitivity,
      anomalyPixelCount,
      anomalyError,
      sourceSensor: sensor.id,
      sourceSensorDisplay: sensor.displayName,
      sourcePixelScale: sensor.pixelScale,
      sarAvailable,
      sarBaselineImages,
      sarCurrentImages,
      sarError,
    },
  };
}

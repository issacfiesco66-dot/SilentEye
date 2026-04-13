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
  type: 'ndvi' | 'bsi' | 'ndvi_diff' | 'bsi_diff' | 'true_color_before' | 'true_color_after';
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
}

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
  };
}

/**
 * Initialize Google Earth Engine with service account credentials.
 * Called once at startup — non-blocking, logs success/failure.
 */
export async function initializeGEE(): Promise<void> {
  const email = process.env.GEE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GEE_PRIVATE_KEY;
  const projectId = process.env.GEE_PROJECT_ID;

  if (!email || !privateKey) {
    logger.warn('[GEE] GEE_SERVICE_ACCOUNT_EMAIL or GEE_PRIVATE_KEY not set — terrain analysis disabled');
    return;
  }

  try {
    const eeModule = await import('@google/earthengine');
    ee = eeModule.default || eeModule;

    const key = privateKey.replace(/\\n/g, '\n');

    await new Promise<void>((resolve, reject) => {
      ee.data.authenticateViaPrivateKey(
        { client_email: email, private_key: key },
        () => {
          ee.initialize(
            null,
            null,
            () => {
              geeReady = true;
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
    logger.error('[GEE] Initialization failed:', err);
    geeReady = false;
  }
}

export function isGeeReady(): boolean {
  return geeReady;
}

/**
 * Mask clouds and cirrus from a Sentinel-2 SR image using the QA60 band.
 */
function maskS2Clouds(image: any): any {
  const qa = image.select('QA60');
  // Bits 10 = opaque clouds, 11 = cirrus
  const cloudBitMask = 1 << 10;
  const cirrusBitMask = 1 << 11;
  const mask = qa.bitwiseAnd(cloudBitMask).eq(0).and(qa.bitwiseAnd(cirrusBitMask).eq(0));
  return image.updateMask(mask).divide(10000);
}

/**
 * Calculate NDVI: (NIR - Red) / (NIR + Red) = (B8 - B4) / (B8 + B4)
 */
function computeNDVI(image: any): any {
  return image.normalizedDifference(['B8', 'B4']).rename('NDVI');
}

/**
 * Calculate BSI (Bare Soil Index):
 * ((SWIR1 + Red) - (NIR + Blue)) / ((SWIR1 + Red) + (NIR + Blue))
 * = ((B11 + B4) - (B8 + B2)) / ((B11 + B4) + (B8 + B2))
 */
function computeBSI(image: any): any {
  const numerator = image.select('B11').add(image.select('B4'))
    .subtract(image.select('B8').add(image.select('B2')));
  const denominator = image.select('B11').add(image.select('B4'))
    .add(image.select('B8').add(image.select('B2')));
  return numerator.divide(denominator).rename('BSI');
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
const TRUE_COLOR_VIS = { bands: ['B4', 'B3', 'B2'], min: 0, max: 0.3 };

/**
 * Main analysis: compare satellite imagery before/after an event date
 * to detect terrain anomalies (vegetation loss, bare soil exposure).
 */
export async function analyzeTerrainChange(
  lat: number,
  lon: number,
  radiusKm: number,
  eventDate: string,
): Promise<TerrainAnalysisResult> {
  if (!geeReady || !ee) {
    throw new Error('GEE_NOT_INITIALIZED');
  }

  const point = ee.Geometry.Point([lon, lat]);
  const aoi = point.buffer(radiusKm * 1000);

  const event = new Date(eventDate);
  // Baseline: 60 days before event to 5 days before
  const baselineStart = new Date(event);
  baselineStart.setDate(baselineStart.getDate() - 60);
  const baselineEnd = new Date(event);
  baselineEnd.setDate(baselineEnd.getDate() - 5);
  // Current: event date to 30 days after
  const currentStart = new Date(event);
  const currentEnd = new Date(event);
  currentEnd.setDate(currentEnd.getDate() + 30);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(aoi)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30));

  const baselineCollection = s2
    .filterDate(fmt(baselineStart), fmt(baselineEnd))
    .map(maskS2Clouds);
  const currentCollection = s2
    .filterDate(fmt(currentStart), fmt(currentEnd))
    .map(maskS2Clouds);

  // Count images for metadata
  const [baselineCount, currentCount] = await Promise.all([
    countImages(baselineCollection),
    countImages(currentCollection),
  ]);

  if (baselineCount === 0 || currentCount === 0) {
    throw new Error('NO_IMAGES_FOUND');
  }

  // Median composites
  const baseline = baselineCollection.median().clip(aoi);
  const current = currentCollection.median().clip(aoi);

  // Compute indices
  const ndviBefore = computeNDVI(baseline);
  const ndviAfter = computeNDVI(current);
  const ndviDiff = ndviAfter.subtract(ndviBefore).rename('NDVI_diff');

  const bsiBefore = computeBSI(baseline);
  const bsiAfter = computeBSI(current);
  const bsiDiff = bsiAfter.subtract(bsiBefore).rename('BSI_diff');

  const cloudWarning = baselineCount < 3 || currentCount < 3;

  // Generate tile URLs in parallel
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

  // ── Anomaly detection ──────────────────────────────────────────────────
  let anomalies: TerrainAnomaly[] = [];
  try {
    // Threshold: significant vegetation loss OR soil exposure
    const vegLoss = ndviDiff.lt(-0.15);      // NDVI dropped > 0.15
    const soilExposure = bsiDiff.gt(0.1);    // BSI increased > 0.1
    const anyAnomaly = vegLoss.or(soilExposure);
    const bothAnomaly = vegLoss.and(soilExposure);

    // Filter tiny clusters: keep only connected areas >= 10 pixels (~1000m²)
    const pixelCount = anyAnomaly.selfMask().connectedPixelCount(50, false);
    const largeClusters = anyAnomaly.updateMask(pixelCount.gte(10));

    // Label connected components
    const labeled = largeClusters.selfMask()
      .multiply(0).add(1) // binary 1 for anomalous pixels
      .toInt();
    const connected = labeled.connectedComponents({
      connectedness: ee.Kernel.square(1),
      maxSize: 256,
    });
    const labels = connected.select('labels');

    // Stack bands for reduction: labels, ndviDiff, bsiDiff, bothAnomaly, coords
    const forReduction = labels
      .addBands(ndviDiff)
      .addBands(bsiDiff)
      .addBands(bothAnomaly.rename('both'))
      .addBands(ee.Image.pixelLonLat());

    // Reduce by label to get stats per cluster
    const stats = forReduction.reduceConnectedComponents({
      reducer: ee.Reducer.mean().combine({
        reducer2: ee.Reducer.count(),
        sharedInputs: false,
      }),
      labelBand: 'labels',
    });

    // Sample the cluster centroids
    const vectors = stats.sample({
      region: aoi,
      scale: 10,
      numPixels: 100,
      geometries: true,
    });

    const rawAnomalies: any[] = await new Promise((resolve, reject) => {
      vectors.evaluate((fc: any, err: string) => {
        if (err) return reject(new Error(err));
        resolve(fc?.features || []);
      });
    });

    anomalies = rawAnomalies
      .map((f: any, i: number) => {
        const props = f.properties || {};
        const coords = f.geometry?.coordinates || [0, 0];
        const ndviMean = props.NDVI_diff_mean ?? props.NDVI_diff ?? 0;
        const bsiMean = props.BSI_diff_mean ?? props.BSI_diff ?? 0;
        const bothVal = props.both_mean ?? props.both ?? 0;
        const count = props.labels_count ?? props.count ?? 1;
        const areaM2 = count * 100; // 10m resolution → 100m² per pixel

        // Severity: 0-100 based on magnitude of change and area
        const changeMagnitude = Math.min(1, (Math.abs(ndviMean) + Math.abs(bsiMean)) / 0.6);
        const areaNorm = Math.min(1, areaM2 / 5000);
        const severity = Math.round(changeMagnitude * 70 + areaNorm * 30);

        const type: TerrainAnomaly['type'] = bothVal > 0.5 ? 'both'
          : Math.abs(ndviMean) > Math.abs(bsiMean) ? 'vegetation_loss'
          : 'soil_exposure';

        return {
          id: i + 1,
          latitude: coords[1],
          longitude: coords[0],
          areaM2: Math.round(areaM2),
          severity,
          type,
          ndviChange: Math.round(ndviMean * 1000) / 1000,
          bsiChange: Math.round(bsiMean * 1000) / 1000,
        };
      })
      .filter((a: TerrainAnomaly) => a.areaM2 >= 100 && a.severity >= 20)
      .sort((a: TerrainAnomaly, b: TerrainAnomaly) => b.severity - a.severity)
      .slice(0, 20); // top 20 anomalies max

    logger.info(`[GEE] Detected ${anomalies.length} anomalies in analysis`);
  } catch (anomalyErr) {
    logger.warn('[GEE] Anomaly detection failed (tiles still available):', anomalyErr);
    // Non-fatal: tile layers still work even if anomaly detection fails
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
    },
  };
}

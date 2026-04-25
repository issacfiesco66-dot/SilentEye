/**
 * SilentEye - seed SESNSP state-level risk_zones.
 *
 * Joins two data sources:
 *   1. mexico-states-risk.json   risk score (0-100) per state, sourced
 *      from SESNSP CNSP/38/15 (corte 2026-03-31). Directional today,
 *      exact CSV values planned for Fase 2.
 *   2. mexico-states.geojson     real INEGI polygons (simplified from
 *      Marco Geoestadistico, redistributed via github.com/strotgen/
 *      mexico-leaflet, underlying data is public domain). Each feature
 *      has state_code matching the JSON 'code' field after zero-padding.
 *
 * Each state becomes one risk_zone with a real Polygon or MultiPolygon
 * (states with offshore islands keep their full geometry).
 *
 * Idempotent: deletes every source='sesnsp' row first, then inserts
 * fresh inside a transaction. Re-running with updated data produces a
 * clean, consistent result without touching zones from other sources.
 *
 * Usage:
 *   npm run seed:risk-zones
 *
 * Requires:
 *   - migration 026_trailers.sql (creates risk_zones table)
 *   - migration 027_risk_zones_multipolygon.sql (relaxes zone type)
 *   - PostGIS on the target DB
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../db/pool.js';
import { logger } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface StateScore {
  code: string;        // zero-padded "01" through "32"
  name: string;
  risk_score: number;
}

interface ScoresFile {
  _meta: Record<string, unknown>;
  states: StateScore[];
}

interface GeoFeature {
  type: 'Feature';
  properties: { state_code: number; state_name: string };
  geometry:
    | { type: 'Polygon'; coordinates: number[][][] }
    | { type: 'MultiPolygon'; coordinates: number[][][][] };
}

interface GeoCollection {
  type: 'FeatureCollection';
  features: GeoFeature[];
}

function pad2(n: number | string): string {
  const s = String(n);
  return s.length >= 2 ? s : `0${s}`;
}

/** GeoJSON ring -> WKT "lng lat, lng lat, ..." */
function ringToWkt(ring: number[][]): string {
  return ring.map(([lng, lat]) => `${lng} ${lat}`).join(', ');
}

/** Polygon -> WKT body "((outer), (hole1), ...)" */
function polygonToWkt(rings: number[][][]): string {
  return `(${rings.map((r) => `(${ringToWkt(r)})`).join(', ')})`;
}

/** Build a MultiPolygon WKT from any GeoJSON Polygon | MultiPolygon. */
function geoJsonToMultiPolygonWkt(geom: GeoFeature['geometry']): string {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  return `MULTIPOLYGON(${polys.map(polygonToWkt).join(', ')})`;
}

async function main() {
  const dataDir = join(__dirname, 'data');
  const scores = JSON.parse(readFileSync(join(dataDir, 'mexico-states-risk.json'), 'utf-8')) as ScoresFile;
  const geo = JSON.parse(readFileSync(join(dataDir, 'mexico-states.geojson'), 'utf-8')) as GeoCollection;

  if (scores.states.length !== 32) {
    logger.error(`[seed] expected 32 states in scores file, got ${scores.states.length}`);
    process.exit(1);
  }
  if (geo.features.length !== 32) {
    logger.error(`[seed] expected 32 features in geojson, got ${geo.features.length}`);
    process.exit(1);
  }

  // Index geometries by zero-padded state_code so we can join with the
  // JSON's "01".."32" codes.
  const geomByCode = new Map<string, GeoFeature>();
  for (const f of geo.features) {
    geomByCode.set(pad2(f.properties.state_code), f);
  }

  // Verify every score has a matching geometry before touching the DB.
  const missing = scores.states.filter((s) => !geomByCode.has(s.code));
  if (missing.length > 0) {
    logger.error(`[seed] no geometry for: ${missing.map((s) => `${s.code} ${s.name}`).join(', ')}`);
    process.exit(1);
  }

  logger.info(`[seed] joined ${scores.states.length} states scores+polygons`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM risk_zones WHERE source = 'sesnsp'",
    );
    const existingCount = parseInt(existing.rows[0].count, 10);
    if (existingCount > 0) {
      logger.info(`[seed] clearing ${existingCount} existing SESNSP-sourced zones`);
      await client.query("DELETE FROM risk_zones WHERE source = 'sesnsp'");
    }

    let inserted = 0;
    for (const s of scores.states) {
      const feature = geomByCode.get(s.code)!;
      const wkt = geoJsonToMultiPolygonWkt(feature.geometry);
      const description = `Robo de veh\u00edculo automotor (SESNSP CNSP/38/15). Score ${s.risk_score}/100. Pol\u00edgono INEGI Marco Geoestad\u00edstico simplificado v\u00eda strotgen/mexico-leaflet (datos p\u00fablicos).`;
      await client.query(
        `INSERT INTO risk_zones (
           name, description, source, category, risk_score, zone, active_from, created_by
         ) VALUES ($1, $2, 'sesnsp', 'cargo_theft', $3,
                   ST_Multi(ST_SetSRID(ST_GeomFromText($4), 4326)),
                   NOW(), NULL)`,
        [s.name, description, s.risk_score, wkt],
      );
      inserted++;
    }

    await client.query('COMMIT');
    logger.info(`[seed] inserted ${inserted} SESNSP risk_zones with real INEGI polygons`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => { /* ignore */ });
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[seed] failed: ${msg}`);
    process.exit(1);
  } finally {
    client.release();
  }

  await pool.end();
}

main().catch((err) => {
  logger.error(`[seed] fatal: ${err?.message || err}`);
  process.exit(1);
});

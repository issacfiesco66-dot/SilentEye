/**
 * SilentEye — seed SESNSP state-level risk_zones.
 *
 * Populates the trailers module's `risk_zones` table with one entry per
 * Mexican state, sourced from public SESNSP data (CNSP/38/15 "Unidades
 * robadas 2015-2026"). Polygons are bounding-box approximations; risk
 * scores (0-100) are directional rankings from 2024-2025 per-capita
 * stolen-vehicle-with-violence rates.
 *
 * Idempotent: deletes every `source = 'sesnsp'` row first, then inserts
 * fresh. Running again after updated data produces a clean, consistent
 * result without touching manually-created zones from other sources.
 *
 * Usage:
 *   npm run seed:risk-zones
 *
 * Upgrade path (Fase 2):
 *   - Replace the JSON with a CSV fetcher that hits datos.gob.mx monthly.
 *   - Replace bounding-box polygons with INEGI state shapefiles.
 *   - Replace with Incidencia Delictiva Municipal (IDM) for ~2,500 rows.
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../db/pool.js';
import { logger } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface StateRow {
  code: string;
  name: string;
  risk_score: number;
  polygon: [number, number][];
}

interface DataFile {
  _meta: Record<string, unknown>;
  states: StateRow[];
}

function validateState(s: StateRow): string | null {
  if (!s.code || !s.name) return 'missing code or name';
  if (typeof s.risk_score !== 'number' || s.risk_score < 0 || s.risk_score > 100) {
    return `risk_score out of range: ${s.risk_score}`;
  }
  if (!Array.isArray(s.polygon) || s.polygon.length < 4) {
    return 'polygon needs at least 4 points';
  }
  const first = s.polygon[0];
  const last = s.polygon[s.polygon.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    return 'polygon must close on itself (first == last point)';
  }
  for (const [lng, lat] of s.polygon) {
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return 'non-finite coords';
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return 'coords out of range';
  }
  return null;
}

async function main() {
  const dataPath = join(__dirname, 'data', 'mexico-states-risk.json');
  const raw = readFileSync(dataPath, 'utf-8');
  const data = JSON.parse(raw) as DataFile;

  logger.info(`[seed] loaded ${data.states.length} states from ${dataPath}`);

  for (const s of data.states) {
    const err = validateState(s);
    if (err) {
      logger.error(`[seed] invalid state ${s.code} "${s.name}": ${err}`);
      process.exit(1);
    }
  }

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
    for (const s of data.states) {
      const wktPoints = s.polygon.map(([lng, lat]) => `${lng} ${lat}`).join(', ');
      const description = `Robo de veh\u00edculo automotor (SESNSP CNSP/38/15). Score ${s.risk_score}/100 relativo al promedio nacional 2024-2025. Pol\u00edgono es bounding-box aproximado — migrar a INEGI shapefile en Fase 2.`;
      await client.query(
        `INSERT INTO risk_zones (
           name, description, source, category, risk_score, zone, active_from, created_by
         ) VALUES ($1, $2, 'sesnsp', 'cargo_theft', $3,
                   ST_SetSRID(ST_GeomFromText($4), 4326),
                   NOW(), NULL)`,
        [s.name, description, s.risk_score, `POLYGON((${wktPoints}))`],
      );
      inserted++;
    }

    await client.query('COMMIT');
    logger.info(`[seed] inserted ${inserted} SESNSP risk_zones (one per Mexican state)`);
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

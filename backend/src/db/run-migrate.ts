import { readFileSync, readdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { pool } from './pool.js';
import { logger } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface MigrationResult {
  applied: string[];
  failed: { file: string; error: string }[];
}

/**
 * Runs every .sql file in the migrations/ directory in alphabetical order.
 *
 * Key property: a failure in ONE migration MUST NOT abort the rest.
 * Migrations are by design idempotent (CREATE TABLE IF NOT EXISTS, DO blocks,
 * etc.) and a single bad row or a constraint violation in an older file
 * should not prevent newer files from running. Earlier versions of this
 * runner re-threw on any non-"already exists" error, which meant a single
 * DELETE blocked by an FK (e.g. 004_citizen_role) cancelled every
 * subsequent migration including the tables that the live app depends on.
 */
async function runIncrementalMigrations(): Promise<MigrationResult> {
  const migrationsDir = join(__dirname, 'migrations');
  if (!existsSync(migrationsDir)) return { applied: [], failed: [] };
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  const applied: string[] = [];
  const failed: { file: string; error: string }[] = [];
  for (const file of files) {
    try {
      const sql = readFileSync(join(migrationsDir, file), 'utf-8');
      await pool.query(sql);
      applied.push(file);
    } catch (err: unknown) {
      const e = err as { message?: string };
      const msg = e?.message || String(err);
      // IF NOT EXISTS / already exists errors are OK (treated as applied)
      if (msg.includes('already exists') || msg.includes('duplicate')) {
        applied.push(`${file} (ya aplicada)`);
      } else {
        // Record the failure and keep going. Downstream migrations that
        // don't depend on this one will still apply.
        logger.warn(`[migrate] ${file} failed (continuing): ${msg}`);
        failed.push({ file, error: msg });
      }
    }
  }
  return { applied, failed };
}

export async function runMigrate(): Promise<{ ok: boolean; message: string }> {
  try {
    const schemaPostgis = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
    let schemaMsg: string;
    try {
      await pool.query(schemaPostgis);
      schemaMsg = 'Migraciones PostGIS ejecutadas correctamente.';
    } catch (pgErr: unknown) {
      const err = pgErr as { code?: string; message?: string };
      if (err?.code === '0A000' || err?.message?.includes('postgis')) {
        const schemaSimple = readFileSync(join(__dirname, 'schema-simple.sql'), 'utf-8');
        await pool.query(schemaSimple);
        schemaMsg = 'Migraciones schema-simple ejecutadas.';
      } else {
        throw pgErr;
      }
    }
    const { applied, failed } = await runIncrementalMigrations();
    const incrMsg = applied.length > 0 ? ` Incrementales aplicadas: ${applied.length}` : '';
    const failMsg = failed.length > 0
      ? ` | FALLIDAS (${failed.length}): ${failed.map(f => `${f.file}: ${f.error.slice(0, 80)}`).join(' | ')}`
      : '';
    return { ok: failed.length === 0, message: schemaMsg + incrMsg + failMsg };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: msg };
  }
}

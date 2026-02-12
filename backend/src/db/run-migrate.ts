import { readFileSync, readdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { pool } from './pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function runIncrementalMigrations(): Promise<string[]> {
  const migrationsDir = join(__dirname, 'migrations');
  if (!existsSync(migrationsDir)) return [];
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  const applied: string[] = [];
  for (const file of files) {
    try {
      const sql = readFileSync(join(migrationsDir, file), 'utf-8');
      await pool.query(sql);
      applied.push(file);
    } catch (err: unknown) {
      const e = err as { message?: string };
      // IF NOT EXISTS / already exists errors are OK
      if (e?.message?.includes('already exists') || e?.message?.includes('duplicate')) {
        applied.push(`${file} (ya aplicada)`);
      } else {
        throw new Error(`Error en migración ${file}: ${e?.message}`);
      }
    }
  }
  return applied;
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
    const applied = await runIncrementalMigrations();
    const incrMsg = applied.length > 0 ? ` Incrementales: ${applied.join(', ')}` : '';
    return { ok: true, message: schemaMsg + incrMsg };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: msg };
  }
}

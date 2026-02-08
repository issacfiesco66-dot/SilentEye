import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { pool } from './pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function runMigrate(): Promise<{ ok: boolean; message: string }> {
  try {
    const schemaPostgis = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
    try {
      await pool.query(schemaPostgis);
      return { ok: true, message: 'Migraciones PostGIS ejecutadas correctamente.' };
    } catch (pgErr: unknown) {
      const err = pgErr as { code?: string; message?: string };
      if (err?.code === '0A000' || err?.message?.includes('postgis')) {
        const schemaSimple = readFileSync(join(__dirname, 'schema-simple.sql'), 'utf-8');
        await pool.query(schemaSimple);
        return { ok: true, message: 'Migraciones schema-simple ejecutadas.' };
      }
      throw pgErr;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: msg };
  }
}

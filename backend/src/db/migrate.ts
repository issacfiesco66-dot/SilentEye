import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { pool } from './pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Migración: intenta PostGIS primero, fallback a schema-simple.
 */
async function migrate() {
  try {
    // Intentar PostGIS
    const schemaPostgis = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
    try {
      await pool.query(schemaPostgis);
      console.log('Migraciones PostGIS ejecutadas correctamente.');
    } catch (pgErr: any) {
      if (pgErr?.code === '0A000' || pgErr?.message?.includes('postgis')) {
        console.log('PostGIS no disponible, usando schema-simple...');
        const schemaSimple = readFileSync(join(__dirname, 'schema-simple.sql'), 'utf-8');
        await pool.query(schemaSimple);
        console.log('Migraciones schema-simple ejecutadas.');
      } else {
        throw pgErr;
      }
    }
  } catch (err) {
    console.error('Error en migración:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();

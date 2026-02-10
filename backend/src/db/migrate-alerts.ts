/**
 * Ejecuta solo la migración 001_add_alerts.sql (crear tabla alerts).
 * Útil cuando la DB ya existía antes de que se añadiera la tabla alerts.
 */
import '../env.js';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { pool } from './pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrateAlerts() {
  try {
    const sql = readFileSync(join(__dirname, 'migrations', '001_add_alerts.sql'), 'utf-8');
    await pool.query(sql);
    console.log('Tabla alerts creada correctamente.');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrateAlerts();

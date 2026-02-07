/**
 * Resetea el schema para migrar a PostGIS.
 * Ejecutar antes de npm run migrate si tenías schema-simple.
 */
import { pool } from './pool.js';

async function reset() {
  try {
    await pool.query('DROP SCHEMA public CASCADE');
    await pool.query('CREATE SCHEMA public');
    await pool.query('GRANT ALL ON SCHEMA public TO postgres');
    console.log('Schema reseteado. Ejecuta: npm run migrate');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

reset();

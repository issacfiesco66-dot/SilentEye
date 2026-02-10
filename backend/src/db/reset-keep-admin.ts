/**
 * Limpia la base de datos excepto los usuarios admin.
 * Elimina: incident_followers, incidents, gps_logs, alerts, helper_locations, vehicles, otp_codes, usuarios no-admin.
 */
import '../env.js';
import { pool } from './pool.js';

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query('DELETE FROM incident_followers');
    await client.query('DELETE FROM incidents');
    await client.query('DELETE FROM gps_logs');
    await client.query('DELETE FROM alerts');
    await client.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'helper_locations') THEN
          DELETE FROM helper_locations;
        END IF;
      END $$
    `);
    await client.query('UPDATE vehicles SET driver_id = NULL');
    await client.query('DELETE FROM vehicles');
    await client.query('DELETE FROM otp_codes');
    await client.query("DELETE FROM users WHERE role != 'admin'");

    await client.query('COMMIT');

    const count = await client.query("SELECT COUNT(*) as n FROM users WHERE role = 'admin'");
    console.log('Base de datos limpiada. Admins conservados:', count.rows[0]?.n ?? 0);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

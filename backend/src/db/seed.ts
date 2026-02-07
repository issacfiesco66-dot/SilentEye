import { pool } from './pool.js';

async function seed() {
  await pool.query(`
    INSERT INTO users (phone, name, role) VALUES
    ('+51999999999', 'Admin', 'admin'),
    ('+51999999998', 'Helper 1', 'helper'),
    ('+51999999997', 'Conductor 1', 'driver')
    ON CONFLICT (phone) DO NOTHING
  `);

  const vehicles = await pool.query(
    `INSERT INTO vehicles (plate, name, imei) VALUES
     ('ABC-123', 'Vehículo de prueba', '356307042441013')
     ON CONFLICT (imei) DO NOTHING RETURNING id`
  );

  if (vehicles.rows[0]) {
    const driver = await pool.query("SELECT id FROM users WHERE phone = '+51999999997'");
    if (driver.rows[0]) {
      await pool.query(
        'UPDATE vehicles SET driver_id = $1 WHERE imei = $2',
        [driver.rows[0].id, '356307042441013']
      );
    }
  }

  console.log('Seed completado. Admin: +51999999999, Helper: +51999999998, Driver: +51999999997');
  await pool.end();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});

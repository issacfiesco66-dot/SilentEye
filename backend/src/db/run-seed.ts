import { pool } from './pool.js';

export async function runSeed(): Promise<{ ok: boolean; message: string }> {
  try {
    await pool.query(`
      INSERT INTO users (phone, name, role) VALUES
      ('+51999999999', 'Admin', 'admin'),
      ('+51999999998', 'Helper 1', 'helper'),
      ('+51999999997', 'Conductor 1', 'driver')
      ON CONFLICT (phone) DO NOTHING
    `);

    await pool.query(
      `INSERT INTO vehicles (plate, name, imei) VALUES
       ('ABC-123', 'Vehículo de prueba', '356307042441013'),
       ('GPS-PUEBLA', 'GPS FMB920 Puebla', '353691846029642')
       ON CONFLICT (imei) DO NOTHING`
    );

    const vehicles = await pool.query("SELECT id FROM vehicles WHERE imei = '356307042441013'");
    if (vehicles.rows[0]) {
      const driver = await pool.query("SELECT id FROM users WHERE phone = '+51999999997'");
      if (driver.rows[0]) {
        await pool.query(
          'UPDATE vehicles SET driver_id = $1 WHERE imei = $2',
          [driver.rows[0].id, '356307042441013']
        );
      }
    }

    return {
      ok: true,
      message: 'Seed completado. Admin: +51999999999 (código 123456), Helper: +51999999998, Driver: +51999999997',
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: msg };
  }
}

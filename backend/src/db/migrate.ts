import { runMigrate } from './run-migrate.js';
import { pool } from './pool.js';

async function migrate() {
  const result = await runMigrate();
  console.log(result.message);
  await pool.end();
  if (!result.ok) process.exit(1);
}

migrate();

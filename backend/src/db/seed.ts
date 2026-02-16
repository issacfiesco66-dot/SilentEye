import { runSeed } from './run-seed.js';
import { pool } from './pool.js';

async function seed() {
  const result = await runSeed();
  console.log(result.message);
  await pool.end();
  if (!result.ok) process.exit(1);
}

seed();

import pg from 'pg';
import 'dotenv/config';

const connStr = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';
const url = new URL(connStr);
const dbName = url.pathname.slice(1) || 'silenteye';
url.pathname = '/postgres';

async function createDb() {
  const client = new pg.Client({ connectionString: url.toString() });
  await client.connect();
  const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (res.rows.length === 0) {
    await client.query(`CREATE DATABASE ${dbName}`);
    console.log(`Base de datos "${dbName}" creada.`);
  } else {
    console.log(`Base de datos "${dbName}" ya existe.`);
  }
  await client.end();
}

createDb().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

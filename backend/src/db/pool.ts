import pg from 'pg';

const { Pool } = pg;

// Seguridad: en producción no usar credenciales por defecto
const isProd = process.env.NODE_ENV === 'production';
const connString = process.env.DATABASE_URL;
if (isProd && !connString) {
  throw new Error('DATABASE_URL es obligatorio en producción. Configure en Secrets/Variables.');
}

export const pool = new Pool({
  connectionString: connString || 'postgresql://postgres:postgres@localhost:5432/silenteye',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ...(isProd && connString && !connString.includes('sslmode=disable')
    ? { ssl: { rejectUnauthorized: false } }
    : {}),
});

// Set statement_timeout per-session (not all providers support it as a startup param)
pool.on('connect', (client: { query: (sql: string) => Promise<unknown> }) => {
  client.query('SET statement_timeout = 30000').catch(() => {});
});

pool.on('error', (err: Error) => {
  console.error('Error inesperado en pool PostgreSQL:', err);
});

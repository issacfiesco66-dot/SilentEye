import { pool } from './pool.js';

let cached: boolean | null = null;

export async function hasPostGis(): Promise<boolean> {
  if (cached !== null) return cached;
  try {
    const r = await pool.query(
      "SELECT 1 FROM information_schema.tables WHERE table_name = 'helper_locations' LIMIT 1"
    );
    cached = (r.rowCount ?? 0) > 0;
  } catch {
    cached = false;
  }
  return cached;
}

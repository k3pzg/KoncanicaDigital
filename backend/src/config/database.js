import { Pool } from 'pg';
import { getEnv } from './env.js';

let pool;

export function getDatabasePool() {
  if (!pool) {
    const env = getEnv();
    pool = new Pool({ connectionString: env.databaseUrl });
  }

  return pool;
}

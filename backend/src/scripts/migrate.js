import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { getDatabasePool } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const sqlPath = path.resolve(__dirname, '../../sql/001_init.sql');
  const sql = await readFile(sqlPath, 'utf-8');

  const db = getDatabasePool();
  const connection = await db.getConnection();

  try {
    await connection.query(sql);
    console.log('Migration 001_init.sql applied successfully.');
  } finally {
    connection.release();
  }
}

runMigration().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});

import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { getDatabasePool } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseSqlStatements(sql) {
  return sql
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function runMigration() {
  const sqlDir = path.resolve(__dirname, '../../sql');
  const files = (await readdir(sqlDir)).filter((file) => file.endsWith('.sql')).sort();

  const db = getDatabasePool();
  const connection = await db.getConnection();

  try {
    for (const file of files) {
      const sqlPath = path.join(sqlDir, file);
      const sql = await readFile(sqlPath, 'utf-8');
      const statements = parseSqlStatements(sql);

      for (const statement of statements) {
        await connection.query(statement);
      }
    }

    console.log('All migrations applied successfully.');
  } finally {
    connection.release();
  }
}

runMigration().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});

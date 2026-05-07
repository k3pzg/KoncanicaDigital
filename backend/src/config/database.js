import mysql from 'mysql2/promise';
import { getEnv } from './env.js';

let pool;

export function getDatabasePool() {
  if (!pool) {
    const env = getEnv();

    pool = mysql.createPool({
      host: env.mysqlHost,
      port: env.mysqlPort,
      user: env.mysqlUser,
      password: env.mysqlPassword,
      database: env.mysqlDatabase,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  return pool;
}

export async function testDatabaseConnection() {
  const pool = getDatabasePool();
  const connection = await pool.getConnection();
  connection.release();
}

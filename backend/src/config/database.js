import 'dotenv/config';
import mysql from 'mysql2/promise';

let pool;

export function getDatabasePool() {
  if (!pool) {
    // dotenv/config expects .env in the project root (process.cwd()).
    console.log('DB CONFIG:', {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'koncanica_digital'
    });
  }

  return pool;
}

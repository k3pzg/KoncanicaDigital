import dotenv from 'dotenv';

dotenv.config();

export function getEnv() {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const isProd = nodeEnv === 'production';

  // Support DB_* (primary/documented) and MYSQL_* (legacy) variable names
  const dbHost = process.env.DB_HOST ?? process.env.MYSQL_HOST;
  const dbPort = process.env.DB_PORT ?? process.env.MYSQL_PORT;
  const dbUser = process.env.DB_USER ?? process.env.MYSQL_USER;
  const dbPassword = process.env.DB_PASSWORD ?? process.env.MYSQL_PASSWORD;
  const dbName = process.env.DB_NAME ?? process.env.MYSQL_DATABASE;

  if (isProd) {
    const missing = [
      ['DB_HOST', dbHost],
      ['DB_PORT', dbPort],
      ['DB_USER', dbUser],
      ['DB_PASSWORD', dbPassword],
      ['DB_NAME', dbName],
    ]
      .filter(([, val]) => !val)
      .map(([name]) => name);

    if (missing.length > 0) {
      console.error(`FATAL: Missing required environment variables: ${missing.join(', ')}`);
      process.exit(1);
    }
  }

  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    nodeEnv,
    port: Number(process.env.PORT ?? 3001),
    mysqlHost: dbHost ?? 'localhost',
    mysqlPort: Number(dbPort ?? 3306),
    mysqlUser: dbUser ?? 'root',
    mysqlPassword: dbPassword ?? 'root',
    mysqlDatabase: dbName ?? 'koncanica_digital',
    corsOrigins,
    sessionTtlHours: Number(process.env.SESSION_TTL_HOURS ?? 24),
  };
}

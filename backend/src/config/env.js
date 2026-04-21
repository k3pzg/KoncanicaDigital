import dotenv from 'dotenv';

dotenv.config();

export function getEnv() {
  return {
    port: Number(process.env.PORT ?? 3001),
    mysqlHost: process.env.MYSQL_HOST ?? 'localhost',
    mysqlPort: Number(process.env.MYSQL_PORT ?? 3306),
    mysqlUser: process.env.MYSQL_USER ?? 'root',
    mysqlPassword: process.env.MYSQL_PASSWORD ?? '',
    mysqlDatabase: process.env.MYSQL_DATABASE ?? 'koncanica_digital',
    sessionTtlHours: Number(process.env.SESSION_TTL_HOURS ?? 24)
  };
}

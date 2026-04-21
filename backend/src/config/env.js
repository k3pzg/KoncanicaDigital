import dotenv from 'dotenv';

dotenv.config();

export function getEnv() {
  return {
    port: Number(process.env.PORT ?? 3001),
    databaseUrl:
      process.env.DATABASE_URL ??
      'postgresql://user:password@localhost:5432/koncanica_digital'
  };
}

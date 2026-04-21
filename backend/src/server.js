import { createApp } from './app/createApp.js';
import { getDatabasePool } from './config/database.js';
import { getEnv } from './config/env.js';

async function bootstrap() {
  const env = getEnv();
  const app = createApp();

  const db = getDatabasePool();
  const connection = await db.getConnection();
  await connection.ping();
  connection.release();

  app.listen(env.port, () => {
    console.log(`Backend shell listening on http://localhost:${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start backend:', error);
  process.exit(1);
});

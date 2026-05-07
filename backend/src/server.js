import { createApp } from './app/createApp.js';
import { getEnv } from './config/env.js';
import { testDatabaseConnection } from './config/database.js';

async function bootstrap() {
  const env = getEnv();

  console.log(`Starting backend (${env.nodeEnv}) — DB: ${env.mysqlHost}:${env.mysqlPort}/${env.mysqlDatabase}`);

  await testDatabaseConnection();
  console.log('Database connection OK.');

  const app = createApp();

  app.listen(env.port, '0.0.0.0', () => {
    console.log(`Backend listening on 0.0.0.0:${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start backend:', error.message);
  process.exit(1);
});

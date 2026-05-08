import { createApp } from './app/createApp.js';
import { getEnv } from './config/env.js';
import { testDatabaseConnection } from './config/database.js';

async function bootstrap() {
  const env = getEnv();

  console.log(`Starting backend (${env.nodeEnv}) — DB: ${env.mysqlHost}:${env.mysqlPort}/${env.mysqlDatabase}`);

  const app = createApp();

  app.listen(env.port, '0.0.0.0', () => {
    console.log(`Backend listening on 0.0.0.0:${env.port}`);

    testDatabaseConnection()
      .then(() => console.log('Database connection OK.'))
      .catch((err) => console.error('Database connection failed:', err.message));
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start backend:', error.message);
  process.exit(1);
});

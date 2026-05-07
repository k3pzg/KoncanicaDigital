import { createApp } from './app/createApp.js';
import { getEnv } from './config/env.js';

async function bootstrap() {
  const env = getEnv();
  const app = createApp();

  app.listen(env.port, () => {
    console.log(`Backend shell listening on http://localhost:${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start backend:', error);
  process.exit(1);
});

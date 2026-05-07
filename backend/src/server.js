import { createApp } from './app/createApp.js';
import { getEnv } from './config/env.js';

async function bootstrap() {
  const env = getEnv();
  const app = createApp();

  app.listen(env.port, '0.0.0.0', () => {
    console.log(`Backend listening on 0.0.0.0:${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start backend:', error);
  process.exit(1);
});

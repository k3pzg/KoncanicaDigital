import { createApp } from './app/createApp.js';
import { getEnv } from './config/env.js';

const env = getEnv();
const app = createApp();

app.listen(env.port, () => {
  console.log(`Backend shell listening on http://localhost:${env.port}`);
});

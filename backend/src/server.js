process.stdout.write('[server] server.js loaded\n');

import { createApp } from './app/createApp.js';
import { testDatabaseConnection } from './config/database.js';

const PORT = Number(process.env.PORT) || 3001;

process.stdout.write(`[server] Starting — NODE_ENV=${process.env.NODE_ENV} PORT=${PORT}\n`);

const app = createApp();

process.stdout.write(`[server] App created, binding 0.0.0.0:${PORT}\n`);

app.listen(PORT, '0.0.0.0', () => {
  process.stdout.write(`[server] Listening on 0.0.0.0:${PORT} — ready\n`);

  testDatabaseConnection()
    .then(() => process.stdout.write('[server] DB connection OK\n'))
    .catch((err) => process.stderr.write(`[server] DB connection failed (non-fatal): ${err.message}\n`));
});

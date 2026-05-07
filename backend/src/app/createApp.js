import express from 'express';
import cors from 'cors';
import { getEnv } from '../config/env.js';
import { healthRouter } from '../modules/health/health.router.js';
import { authRouter } from '../modules/auth/routes/auth.router.js';
import { waterObjectsRouter } from '../modules/water-objects/routes/water-objects.router.js';
import { fishRouter } from '../modules/fish/routes/fish.router.js';

export function createApp() {
  const app = express();
  const { corsOrigins, nodeEnv } = getEnv();

  const staticOrigins = [
    'http://localhost:5173',
    'http://localhost:4173',
    'http://localhost:3000',
  ];

  const allowedOrigins = new Set([...staticOrigins, ...corsOrigins]);

  app.use(
    cors({
      origin(origin, callback) {
        // Allow requests with no origin (curl, Postman, Railway health checks, same-origin)
        if (!origin) return callback(null, true);
        if (allowedOrigins.has(origin)) return callback(null, true);
        // In development allow all origins for convenience
        if (nodeEnv !== 'production') return callback(null, true);
        callback(new Error(`CORS: origin not allowed: ${origin}`));
      },
      credentials: true,
    })
  );

  app.use(express.json());

  app.use('/health', healthRouter);
  app.use('/auth', authRouter);
  app.use('/water-objects', waterObjectsRouter);
  app.use('/', fishRouter);

  return app;
}

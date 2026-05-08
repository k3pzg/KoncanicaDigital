import express from 'express';
import cors from 'cors';
import { healthRouter } from '../modules/health/health.router.js';
import { authRouter } from '../modules/auth/routes/auth.router.js';
import { waterObjectsRouter } from '../modules/water-objects/routes/water-objects.router.js';
import { fishRouter } from '../modules/fish/routes/fish.router.js';

export function createApp() {
  const app = express();
  const nodeEnv = process.env.NODE_ENV ?? 'development';

  // Read from all supported env var names so any of them work on Railway
  const envOrigins = ['CORS_ORIGINS', 'CORS_ORIGIN', 'ALLOWED_ORIGINS', 'FRONTEND_URL']
    .flatMap((name) => (process.env[name] ?? '').split(','))
    .map((s) => s.trim())
    .filter(Boolean);

  const staticOrigins = [
    'http://localhost:5173',
    'http://localhost:4173',
    'http://localhost:3000',
  ];

  const allowedOrigins = new Set([...staticOrigins, ...envOrigins]);

  process.stdout.write(`[CORS] NODE_ENV=${nodeEnv}\n`);
  process.stdout.write(`[CORS] Allowed origins: ${[...allowedOrigins].join(', ')}\n`);

  const corsOptions = {
    origin(origin, callback) {
      // Allow requests with no origin (curl, Postman, Railway health checks, same-origin)
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      // In development allow all origins for convenience
      if (nodeEnv !== 'production') return callback(null, true);
      // Use callback(null, false) — NOT callback(new Error(...)) — so Express never
      // routes this through the error handler and OPTIONS never returns 500.
      process.stdout.write(`[CORS] Blocked origin: ${origin}\n`);
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };

  // Register CORS before all routes so preflight OPTIONS is handled first.
  // app.options('*') ensures every preflight gets a 204 and never falls through
  // to a route handler or error middleware.
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));

  app.use(express.json());

  app.use('/health', healthRouter);
  app.use('/auth', authRouter);
  app.use('/water-objects', waterObjectsRouter);
  app.use('/', fishRouter);

  return app;
}

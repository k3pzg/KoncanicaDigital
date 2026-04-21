import express from 'express';
import cors from 'cors';
import { healthRouter } from '../modules/health/health.router.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use('/health', healthRouter);

  return app;
}

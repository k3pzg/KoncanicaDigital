import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/', (_, response) => {
  response.status(200).json({
    status: 'ok',
    service: 'koncanica-digital-backend',
    timestamp: new Date().toISOString()
  });
});

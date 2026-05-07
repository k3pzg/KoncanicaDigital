import { Router } from 'express';
import { login, logout } from '../services/auth.service.js';
import { readBearerToken, requireAuth } from '../middleware/require-auth.middleware.js';

export const authRouter = Router();

authRouter.post('/login', async (request, response) => {
  const { username, password } = request.body ?? {};

  if (!username || !password) {
    return response.status(400).json({ message: 'username and password are required' });
  }

  try {
    const result = await login({ username, password });
    if (!result) {
      return response.status(401).json({ message: 'Invalid credentials' });
    }

    return response.status(200).json(result);
  } catch {
    return response.status(503).json({ message: 'Database unavailable' });
  }
});

authRouter.get('/me', requireAuth, async (request, response) => {
  return response.status(200).json({ user: request.auth.user });
});

authRouter.post('/logout', async (request, response) => {
  const token = readBearerToken(request);

  if (!token) {
    return response.status(204).send();
  }

  await logout(token);
  return response.status(204).send();
});

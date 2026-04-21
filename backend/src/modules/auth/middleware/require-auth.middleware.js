import { getUserFromToken } from '../services/auth.service.js';

function getBearerToken(authorizationHeader) {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

export async function requireAuth(request, response, next) {
  const token = getBearerToken(request.header('authorization'));

  if (!token) {
    return response.status(401).json({ message: 'Unauthorized' });
  }

  const user = await getUserFromToken(token);
  if (!user) {
    return response.status(401).json({ message: 'Unauthorized' });
  }

  request.auth = { token, user };
  return next();
}

export function readBearerToken(request) {
  return getBearerToken(request.header('authorization'));
}

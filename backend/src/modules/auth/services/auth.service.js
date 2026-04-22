import crypto from 'crypto';
import { getEnv } from '../../../config/env.js';
import {
  createUserSession,
  findUserByUsername,
  findValidSessionWithUser,
  revokeSession
} from '../repositories/auth.repository.js';
import { verifyPassword } from '../utils/password.js';

export async function login({ username, password }) {
  const user = await findUserByUsername(username);

  if (!user || !user.is_active) {
    return null;
  }

  const isValid = verifyPassword(password, user.password_hash);
  if (!isValid) {
    return null;
  }

  const token = crypto.randomBytes(32).toString('hex');
  const env = getEnv();
  const expiresAt = new Date(Date.now() + env.sessionTtlHours * 60 * 60 * 1000);

  await createUserSession({ userId: user.id, token, expiresAt });

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role
    }
  };
}

export async function getUserFromToken(token) {
  const session = await findValidSessionWithUser(token);

  if (!session || !session.is_active) {
    return null;
  }

  return {
    id: session.id,
    username: session.username,
    role: session.role
  };
}

export async function logout(token) {
  await revokeSession(token);
}

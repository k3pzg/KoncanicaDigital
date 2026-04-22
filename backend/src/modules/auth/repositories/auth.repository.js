import { getDatabasePool } from '../../../config/database.js';

export async function findUserByUsername(username) {
  const db = getDatabasePool();
  const [rows] = await db.query(
    `SELECT id, username, password_hash, role, is_active
     FROM users
     WHERE username = ?
     LIMIT 1`,
    [username]
  );

  return rows[0] ?? null;
}

export async function createUserSession({ userId, token, expiresAt }) {
  const db = getDatabasePool();
  await db.query(
    `INSERT INTO user_sessions (user_id, token, expires_at)
     VALUES (?, ?, ?)`,
    [userId, token, expiresAt]
  );
}

export async function findValidSessionWithUser(token) {
  const db = getDatabasePool();
  const [rows] = await db.query(
    `SELECT
       s.id AS session_id,
       s.token,
       s.expires_at,
       s.revoked_at,
       u.id,
       u.username,
       u.role,
       u.is_active
     FROM user_sessions s
     INNER JOIN users u ON u.id = s.user_id
     WHERE s.token = ?
       AND s.revoked_at IS NULL
       AND s.expires_at > NOW()
     LIMIT 1`,
    [token]
  );

  return rows[0] ?? null;
}

export async function revokeSession(token) {
  const db = getDatabasePool();
  await db.query(
    `UPDATE user_sessions
     SET revoked_at = NOW()
     WHERE token = ?
       AND revoked_at IS NULL`,
    [token]
  );
}

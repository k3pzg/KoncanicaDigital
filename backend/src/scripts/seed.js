import { getDatabasePool } from '../config/database.js';
import { hashPassword } from '../modules/auth/utils/password.js';

const usersToSeed = [
  { username: 'admin', password: 'admin123', role: 'admin' },
  { username: 'tehnolog', password: 'tehnolog123', role: 'tehnolog' },
  { username: 'cuvar', password: 'cuvar123', role: 'cuvar' }
];

async function runSeed() {
  const db = getDatabasePool();

  for (const user of usersToSeed) {
    const passwordHash = hashPassword(user.password);

    await db.query(
      `INSERT INTO users (username, password_hash, role)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         password_hash = VALUES(password_hash),
         role = VALUES(role),
         is_active = 1`,
      [user.username, passwordHash, user.role]
    );
  }

  console.log('Seed completed for admin, tehnolog, cuvar users.');
}

runSeed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});

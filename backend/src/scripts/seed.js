import { getDatabasePool } from '../config/database.js';
import { hashPassword } from '../modules/auth/utils/password.js';

const usersToSeed = [
  { username: 'admin', password: 'admin123', role: 'admin' },
  { username: 'tehnolog', password: 'tehnolog123', role: 'tehnolog' },
  { username: 'cuvar', password: 'cuvar123', role: 'cuvar' }
];

const fishCategoriesToSeed = [
  { code: 'mjesecnjak', label: 'Mjesecnjak', sort_order: 10 },
  { code: 'jednogodisnja_mladj', label: 'Jednogodisnja mladj', sort_order: 20 },
  { code: 'dvogodisnja_mladj', label: 'Dvogodisnja mladj', sort_order: 30 },
  { code: 'konzum', label: 'Konzum', sort_order: 40 },
  { code: 'matica', label: 'Matica', sort_order: 50 }
];

const fishSpeciesToSeed = [
  { code: 'saran', label: 'Šaran' },
  { code: 'amur', label: 'Amur' },
  { code: 'stuka', label: 'Štuka' }
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

  for (const species of fishSpeciesToSeed) {
    await db.query(
      `INSERT INTO fish_species (code, label, is_active)
       VALUES (?, ?, 1)
       ON DUPLICATE KEY UPDATE
         label = VALUES(label),
         is_active = VALUES(is_active)`,
      [species.code, species.label]
    );
  }

  for (const category of fishCategoriesToSeed) {
    await db.query(
      `INSERT INTO fish_categories (code, label, sort_order, is_active)
       VALUES (?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE
         label = VALUES(label),
         sort_order = VALUES(sort_order),
         is_active = VALUES(is_active)`,
      [category.code, category.label, category.sort_order]
    );
  }

  console.log('Seed completed for users, fish species and fish categories.');
}

runSeed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});

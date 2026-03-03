/**
 * Seed script — crée un utilisateur de test SaaS
 *
 * Usage :
 *   node scripts/seed-saas.js
 *
 * Variables d'environnement lues depuis ../.env
 */

import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

// ─── Config ───────────────────────────────────────────────────────────────────
const TEST_USER = {
  email: 'test@broreps.com',
  password: 'Test1234!',
  name: 'Utilisateur Test',
  subscription_status: 'active',
  subscription_product: 'Premium Mensuel',
  modules_unlocked: 3,          // 3 modules débloqués sur 6
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const db = await mysql.createConnection({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

console.log(`✅ Connecté à ${process.env.DB_HOST}/${process.env.DB_NAME}\n`);

// ── 1. Upsert utilisateur ─────────────────────────────────────────────────────
const hash = await bcrypt.hash(TEST_USER.password, 10);

await db.execute(`
  INSERT INTO saas_users
    (email, name, password, subscription_status, subscription_product,
     modules_unlocked, is_active, subscribed_at, next_billing_at)
  VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))
  ON DUPLICATE KEY UPDATE
    name               = VALUES(name),
    password           = VALUES(password),
    subscription_status = VALUES(subscription_status),
    subscription_product = VALUES(subscription_product),
    modules_unlocked   = VALUES(modules_unlocked),
    is_active          = 1,
    next_billing_at    = DATE_ADD(NOW(), INTERVAL 30 DAY)
`, [
  TEST_USER.email,
  TEST_USER.name,
  hash,
  TEST_USER.subscription_status,
  TEST_USER.subscription_product,
  TEST_USER.modules_unlocked,
]);

const [[user]] = await db.execute(
  'SELECT id FROM saas_users WHERE email = ?', [TEST_USER.email]
);
const userId = user.id;
console.log(`👤 Utilisateur  : ${TEST_USER.name} <${TEST_USER.email}>`);
console.log(`🔑 Mot de passe : ${TEST_USER.password}`);
console.log(`🆔 user_id      : ${userId}`);

// ── 2. Progression modules ────────────────────────────────────────────────────
// Module 1 : terminé (100 %)
// Module 2 : en cours (50 %)
// Module 3 : débloqué mais pas commencé
const progressData = [
  { module_id: 1, watched_seconds: 600, total_seconds: 600, completed: 1 },
  { module_id: 2, watched_seconds: 300, total_seconds: 600, completed: 0 },
  { module_id: 3, watched_seconds: 0,   total_seconds: 600, completed: 0 },
];

for (const p of progressData) {
  await db.execute(`
    INSERT INTO saas_module_progress (user_id, module_id, watched_seconds, total_seconds, completed)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      watched_seconds = VALUES(watched_seconds),
      total_seconds   = VALUES(total_seconds),
      completed       = VALUES(completed)
  `, [userId, p.module_id, p.watched_seconds, p.total_seconds, p.completed]);
}
console.log(`\n🎬 Progression modules :`);
console.log(`   Module 1 → ✅ Terminé`);
console.log(`   Module 2 → ▶️  En cours (50 %)`);
console.log(`   Module 3 → 🔓 Débloqué, non commencé`);
console.log(`   Modules 4-6 → 🔒 Verrouillés`);

// ── 3. Notes / scores ─────────────────────────────────────────────────────────
const scores = {
  communication: 7,
  creation:      8,
  discipline:    6,
  productivite:  7,
  strategie:     5,
  energie:       8,
  impact:        6,
};

for (const [category_id, score] of Object.entries(scores)) {
  await db.execute(`
    INSERT INTO saas_notes_scores (user_id, category_id, score)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE score = VALUES(score)
  `, [userId, category_id, score]);
}

await db.execute(
  `UPDATE saas_users SET notes_reflection = ? WHERE id = ?`,
  ['Objectif : 10k abonnés TikTok d\'ici juin. Poster une vidéo par jour.', userId]
);
console.log(`\n📊 Notes pré-remplies (scores 5-8)`);

// ── 4. Post Hub ────────────────────────────────────────────────────────────────
await db.execute(`
  INSERT INTO saas_hub_posts (user_id, content, post_type, likes_count)
  VALUES (?, ?, 'recent', 0)
  ON DUPLICATE KEY UPDATE content = content
`, [userId, 'Salut tout le monde ! Je suis sur TikTok depuis 3 mois avec BroReps et j\'ai déjà atteint 2k abonnés. Qui veut collaborer ? 🚀']);

console.log(`\n💬 Post Hub créé`);

// ── 5. Message Forum ──────────────────────────────────────────────────────────
await db.execute(`
  INSERT INTO saas_forum_messages (category_id, user_id, content)
  VALUES (?, ?, ?)
`, ['debutants', userId, 'Conseil pour les débutants : postez tous les jours même si la qualité n\'est pas parfaite. La régularité bat la perfection ! 💪']);

console.log(`💬 Message Forum (débutants) créé`);

// ─── Done ─────────────────────────────────────────────────────────────────────
console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Seed terminé — compte de test prêt
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  URL    : http://localhost:5175/login
  Email  : ${TEST_USER.email}
  Mdp    : ${TEST_USER.password}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

await db.end();

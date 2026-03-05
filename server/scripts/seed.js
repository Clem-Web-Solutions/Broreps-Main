/**
 * 🌱 Seed complet de la base de données BroReps
 *
 * Peuple :
 *   - users (admin + employé)
 *   - providers (fournisseurs SMM)
 *   - allowed_services (catalogue : standard, dripfeed, pack)
 *   - service_pack_items (sous-services des packs)
 *   - alerts (notifications système)
 *   - orders (commandes de test)
 *   - saas_users (membres SaaS)
 *   - saas_module_progress, saas_notes_scores, saas_hub_posts, saas_forum_messages
 *
 * Usage :
 *   node scripts/seed.js
 *   node scripts/seed.js --fresh     ← vide les tables avant d'insérer
 */

import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const FRESH = process.argv.includes('--fresh');

// ─── Connexion ─────────────────────────────────────────────────────────────────
const db = await mysql.createConnection({
  host:               process.env.DB_HOST,
  port:               parseInt(process.env.DB_PORT) || 3306,
  user:               process.env.DB_USER,
  password:           process.env.DB_PASSWORD,
  database:           process.env.DB_NAME,
  multipleStatements: true,
});

console.log(`\n🌱 Seed BroReps — ${process.env.DB_NAME}@${process.env.DB_HOST}`);
console.log(FRESH ? '⚠️  Mode --fresh : tables vidées avant insertion\n' : '\n');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const upsert = (table, data, uniqueKey = null) => {
  const keys = Object.keys(data);
  const vals = Object.values(data);
  const placeholders = keys.map(() => '?').join(', ');
  const updates = keys
    .filter(k => k !== uniqueKey)
    .map(k => `\`${k}\` = VALUES(\`${k}\`)`)
    .join(', ');
  return db.execute(
    `INSERT INTO \`${table}\` (\`${keys.join('`, `')}\`) VALUES (${placeholders})
     ON DUPLICATE KEY UPDATE ${updates}`,
    vals
  );
};

const section = (title) => console.log(`\n${'─'.repeat(50)}\n📦 ${title}\n${'─'.repeat(50)}`);

// ─── --fresh : vider les tables (ordre inverse des FK) ────────────────────────
if (FRESH) {
  await db.query('SET FOREIGN_KEY_CHECKS = 0');
  const tables = [
    'saas_forum_messages', 'saas_hub_likes', 'saas_hub_posts',
    'saas_notes_scores', 'saas_module_progress', 'saas_users',
    'tagadapay_webhook_logs', 'tagadapay_orders',
    'shopify_webhook_logs', 'shopify_orders',
    'notifications', 'orders',
    'service_pack_items', 'allowed_services',
    'alerts', 'providers', 'users',
  ];
  for (const t of tables) {
    try {
      await db.query(`TRUNCATE TABLE \`${t}\``);
      console.log(`  🗑️  ${t}`);
    } catch {
      // table doesn't exist yet — skip
    }
  }
  await db.query('SET FOREIGN_KEY_CHECKS = 1');
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. USERS (panel supply)
// ══════════════════════════════════════════════════════════════════════════════
section('Users (panel Supply)');

const adminHash    = await bcrypt.hash('Admin1234!', 10);
const employeeHash = await bcrypt.hash('Employe1234!', 10);

await upsert('users', {
  name: 'Admin BroReps', email: 'admin@broreps.com',
  password: adminHash, role: 'admin', status: 'approved',
}, 'email');

await upsert('users', {
  name: 'Samy Dupont', email: 'samy@broreps.com',
  password: employeeHash, role: 'user', status: 'approved',
}, 'email');

const [[adminRow]] = await db.execute('SELECT id FROM users WHERE email = ?', ['admin@broreps.com']);
console.log(`👤 admin@broreps.com     → mot de passe : Admin1234!    (id: ${adminRow.id})`);
const [[empRow]] = await db.execute('SELECT id FROM users WHERE email = ?', ['samy@broreps.com']);
console.log(`👤 samy@broreps.com      → mot de passe : Employe1234!  (id: ${empRow.id})`);

// ══════════════════════════════════════════════════════════════════════════════
// 2. PROVIDERS
// ══════════════════════════════════════════════════════════════════════════════
section('Fournisseurs API');

const providers = [
  { name: 'BulkMedya',  api_url: 'https://bulkmedya.org/api/v2',        api_key: 'BULKMEDYA_KEY_HERE',  active: 1 },
  { name: 'SMMHeaven', api_url: 'https://smmheaven.com/api/v2',         api_key: 'SMMHEAVEN_KEY_HERE',  active: 1 },
  { name: 'PerfectSMM', api_url: 'https://perfectsmm.com/api/v2',       api_key: 'PERFECTSMM_KEY_HERE', active: 0 },
];

for (const p of providers) {
  await upsert('providers', p, 'name');
  console.log(`🔌 ${p.name.padEnd(14)} → ${p.api_url} ${p.active ? '✅' : '⏸️ inactif'}`);
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. ALLOWED SERVICES (catalogue)
// ══════════════════════════════════════════════════════════════════════════════
section('Catalogue de services');

const services = [
  // ── Instagram ──────────────────────────────────────────────────────────────
  { service_id: '101', service_name: 'Abonnés Instagram — Haute Qualité',    provider: 'BulkMedya',  delivery_mode: 'standard', dripfeed_quantity: null, is_pack: 0 },
  { service_id: '102', service_name: 'Likes Instagram',                      provider: 'BulkMedya',  delivery_mode: 'standard', dripfeed_quantity: null, is_pack: 0 },
  { service_id: '103', service_name: 'Abonnés Instagram — Drip 250/jour',    provider: 'BulkMedya',  delivery_mode: 'dripfeed', dripfeed_quantity: 250,  is_pack: 0 },
  { service_id: '104', service_name: 'Vues Instagram Reels',                 provider: 'BulkMedya',  delivery_mode: 'standard', dripfeed_quantity: null, is_pack: 0 },
  // ── TikTok ─────────────────────────────────────────────────────────────────
  { service_id: '201', service_name: 'Abonnés TikTok — Haute Qualité',       provider: 'BulkMedya',  delivery_mode: 'standard', dripfeed_quantity: null, is_pack: 0 },
  { service_id: '202', service_name: 'Likes TikTok',                         provider: 'BulkMedya',  delivery_mode: 'standard', dripfeed_quantity: null, is_pack: 0 },
  { service_id: '203', service_name: 'Abonnés TikTok — Drip 500/jour',       provider: 'BulkMedya',  delivery_mode: 'dripfeed', dripfeed_quantity: 500,  is_pack: 0 },
  { service_id: '204', service_name: 'Vues TikTok',                          provider: 'BulkMedya',  delivery_mode: 'standard', dripfeed_quantity: null, is_pack: 0 },
  // ── YouTube ────────────────────────────────────────────────────────────────
  { service_id: '301', service_name: 'Abonnés YouTube',                      provider: 'SMMHeaven', delivery_mode: 'standard', dripfeed_quantity: null, is_pack: 0 },
  { service_id: '302', service_name: 'Vues YouTube',                         provider: 'SMMHeaven', delivery_mode: 'standard', dripfeed_quantity: null, is_pack: 0 },
  // ── Packs ──────────────────────────────────────────────────────────────────
  { service_id: '501', service_name: 'Pack Starter Instagram',               provider: 'BulkMedya',  delivery_mode: 'standard', dripfeed_quantity: null, is_pack: 1 },
  { service_id: '502', service_name: 'Pack Croissance TikTok',               provider: 'BulkMedya',  delivery_mode: 'standard', dripfeed_quantity: null, is_pack: 1 },
  { service_id: '503', service_name: 'Pack Multi-Plateforme',                provider: 'BulkMedya',  delivery_mode: 'standard', dripfeed_quantity: null, is_pack: 1 },
];

for (const s of services) {
  await db.execute(
    `INSERT INTO allowed_services (service_id, service_name, provider, delivery_mode, dripfeed_quantity, is_pack)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       service_name = VALUES(service_name), provider = VALUES(provider),
       delivery_mode = VALUES(delivery_mode), dripfeed_quantity = VALUES(dripfeed_quantity),
       is_pack = VALUES(is_pack)`,
    [s.service_id, s.service_name, s.provider, s.delivery_mode, s.dripfeed_quantity, s.is_pack]
  );
  const badge = s.is_pack ? '📦 Pack    ' : s.delivery_mode === 'dripfeed' ? `💧 Drip ${s.dripfeed_quantity}/j` : '⚡ Standard ';
  console.log(`  ${badge.padEnd(16)} [${s.service_id}] ${s.service_name}`);
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. PACK ITEMS (sous-services)
// ══════════════════════════════════════════════════════════════════════════════
section('Sous-services des packs');

// Récupérer les ids par service_id
const getServiceDbId = async (serviceId) => {
  const [[row]] = await db.execute('SELECT id FROM allowed_services WHERE service_id = ?', [serviceId]);
  return row?.id ?? null;
};

const packDefs = [
  // Pack Starter Instagram (501) → Abonnés (101) + Likes (102)
  { packServiceId: '501', subServiceId: '101', qty: null },
  { packServiceId: '501', subServiceId: '102', qty: null },
  // Pack Croissance TikTok (502) → Abonnés (201) + Likes (202) + Vues (204)
  { packServiceId: '502', subServiceId: '201', qty: null },
  { packServiceId: '502', subServiceId: '202', qty: null },
  { packServiceId: '502', subServiceId: '204', qty: null },
  // Pack Multi-Plateforme (503) → Abonnés Instagram (101) + Abonnés TikTok (201) + Vues YouTube (302)
  { packServiceId: '503', subServiceId: '101', qty: null },
  { packServiceId: '503', subServiceId: '201', qty: null },
  { packServiceId: '503', subServiceId: '302', qty: null },
];

// Vider les items packs existants si --fresh (déjà fait via TRUNCATE)
// Sinon on déduplique par (pack_id, sub_service_id)
let packItemSort = {};
for (const item of packDefs) {
  const packId = await getServiceDbId(item.packServiceId);
  const subId  = await getServiceDbId(item.subServiceId);
  if (!packId || !subId) { console.log(`  ⚠️  Service introuvable : ${item.packServiceId} ou ${item.subServiceId}`); continue; }

  packItemSort[packId] = (packItemSort[packId] || 0) + 1;
  await db.execute(
    `INSERT INTO service_pack_items (pack_id, sub_service_id, quantity_override, sort_order)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE quantity_override = VALUES(quantity_override)`,
    [packId, subId, item.qty, packItemSort[packId]]
  );

  const [[subRow]] = await db.execute('SELECT service_name FROM allowed_services WHERE id = ?', [subId]);
  const [[packRow]] = await db.execute('SELECT service_name FROM allowed_services WHERE id = ?', [packId]);
  console.log(`  📦 ${packRow.service_name.padEnd(30)} ← ${subRow.service_name}`);
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. ALERTS
// ══════════════════════════════════════════════════════════════════════════════
section('Alertes système');

const alerts = [
  { type: 'new_order',    title: 'Nouvelle commande reçue',     message: 'Une nouvelle commande a été passée.',              enabled: 1 },
  { type: 'order_status', title: 'Statut commande mis à jour',  message: 'Le statut d\'une commande a changé.',              enabled: 1 },
  { type: 'system',       title: 'Maintenance planifiée',       message: 'Mise à jour du système prévue le week-end.',       enabled: 0 },
  { type: 'custom',       title: 'Bienvenue sur BroReps',       message: 'Configurez vos fournisseurs dans l\'onglet Config.',enabled: 1 },
];

for (const a of alerts) {
  await upsert('alerts', a);
  console.log(`  ${a.enabled ? '🔔' : '🔕'} [${a.type.padEnd(14)}] ${a.title}`);
}

// ══════════════════════════════════════════════════════════════════════════════
// 6. ORDERS (commandes de test)
// ══════════════════════════════════════════════════════════════════════════════
section('Commandes de test');

const adminId = adminRow.id;
const empId   = empRow.id;

const sampleOrders = [
  { user_id: empId,   service_id: '101', link: 'https://instagram.com/testuser1', username: 'testuser1', quantity: 1000, charge: 4.99,  status: 'completed', shopify_order_number: '1001' },
  { user_id: empId,   service_id: '201', link: 'https://tiktok.com/@testuser1',   username: 'testuser1', quantity: 500,  charge: 2.99,  status: 'processing', shopify_order_number: '1002' },
  { user_id: empId,   service_id: '103', link: 'https://instagram.com/testuser2', username: 'testuser2', quantity: 2500, charge: 9.99,  status: 'processing', dripfeed_runs: 10, dripfeed_interval: 1440, dripfeed_current_run: 3, shopify_order_number: '1003' },
  { user_id: adminId, service_id: '301', link: 'https://youtube.com/@testchan',   username: 'testchan',  quantity: 200,  charge: 7.50,  status: 'pending',    shopify_order_number: '1004' },
  { user_id: empId,   service_id: '202', link: 'https://tiktok.com/@grower99',    username: 'grower99',  quantity: 3000, charge: 11.99, status: 'completed',  shopify_order_number: '1005' },
  { user_id: empId,   service_id: '102', link: 'https://instagram.com/grower99',  username: 'grower99',  quantity: 500,  charge: 1.99,  status: 'cancelled',  shopify_order_number: '1006' },
];

for (const o of sampleOrders) {
  await db.execute(
    `INSERT INTO orders
       (user_id, service_id, link, username, quantity, charge, status,
        shopify_order_number, dripfeed_runs, dripfeed_interval, dripfeed_current_run)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      o.user_id, o.service_id, o.link, o.username, o.quantity, o.charge, o.status,
      o.shopify_order_number ?? null,
      o.dripfeed_runs ?? null, o.dripfeed_interval ?? null, o.dripfeed_current_run ?? 0,
    ]
  );
  const icons = { completed: '✅', processing: '🔄', pending: '⏳', cancelled: '❌', partial: '🔸', failed: '💥' };
  console.log(`  ${icons[o.status] ?? '•'} #${o.shopify_order_number} — @${o.username.padEnd(12)} ${o.service_id} ${`${o.quantity}`.padStart(5)} unités → ${o.status}`);
}

// ══════════════════════════════════════════════════════════════════════════════
// 7. SAAS USERS
// ══════════════════════════════════════════════════════════════════════════════
section('Membres SaaS');

const saasUsers = [
  {
    email: 'creator1@broreps.com', name: 'Lucas Martin', password: 'Creator1234!',
    subscription_status: 'active', subscription_product: 'Premium Mensuel',
    modules_unlocked: 6, notes_reflection: 'Objectif : 50k TikTok avant l\'été. Stratégie : 2 vidéos/jour.',
  },
  {
    email: 'creator2@broreps.com', name: 'Emma Dubois', password: 'Creator1234!',
    subscription_status: 'active', subscription_product: 'Pack Croissance',
    modules_unlocked: 4, notes_reflection: 'Focus Instagram Reels ce mois-ci.',
  },
  {
    email: 'test@broreps.com', name: 'Utilisateur Test', password: 'Test1234!',
    subscription_status: 'active', subscription_product: 'Premium Mensuel',
    modules_unlocked: 3, notes_reflection: 'Objectif : 10k abonnés TikTok d\'ici juin.',
  },
  {
    email: 'paused@broreps.com', name: 'Paul Lefèvre', password: 'Creator1234!',
    subscription_status: 'cancelled', subscription_product: 'Premium Mensuel',
    modules_unlocked: 2, notes_reflection: '',
  },
];

const saasIds = {};
for (const u of saasUsers) {
  const hash = await bcrypt.hash(u.password, 10);
  await db.execute(
    `INSERT INTO saas_users
       (email, name, password, subscription_status, subscription_product,
        modules_unlocked, is_active, notes_reflection, subscribed_at, next_billing_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))
     ON DUPLICATE KEY UPDATE
       name = VALUES(name), password = VALUES(password),
       subscription_status = VALUES(subscription_status),
       subscription_product = VALUES(subscription_product),
       modules_unlocked = VALUES(modules_unlocked),
       notes_reflection = VALUES(notes_reflection),
       is_active = IF(subscription_status = 'active', 1, 0),
       next_billing_at = DATE_ADD(NOW(), INTERVAL 30 DAY)`,
    [u.email, u.name, hash, u.subscription_status, u.subscription_product,
     u.modules_unlocked, u.subscription_status === 'active' ? 1 : 0, u.notes_reflection]
  );
  const [[row]] = await db.execute('SELECT id FROM saas_users WHERE email = ?', [u.email]);
  saasIds[u.email] = row.id;
  const icon = u.subscription_status === 'active' ? '✅' : '⏸️ ';
  console.log(`  ${icon} ${u.name.padEnd(18)} <${u.email}>  mdp: ${u.password}  (${u.modules_unlocked} modules)`);
}

// ── 7a. Module progress ────────────────────────────────────────────────────────
const moduleProgressDefs = {
  'creator1@broreps.com': [
    { module_id: 1, watched: 600, total: 600, done: 1 },
    { module_id: 2, watched: 600, total: 600, done: 1 },
    { module_id: 3, watched: 600, total: 600, done: 1 },
    { module_id: 4, watched: 600, total: 600, done: 1 },
    { module_id: 5, watched: 450, total: 600, done: 0 },
    { module_id: 6, watched: 0,   total: 600, done: 0 },
  ],
  'creator2@broreps.com': [
    { module_id: 1, watched: 600, total: 600, done: 1 },
    { module_id: 2, watched: 600, total: 600, done: 1 },
    { module_id: 3, watched: 300, total: 600, done: 0 },
    { module_id: 4, watched: 0,   total: 600, done: 0 },
  ],
  'test@broreps.com': [
    { module_id: 1, watched: 600, total: 600, done: 1 },
    { module_id: 2, watched: 300, total: 600, done: 0 },
    { module_id: 3, watched: 0,   total: 600, done: 0 },
  ],
  'paused@broreps.com': [
    { module_id: 1, watched: 600, total: 600, done: 1 },
    { module_id: 2, watched: 120, total: 600, done: 0 },
  ],
};

for (const [email, progress] of Object.entries(moduleProgressDefs)) {
  const uid = saasIds[email];
  for (const p of progress) {
    await db.execute(
      `INSERT INTO saas_module_progress (user_id, module_id, watched_seconds, total_seconds, completed)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         watched_seconds = VALUES(watched_seconds), total_seconds = VALUES(total_seconds),
         completed = VALUES(completed)`,
      [uid, p.module_id, p.watched, p.total, p.done]
    );
  }
}
console.log('\n  🎬 Progressions modules insérées');

// ── 7b. Notes scores ───────────────────────────────────────────────────────────
const categoriesScores = {
  'creator1@broreps.com': { communication: 8, creation: 9, discipline: 8, productivite: 9, strategie: 7, energie: 9, impact: 8 },
  'creator2@broreps.com': { communication: 7, creation: 8, discipline: 6, productivite: 7, strategie: 8, energie: 7, impact: 7 },
  'test@broreps.com':     { communication: 7, creation: 8, discipline: 6, productivite: 7, strategie: 5, energie: 8, impact: 6 },
  'paused@broreps.com':   { communication: 5, creation: 5, discipline: 4, productivite: 5, strategie: 5, energie: 5, impact: 5 },
};

for (const [email, scores] of Object.entries(categoriesScores)) {
  const uid = saasIds[email];
  for (const [cat, score] of Object.entries(scores)) {
    await db.execute(
      `INSERT INTO saas_notes_scores (user_id, category_id, score)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE score = VALUES(score)`,
      [uid, cat, score]
    );
  }
}
console.log('  📊 Scores notes insérés');

// ── 7c. Hub posts ──────────────────────────────────────────────────────────────
const hubPosts = [
  { email: 'creator1@broreps.com', type: 'recent',  likes: 12, content: '🚀 Je viens d\'atteindre 25k sur TikTok ! BroReps m\'a vraiment aidé à accélérer ma croissance. Vous avez des questions sur ma stratégie ?' },
  { email: 'creator2@broreps.com', type: 'collab',  likes: 5,  content: '🤝 Je cherche un créateur mode/lifestyle pour une collaboration Reel Instagram. DM si intéressé !' },
  { email: 'creator1@broreps.com', type: 'recent',  likes: 8,  content: '💡 Astuce : postez vos TikToks le mardi et jeudi entre 18h-20h. Mon engagement a doublé !' },
  { email: 'test@broreps.com',     type: 'recent',  likes: 3,  content: 'Salut tout le monde ! Je suis sur TikTok depuis 3 mois et j\'ai déjà 2k abonnés. Qui veut collaborer ? 🚀' },
];

for (const p of hubPosts) {
  const uid = saasIds[p.email];
  await db.execute(
    `INSERT INTO saas_hub_posts (user_id, content, post_type, likes_count)
     VALUES (?, ?, ?, ?)`,
    [uid, p.content, p.type, p.likes]
  );
}
console.log('  💬 Hub posts insérés');

// ── 7d. Forum messages ─────────────────────────────────────────────────────────
const forumMessages = [
  { email: 'creator1@broreps.com', cat: 'tiktok',    msg: 'Pour percer sur TikTok en 2026 : misez sur les transitions rapides et les sons tendance. Le hook dans les 2 premières secondes est crucial !' },
  { email: 'creator2@broreps.com', cat: 'instagram', msg: 'Les Reels avec sous-titres ont 40% de rétention en plus. Pensez-y systématiquement !' },
  { email: 'test@broreps.com',     cat: 'debutants', msg: 'Conseil pour les débutants : postez tous les jours même si la qualité n\'est pas parfaite. La régularité bat la perfection ! 💪' },
  { email: 'creator1@broreps.com', cat: 'debutants', msg: 'Commencez par une niche précise plutôt que de tout faire. Ça m\'a pris 2 mois pour comprendre ça.' },
  { email: 'creator2@broreps.com', cat: 'strategie', msg: 'Le meilleur investissement que j\'ai fait : scheduler mes posts 2 semaines à l\'avance avec Buffer. Fini le stress quotidien.' },
  { email: 'creator1@broreps.com', cat: 'strategie', msg: 'Analytics TikTok Studio > tout autre outil tiers. Les données natives sont 3x plus précises.' },
];

for (const m of forumMessages) {
  const uid = saasIds[m.email];
  await db.execute(
    `INSERT INTO saas_forum_messages (category_id, user_id, content) VALUES (?, ?, ?)`,
    [m.cat, uid, m.msg]
  );
}
console.log('  🗨️  Messages forum insérés');

// ══════════════════════════════════════════════════════════════════════════════
// RÉSUMÉ
// ══════════════════════════════════════════════════════════════════════════════
console.log(`
${'═'.repeat(56)}
✅  SEED TERMINÉ
${'═'.repeat(56)}

  Panel Supply
  ├─ admin@broreps.com          Admin1234!
  └─ samy@broreps.com           Employe1234!

  SaaS (http://localhost:5175/login)
  ├─ creator1@broreps.com       Creator1234!   (6 modules, actif)
  ├─ creator2@broreps.com       Creator1234!   (4 modules, actif)
  ├─ test@broreps.com           Test1234!      (3 modules, actif)
  └─ paused@broreps.com         Creator1234!   (2 modules, annulé)

  Catalogue : ${services.length} services (dont ${services.filter(s => s.is_pack).length} packs)
  Commandes  : ${sampleOrders.length} commandes de test
${'═'.repeat(56)}
`);

await db.end();

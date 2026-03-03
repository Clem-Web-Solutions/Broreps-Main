import db from '../config/database.js';

const sqls = [
    `ALTER TABLE saas_users ADD COLUMN IF NOT EXISTS tiktok_username VARCHAR(100) DEFAULT NULL`,
    `ALTER TABLE saas_users ADD COLUMN IF NOT EXISTS tiktok_linked_at DATETIME DEFAULT NULL`,
    `ALTER TABLE saas_users ADD COLUMN IF NOT EXISTS instagram_username VARCHAR(100) DEFAULT NULL`,
    `ALTER TABLE saas_users ADD COLUMN IF NOT EXISTS instagram_linked_at DATETIME DEFAULT NULL`,
];

for (const sql of sqls) {
    await db.query(sql);
    console.log('OK:', sql.slice(0, 70));
}
console.log('Migration complete.');
process.exit(0);

import db from './config/database.js';
import fs from 'fs';
import path from 'path';

console.log('🔄 Migration de la base de données TagadaPay');
console.log('==============================================');
console.log('');

// Fonction pour vérifier si une colonne existe
async function columnExists(tableName, columnName) {
  const [rows] = await db.query(
    `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = ? 
     AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );
  return rows[0].count > 0;
}

// Fonction pour vérifier si un index existe
async function indexExists(tableName, indexName) {
  const [rows] = await db.query(
    `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = ? 
     AND INDEX_NAME = ?`,
    [tableName, indexName]
  );
  return rows[0].count > 0;
}

try {
  console.log('📝 Vérification et ajout des colonnes manquantes...');
  console.log('');
  
  // Liste des colonnes à ajouter
  const columns = [
    { name: 'order_type', sql: "ADD COLUMN `order_type` ENUM('one_time', 'subscription') DEFAULT 'one_time' COMMENT 'Type de commande' AFTER `order_id`" },
    { name: 'subscription_id', sql: "ADD COLUMN `subscription_id` VARCHAR(255) DEFAULT NULL COMMENT 'TagadaPay subscription ID' AFTER `order_type`" },
    { name: 'subscription_status', sql: "ADD COLUMN `subscription_status` VARCHAR(50) DEFAULT NULL COMMENT 'active, cancelled, paused, expired' AFTER `subscription_id`" },
    { name: 'subscription_interval', sql: "ADD COLUMN `subscription_interval` VARCHAR(50) DEFAULT NULL COMMENT 'monthly, yearly, weekly' AFTER `subscription_status`" },
    { name: 'subscription_next_billing_date', sql: "ADD COLUMN `subscription_next_billing_date` DATETIME DEFAULT NULL COMMENT 'Prochaine date de facturation' AFTER `subscription_interval`" },
    { name: 'subscription_started_at', sql: "ADD COLUMN `subscription_started_at` DATETIME DEFAULT NULL COMMENT 'Date de début de subscription' AFTER `subscription_next_billing_date`" },
    { name: 'subscription_cancelled_at', sql: "ADD COLUMN `subscription_cancelled_at` DATETIME DEFAULT NULL COMMENT 'Date d\\'annulation' AFTER `subscription_started_at`" }
  ];
  
  // Ajouter les colonnes manquantes
  for (const col of columns) {
    const exists = await columnExists('tagadapay_orders', col.name);
    if (exists) {
      console.log(`  ⏭️  Colonne déjà existante: ${col.name}`);
    } else {
      await db.query(`ALTER TABLE tagadapay_orders ${col.sql}`);
      console.log(`  ✅ Colonne ajoutée: ${col.name}`);
    }
  }
  
  console.log('');
  console.log('📝 Vérification et ajout des index...');
  console.log('');
  
  // Liste des index à ajouter
  const indexes = [
    { name: 'idx_subscription_id', sql: "ADD INDEX `idx_subscription_id` (`subscription_id`)" },
    { name: 'idx_order_type', sql: "ADD INDEX `idx_order_type` (`order_type`)" },
    { name: 'idx_subscription_status', sql: "ADD INDEX `idx_subscription_status` (`subscription_status`)" }
  ];
  
  // Ajouter les index manquants
  for (const idx of indexes) {
    const exists = await indexExists('tagadapay_orders', idx.name);
    if (exists) {
      console.log(`  ⏭️  Index déjà existant: ${idx.name}`);
    } else {
      await db.query(`ALTER TABLE tagadapay_orders ${idx.sql}`);
      console.log(`  ✅ Index ajouté: ${idx.name}`);
    }
  }
  
  console.log('');
  console.log('📝 Vérification de la table tagadapay_webhook_logs...');
  console.log('');
  
  // Créer la table de logs si elle n'existe pas
  await db.query(`
    CREATE TABLE IF NOT EXISTS tagadapay_webhook_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      event_type VARCHAR(100) NOT NULL,
      event_id VARCHAR(255) DEFAULT NULL,
      payload LONGTEXT DEFAULT NULL,
      ip_address VARCHAR(100) DEFAULT NULL,
      signature_valid BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_event_type (event_type),
      INDEX idx_event_id (event_id),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('  ✅ Table tagadapay_webhook_logs OK');
  
  console.log('');
  console.log('✅ Migration terminée avec succès!');
  console.log('');
  console.log('👉 Vous pouvez maintenant tester le webhook TagadaPay:');
  console.log('   node test-tagadapay-webhook.js');
  console.log('');
  
  process.exit(0);
} catch (error) {
  console.error('');
  console.error('❌ Erreur lors de la migration:', error.message);
  console.error('');
  console.error('Détails:', error);
  process.exit(1);
}

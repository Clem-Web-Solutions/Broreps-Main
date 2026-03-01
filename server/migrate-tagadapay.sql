-- Migration pour ajouter le support des subscriptions TagadaPay
-- À exécuter sur la base de données broreps_panel

USE broreps_panel;

-- Ajouter la colonne order_type
ALTER TABLE `tagadapay_orders` 
ADD COLUMN `order_type` ENUM('one_time', 'subscription') DEFAULT 'one_time' COMMENT 'Type de commande' 
AFTER `order_id`;

-- Ajouter les colonnes de subscription
ALTER TABLE `tagadapay_orders` 
ADD COLUMN `subscription_id` VARCHAR(255) DEFAULT NULL COMMENT 'TagadaPay subscription ID' 
AFTER `order_type`;

ALTER TABLE `tagadapay_orders` 
ADD COLUMN `subscription_status` VARCHAR(50) DEFAULT NULL COMMENT 'active, cancelled, paused, expired' 
AFTER `subscription_id`;

ALTER TABLE `tagadapay_orders` 
ADD COLUMN `subscription_interval` VARCHAR(50) DEFAULT NULL COMMENT 'monthly, yearly, weekly' 
AFTER `subscription_status`;

ALTER TABLE `tagadapay_orders` 
ADD COLUMN `subscription_next_billing_date` DATETIME DEFAULT NULL COMMENT 'Prochaine date de facturation' 
AFTER `subscription_interval`;

ALTER TABLE `tagadapay_orders` 
ADD COLUMN `subscription_started_at` DATETIME DEFAULT NULL COMMENT 'Date de début de subscription' 
AFTER `subscription_next_billing_date`;

ALTER TABLE `tagadapay_orders` 
ADD COLUMN `subscription_cancelled_at` DATETIME DEFAULT NULL COMMENT 'Date d\'annulation' 
AFTER `subscription_started_at`;

-- Ajouter des index pour les nouvelles colonnes
ALTER TABLE `tagadapay_orders` 
ADD INDEX `idx_subscription_id` (`subscription_id`);

ALTER TABLE `tagadapay_orders` 
ADD INDEX `idx_order_type` (`order_type`);

ALTER TABLE `tagadapay_orders` 
ADD INDEX `idx_subscription_status` (`subscription_status`);

-- Créer la table tagadapay_webhook_logs si elle n'existe pas
CREATE TABLE IF NOT EXISTS `tagadapay_webhook_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `event_type` VARCHAR(100) NOT NULL,
  `event_id` VARCHAR(255) DEFAULT NULL,
  `payload` LONGTEXT DEFAULT NULL,
  `ip_address` VARCHAR(100) DEFAULT NULL,
  `signature_valid` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_event_type (event_type),
  INDEX idx_event_id (event_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Migration completed successfully!' AS status;

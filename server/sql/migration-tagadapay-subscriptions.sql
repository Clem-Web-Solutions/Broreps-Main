-- Migration pour ajouter le support des subscriptions à tagadapay_orders
-- À exécuter si vous avez déjà la table tagadapay_orders sans les champs subscription

-- Ajouter les colonnes pour les subscriptions
ALTER TABLE `tagadapay_orders`
ADD COLUMN `order_type` ENUM('one_time', 'subscription') DEFAULT 'one_time' COMMENT 'Type de commande' AFTER `order_id`,
ADD COLUMN `subscription_id` VARCHAR(255) DEFAULT NULL COMMENT 'TagadaPay subscription ID' AFTER `order_type`,
ADD COLUMN `subscription_status` VARCHAR(50) DEFAULT NULL COMMENT 'active, cancelled, paused, expired' AFTER `subscription_id`,
ADD COLUMN `subscription_interval` VARCHAR(50) DEFAULT NULL COMMENT 'monthly, yearly, weekly' AFTER `subscription_status`,
ADD COLUMN `subscription_next_billing_date` DATETIME DEFAULT NULL COMMENT 'Prochaine date de facturation' AFTER `subscription_interval`,
ADD COLUMN `subscription_started_at` DATETIME DEFAULT NULL COMMENT 'Date de début de subscription' AFTER `subscription_next_billing_date`,
ADD COLUMN `subscription_cancelled_at` DATETIME DEFAULT NULL COMMENT 'Date d annulation' AFTER `subscription_started_at`;

-- Ajouter les index pour les subscriptions
ALTER TABLE `tagadapay_orders`
ADD INDEX idx_subscription_id (subscription_id),
ADD INDEX idx_order_type (order_type),
ADD INDEX idx_subscription_status (subscription_status);

-- Modifier la colonne amount pour permettre NULL (pour les subscriptions sans paiement initial)
ALTER TABLE `tagadapay_orders`
MODIFY COLUMN `amount` INT NOT NULL DEFAULT 0 COMMENT 'Amount in cents';

-- Mettre à jour les entrées existantes comme 'one_time'
UPDATE `tagadapay_orders`
SET `order_type` = 'one_time'
WHERE `order_type` IS NULL;

-- Vérifier la migration
SELECT 
  COLUMN_NAME,
  DATA_TYPE,
  COLUMN_TYPE,
  IS_NULLABLE,
  COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'tagadapay_orders'
  AND COLUMN_NAME IN ('order_type', 'subscription_id', 'subscription_status', 'subscription_interval')
ORDER BY ORDINAL_POSITION;

-- Afficher un résumé
SELECT 
  'Migration terminée - Table tagadapay_orders mise à jour avec support subscriptions' as status;

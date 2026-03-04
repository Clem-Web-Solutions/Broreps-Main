-- TagadaPay Orders Table
CREATE TABLE IF NOT EXISTS `tagadapay_orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `payment_id` VARCHAR(255) UNIQUE NOT NULL COMMENT 'TagadaPay payment ID',
  `checkout_session_id` VARCHAR(255) DEFAULT NULL COMMENT 'TagadaPay checkout session ID',
  `order_id` VARCHAR(255) DEFAULT NULL COMMENT 'TagadaPay order ID',
  `customer_email` VARCHAR(255) DEFAULT NULL,
  `customer_name` VARCHAR(255) DEFAULT NULL,
  `customer_phone` VARCHAR(50) DEFAULT NULL,
  `product_title` VARCHAR(500) DEFAULT NULL,
  `quantity` INT DEFAULT 1,
  `amount` INT NOT NULL COMMENT 'Amount in cents',
  `currency` VARCHAR(10) DEFAULT 'EUR',
  `social_link` TEXT DEFAULT NULL COMMENT 'Instagram, TikTok, or other social media link',
  `service_id` INT DEFAULT NULL COMMENT 'Link to allowed_services table',
  `payment_status` VARCHAR(50) DEFAULT 'pending' COMMENT 'pending, succeeded, failed, refunded',
  `metadata` JSON DEFAULT NULL COMMENT 'Additional metadata from TagadaPay',
  `internal_order_id` INT DEFAULT NULL COMMENT 'Link to orders table',
  `is_processed` BOOLEAN DEFAULT FALSE COMMENT 'Whether order was processed into internal system',
  `shopify_order_number` INT DEFAULT NULL COMMENT 'Shopify order number (#6530)',
  `payment_created_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_payment_id (payment_id),
  INDEX idx_customer_email (customer_email),
  INDEX idx_payment_status (payment_status),
  INDEX idx_internal_order_id (internal_order_id),
  INDEX idx_created_at (created_at),
  
  FOREIGN KEY (internal_order_id) REFERENCES orders(id) ON DELETE SET NULL,
  FOREIGN KEY (service_id) REFERENCES allowed_services(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TagadaPay Webhook Logs Table
CREATE TABLE IF NOT EXISTS `tagadapay_webhook_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `event_type` VARCHAR(100) NOT NULL COMMENT 'payment.succeeded, checkout.completed, etc.',
  `event_id` VARCHAR(255) NOT NULL COMMENT 'TagadaPay event ID',
  `payload` LONGTEXT NOT NULL COMMENT 'Full webhook payload JSON',
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `signature_valid` BOOLEAN DEFAULT FALSE,
  `processed` BOOLEAN DEFAULT FALSE,
  `error_message` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_event_type (event_type),
  INDEX idx_event_id (event_id),
  INDEX idx_processed (processed),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verification Logs for TagadaPay orders (for public tracking)
CREATE TABLE IF NOT EXISTS `tagadapay_verification_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `payment_id` VARCHAR(255) DEFAULT NULL,
  `order_id` VARCHAR(255) DEFAULT NULL,
  `email_attempted` VARCHAR(255) DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `success` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_payment_id (payment_id),
  INDEX idx_email (email_attempted),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

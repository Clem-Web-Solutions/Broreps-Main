-- BroReps Supply Database Schema
-- Ce fichier crée les tables uniquement si elles n'existent pas déjà

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user',
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) DEFAULT 0,
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  service_id VARCHAR(255),
  link VARCHAR(512),
  username VARCHAR(255) NULL,
  quantity INT DEFAULT 1,
  remains INT DEFAULT NULL,
  charge DECIMAL(10, 2) DEFAULT 0,
  notes TEXT,
  shopify_order_number VARCHAR(255) NULL,
  provider_order_id VARCHAR(255) NULL,
  dripfeed_runs INT DEFAULT NULL,
  dripfeed_interval INT DEFAULT NULL,
  dripfeed_current_run INT DEFAULT 0,
  parent_order_id INT DEFAULT NULL,
  status ENUM('pending', 'waiting_for_previous', 'processing', 'completed', 'partial', 'cancelled', 'failed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_username (username),
  INDEX idx_status_username (status, username),
  INDEX idx_parent_order (parent_order_id),
  INDEX idx_provider_order_id (provider_order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Providers table (SMM API providers)
CREATE TABLE IF NOT EXISTS providers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  api_key VARCHAR(512) NOT NULL,
  api_url VARCHAR(512),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Alerts table (system notifications)
CREATE TABLE IF NOT EXISTS alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Allowed services table (catalog)
CREATE TABLE IF NOT EXISTS allowed_services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  service_id VARCHAR(255) NOT NULL,
  service_name VARCHAR(255) NOT NULL,
  provider VARCHAR(100) DEFAULT 'BulkMedya',
  delivery_mode ENUM('standard', 'dripfeed') DEFAULT 'standard',
  dripfeed_quantity INT DEFAULT NULL,
  is_pack BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Service pack items
CREATE TABLE IF NOT EXISTS service_pack_items (
  pack_id INT NOT NULL,
  sub_service_id INT NOT NULL,
  quantity_override INT DEFAULT NULL,
  sort_order INT DEFAULT 0,
  PRIMARY KEY (pack_id, sub_service_id),
  FOREIGN KEY (pack_id) REFERENCES allowed_services(id) ON DELETE CASCADE,
  FOREIGN KEY (sub_service_id) REFERENCES allowed_services(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert admin user (password: admin123)
-- Hash generated with bcrypt: $2a$10$rX...
INSERT INTO users (name, email, password, role) VALUES
("Admin", "admin@broreps.com", "$2a$10$dXJ3F6Z8aHqGx8fN5.2qO.1.2", "admin")
ON DUPLICATE KEY UPDATE email=email;

-- Default provider is intentionally not seeded here.
-- Configure providers via /api/providers with a real API key.

-- Notifications Table (real-time notifications for users)
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  type ENUM('order_created', 'order_updated', 'order_completed', 'low_balance', 'drip_executed', 'system') NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSON NULL,
  is_read BOOLEAN DEFAULT FALSE,
  link VARCHAR(512) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_read (user_id, is_read),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Shopify Integration Tables
-- ============================================================================

-- Table pour stocker les commandes Shopify
CREATE TABLE IF NOT EXISTS shopify_orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    
    -- Shopify identifiers
    shopify_order_id BIGINT UNIQUE NOT NULL,
    shopify_order_number INT NOT NULL,
    
    -- Customer information
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50),
    customer_first_name VARCHAR(100),
    customer_last_name VARCHAR(100),
    
    -- Order details
    product_title VARCHAR(255),
    variant_title VARCHAR(255),
    quantity INT NOT NULL,
    price DECIMAL(10,2),
    total_price DECIMAL(10,2),
    currency VARCHAR(10) DEFAULT 'EUR',
    
    -- Social media link (from order note)
    social_link TEXT,
    
    -- Order status
    shopify_status VARCHAR(50),
    fulfillment_status VARCHAR(50),
    financial_status VARCHAR(50),
    
    -- Internal order linking
    internal_order_id INT,
    is_processed BOOLEAN DEFAULT FALSE,
    processing_error TEXT,
    
    -- Timestamps
    shopify_created_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes for fast lookups
    INDEX idx_shopify_order_number (shopify_order_number),
    INDEX idx_customer_email (customer_email),
    INDEX idx_shopify_order_id (shopify_order_id),
    INDEX idx_internal_order (internal_order_id),
    INDEX idx_is_processed (is_processed),
    
    -- Foreign key to link with internal orders table
    FOREIGN KEY (internal_order_id) REFERENCES orders(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table pour logger les webhooks Shopify (sécurité et debugging)
CREATE TABLE IF NOT EXISTS shopify_webhook_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    topic VARCHAR(100),
    shopify_order_id BIGINT,
    payload JSON,
    ip_address VARCHAR(45),
    signature_valid BOOLEAN,
    processed BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_topic (topic),
    INDEX idx_shopify_order_id (shopify_order_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table pour logger les tentatives de vérification (sécurité)
CREATE TABLE IF NOT EXISTS verification_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_number VARCHAR(50),
    email_attempted VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    success BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_ip_address (ip_address),
    INDEX idx_created_at (created_at),
    INDEX idx_order_number (order_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TagadaPay Integration Tables
-- ============================================================================

-- TagadaPay Orders Table (One-time payments + Subscriptions)
CREATE TABLE IF NOT EXISTS `tagadapay_orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  
  -- Payment information
  `payment_id` VARCHAR(255) UNIQUE NOT NULL COMMENT 'TagadaPay payment ID',
  `checkout_session_id` VARCHAR(255) DEFAULT NULL COMMENT 'TagadaPay checkout session ID',
  `order_id` VARCHAR(255) DEFAULT NULL COMMENT 'TagadaPay order ID',
  `order_type` ENUM('one_time', 'subscription') DEFAULT 'one_time' COMMENT 'Type de commande',
  
  -- Subscription information (if order_type = subscription)
  `subscription_id` VARCHAR(255) DEFAULT NULL COMMENT 'TagadaPay subscription ID',
  `subscription_status` VARCHAR(50) DEFAULT NULL COMMENT 'active, cancelled, paused, expired',
  `subscription_interval` VARCHAR(50) DEFAULT NULL COMMENT 'monthly, yearly, weekly',
  `subscription_next_billing_date` DATETIME DEFAULT NULL COMMENT 'Prochaine date de facturation',
  `subscription_started_at` DATETIME DEFAULT NULL COMMENT 'Date de début de subscription',
  `subscription_cancelled_at` DATETIME DEFAULT NULL COMMENT 'Date d annulation',
  
  -- Customer information
  `customer_email` VARCHAR(255) DEFAULT NULL,
  `customer_name` VARCHAR(255) DEFAULT NULL,
  `customer_phone` VARCHAR(50) DEFAULT NULL,
  
  -- Order details
  `product_title` VARCHAR(500) DEFAULT NULL,
  `quantity` INT DEFAULT 1,
  `amount` INT NOT NULL DEFAULT 0 COMMENT 'Amount in cents',
  `currency` VARCHAR(10) DEFAULT 'EUR',
  
  -- Service information (metadata from checkout)
  `social_link` TEXT DEFAULT NULL COMMENT 'Instagram, TikTok, or other social media link',
  `service_id` INT DEFAULT NULL COMMENT 'Link to allowed_services table',
  
  -- Payment status and processing
  `payment_status` VARCHAR(50) DEFAULT 'pending' COMMENT 'pending, succeeded, failed, refunded',
  `metadata` JSON DEFAULT NULL COMMENT 'Additional metadata from TagadaPay',
  `internal_order_id` INT DEFAULT NULL COMMENT 'Link to orders table',
  `is_processed` BOOLEAN DEFAULT FALSE COMMENT 'Whether order was processed into internal system',
  
  -- Timestamps
  `payment_created_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_payment_id (payment_id),
  INDEX idx_subscription_id (subscription_id),
  INDEX idx_order_type (order_type),
  INDEX idx_customer_email (customer_email),
  INDEX idx_payment_status (payment_status),
  INDEX idx_subscription_status (subscription_status),
  INDEX idx_internal_order_id (internal_order_id),
  INDEX idx_created_at (created_at),
  
  -- Foreign keys
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


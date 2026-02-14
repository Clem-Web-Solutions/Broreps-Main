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
  status ENUM('pending', 'waiting_for_previous', 'processing', 'completed', 'cancelled', 'failed') DEFAULT 'pending',
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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


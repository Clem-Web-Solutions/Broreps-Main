-- Table for allowed services (catalog)
CREATE TABLE IF NOT EXISTS allowed_services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  service_id VARCHAR(255) NOT NULL,
  service_name VARCHAR(255) NOT NULL,
  provider VARCHAR(100) DEFAULT 'BulkMedya',
  delivery_mode ENUM('standard', 'dripfeed') DEFAULT 'standard',
  dripfeed_quantity INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

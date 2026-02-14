-- Notifications Table
-- Tracks system notifications for users (order events, low balance warnings, etc.)

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

-- Sample data (optional)
-- INSERT INTO notifications (user_id, type, title, message, data) VALUES 
-- (1, 'system', 'Welcome!', 'Welcome to BroReps Supply platform', '{"version": "1.0"}');

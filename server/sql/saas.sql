-- SaaS members: linked to tagadapay subscription
CREATE TABLE IF NOT EXISTS saas_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  password VARCHAR(255),                          -- bcrypt hash, NULL until they set it
  tagadapay_customer_id VARCHAR(255),             -- TagadaPay customer/order reference
  subscription_status ENUM('active','past_due','cancelled','expired') DEFAULT 'active',
  subscription_product VARCHAR(255),              -- e.g. "Abonnés Instagram"
  subscribed_at DATETIME,
  next_billing_at DATETIME,
  modules_unlocked INT DEFAULT 1,                 -- nb of modules unlocked so far
  is_active TINYINT(1) DEFAULT 1,
  setup_token VARCHAR(255),                       -- one-time token for password setup
  setup_token_expires DATETIME,
  password_reset_token VARCHAR(255),
  password_reset_expires DATETIME,
  notes_reflection TEXT,                          -- Bloc Réflexions & Insights
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Module watch progress per user
CREATE TABLE IF NOT EXISTS saas_module_progress (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  module_id INT NOT NULL,
  watched_seconds INT DEFAULT 0,
  total_seconds INT DEFAULT 0,
  completed TINYINT(1) DEFAULT 0,
  last_watched_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_module (user_id, module_id),
  CONSTRAINT fk_smp_user FOREIGN KEY (user_id) REFERENCES saas_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Per-user self-assessment scores (Notes page)
CREATE TABLE IF NOT EXISTS saas_notes_scores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  category_id VARCHAR(64) NOT NULL,              -- 'communication', 'creation', etc.
  score INT NOT NULL DEFAULT 5,
  UNIQUE KEY uq_user_cat (user_id, category_id),
  CONSTRAINT fk_sns_user FOREIGN KEY (user_id) REFERENCES saas_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Hub posts (creator networking)
CREATE TABLE IF NOT EXISTS saas_hub_posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  content TEXT NOT NULL,
  post_type ENUM('recent','collab') DEFAULT 'recent',
  likes_count INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_shp_user FOREIGN KEY (user_id) REFERENCES saas_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Hub post likes
CREATE TABLE IF NOT EXISTS saas_hub_likes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  user_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_post_user (post_id, user_id),
  CONSTRAINT fk_shl_post FOREIGN KEY (post_id) REFERENCES saas_hub_posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_shl_user FOREIGN KEY (user_id) REFERENCES saas_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Forum messages per category
CREATE TABLE IF NOT EXISTS saas_forum_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id VARCHAR(64) NOT NULL,              -- 'debutants','tiktok','instagram', etc.
  user_id INT NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sfm_user FOREIGN KEY (user_id) REFERENCES saas_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Indexes (plain CREATE INDEX — duplicate is silently ignored by the executor)
CREATE INDEX idx_sfm_category ON saas_forum_messages(category_id);
CREATE INDEX idx_shp_type ON saas_hub_posts(post_type, created_at);
CREATE INDEX idx_smp_user ON saas_module_progress(user_id);

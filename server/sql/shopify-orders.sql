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

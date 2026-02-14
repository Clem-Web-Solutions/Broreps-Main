-- Check if columns exist before adding them
-- This script is safe to run multiple times

ALTER TABLE orders ADD COLUMN remains INT DEFAULT NULL AFTER quantity;
ALTER TABLE orders ADD COLUMN charge DECIMAL(10, 2) DEFAULT 0 AFTER remains;
ALTER TABLE orders ADD COLUMN provider_order_id VARCHAR(255) NULL AFTER shopify_order_number;
CREATE INDEX idx_provider_order_id ON orders(provider_order_id);

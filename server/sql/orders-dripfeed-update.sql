-- Update orders table to support drip feed functionality
-- This file extends the orders table with drip feed features

-- Add username column (extracted from link)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS username VARCHAR(255) NULL AFTER link;

-- Add drip feed configuration columns
ALTER TABLE orders ADD COLUMN IF NOT EXISTS dripfeed_runs INT DEFAULT NULL AFTER username;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS dripfeed_interval INT DEFAULT NULL AFTER dripfeed_runs;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS dripfeed_current_run INT DEFAULT 0 AFTER dripfeed_interval;

-- Add column for linking orders waiting for previous order to complete
ALTER TABLE orders ADD COLUMN IF NOT EXISTS parent_order_id INT DEFAULT NULL AFTER dripfeed_current_run;

-- Update status ENUM to support waiting state
-- Note: MySQL doesn't support IF NOT EXISTS for ENUM modifications, so we modify directly
ALTER TABLE orders MODIFY COLUMN status ENUM('pending', 'waiting_for_previous', 'processing', 'completed', 'cancelled', 'failed') DEFAULT 'pending';

-- Add indexes for faster duplicate detection queries
CREATE INDEX IF NOT EXISTS idx_username ON orders(username);
CREATE INDEX IF NOT EXISTS idx_status_username ON orders(status, username);
CREATE INDEX IF NOT EXISTS idx_parent_order ON orders(parent_order_id);

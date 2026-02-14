-- Add 'partial' status to orders table
-- Bulkmedya and other providers can return 'Partial' status when order is partially completed
-- Partial orders should not block other orders on the same link

ALTER TABLE orders MODIFY COLUMN status 
  ENUM('pending', 'waiting_for_previous', 'processing', 'completed', 'partial', 'cancelled', 'failed') 
  DEFAULT 'pending';

-- Note: This migration adds 'partial' between 'completed' and 'cancelled'
-- Partial orders are considered non-blocking (like completed orders)

-- Migration: Change orders.service_id from INT to VARCHAR(255) to store provider service IDs
-- This removes the foreign key constraint and allows storing SMM provider service IDs

-- Drop the foreign key constraint if it exists
ALTER TABLE orders DROP FOREIGN KEY IF EXISTS orders_ibfk_2;

-- Modify service_id column to VARCHAR(255)
ALTER TABLE orders MODIFY COLUMN service_id VARCHAR(255);

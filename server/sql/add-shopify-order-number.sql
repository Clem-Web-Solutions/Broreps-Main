-- Migration: Add shopify_order_number column to orders table
-- This allows storing Shopify order IDs for tracking purposes

ALTER TABLE orders ADD COLUMN IF NOT EXISTS shopify_order_number VARCHAR(255) NULL AFTER notes;

-- Ensure shopify_order_number exists on tagadapay_orders for webhook inserts
ALTER TABLE tagadapay_orders
ADD COLUMN IF NOT EXISTS shopify_order_number INT DEFAULT NULL COMMENT 'Shopify order number (#6530)' AFTER payment_created_at;

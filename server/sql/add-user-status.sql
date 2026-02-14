-- Migration: Add status field to users table
-- Date: 2026-02-14
-- Description: Adds status field (pending, approved, rejected) to manage user access approval

-- Add status column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' AFTER role;

-- Set all existing users to 'approved' (grandfathered in)
UPDATE users SET status = 'approved' WHERE status IS NULL OR status = '';

-- Set admin users to 'approved' by default
UPDATE users SET status = 'approved' WHERE role = 'admin';

-- Log completion
SELECT 'User status migration completed' AS message;
SELECT COUNT(*) as total_users, status, COUNT(*) as count 
FROM users 
GROUP BY status;

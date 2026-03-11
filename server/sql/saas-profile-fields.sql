-- Migration: add profile fields to saas_users
-- Run once against the production database

ALTER TABLE saas_users
  ADD COLUMN IF NOT EXISTS bio TEXT NULL,
  ADD COLUMN IF NOT EXISTS custom_status VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS presence ENUM('online','away','dnd','offline') NOT NULL DEFAULT 'online';

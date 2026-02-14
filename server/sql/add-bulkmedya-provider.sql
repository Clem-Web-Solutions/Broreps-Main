-- Add BulkMedya provider if it doesn't exist
-- Replace 'YOUR_BULKMEDYA_API_KEY' with your actual API key from BulkMedya

-- Insert BulkMedya provider
INSERT INTO providers (name, api_key, api_url, active)
VALUES ('BulkMedya', 'YOUR_BULKMEDYA_API_KEY', 'https://bulkmedya.com/api/v2', TRUE)
ON DUPLICATE KEY UPDATE 
  api_url = VALUES(api_url),
  active = TRUE;

-- Insert 'default' provider (used by CRON jobs and sync scripts)
INSERT INTO providers (name, api_key, api_url, active)
VALUES ('default', 'YOUR_BULKMEDYA_API_KEY', 'https://bulkmedya.com/api/v2', TRUE)
ON DUPLICATE KEY UPDATE 
  api_url = VALUES(api_url),
  active = TRUE;

-- Note: After running this script, update the API key via Config page or manually:
-- UPDATE providers SET api_key = 'your_real_api_key' WHERE name IN ('BulkMedya', 'default');

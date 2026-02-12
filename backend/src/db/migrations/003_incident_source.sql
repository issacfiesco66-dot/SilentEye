-- Add source column to incidents to distinguish GPS hardware vs mobile app panics
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'gps';
-- Make imei nullable for mobile panics (no GPS device)
ALTER TABLE incidents ALTER COLUMN imei DROP NOT NULL;

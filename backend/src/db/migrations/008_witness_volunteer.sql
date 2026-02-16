-- Add witness volunteer tracking to incident_followers
ALTER TABLE incident_followers ADD COLUMN IF NOT EXISTS witness_volunteer BOOLEAN DEFAULT NULL;
ALTER TABLE incident_followers ADD COLUMN IF NOT EXISTS witness_requested_at TIMESTAMPTZ;
ALTER TABLE incident_followers ADD COLUMN IF NOT EXISTS witness_responded_at TIMESTAMPTZ;

-- Fleet owner role + vehicle ownership
-- owner_id = user who owns the vehicle (fleet_owner or driver)
-- driver_id = sub-driver assigned to operate the vehicle

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Backfill: existing vehicles with driver_id get that same user as owner
UPDATE vehicles SET owner_id = driver_id WHERE owner_id IS NULL AND driver_id IS NOT NULL;

-- Index for fast fleet lookups
CREATE INDEX IF NOT EXISTS idx_vehicles_owner ON vehicles(owner_id);

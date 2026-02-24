-- Vehicle parked mode: theft detection when parked vehicle moves
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS parked_at TIMESTAMPTZ;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS parked_lat DOUBLE PRECISION;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS parked_lng DOUBLE PRECISION;

-- Incident source: add 'theft' to track theft-triggered incidents
-- (source column already allows any VARCHAR(20), no constraint to update)

-- Alert type index optimization for theft alerts
CREATE INDEX IF NOT EXISTS idx_alerts_vehicle ON alerts(vehicle_id);

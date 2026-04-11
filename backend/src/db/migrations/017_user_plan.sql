-- Add plan field to users for freemium model
-- free: 1 vehicle, personal: 3 vehicles, flotillas: unlimited
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan VARCHAR(20) NOT NULL DEFAULT 'free';

-- Index for quick plan-based queries
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);

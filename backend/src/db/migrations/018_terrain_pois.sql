-- Terrain analysis: Points of Interest saved by users
CREATE TABLE IF NOT EXISTS terrain_pois (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  notes TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  event_date TIMESTAMPTZ,
  geom geometry(Point, 4326),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_terrain_pois_user ON terrain_pois(user_id);
CREATE INDEX IF NOT EXISTS idx_terrain_pois_geom ON terrain_pois USING GIST(geom);

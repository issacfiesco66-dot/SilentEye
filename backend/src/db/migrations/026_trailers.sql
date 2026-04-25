-- Trailers / cargo logistics module — "Logística Blindada".
--
-- A trailer in our model is a row in `vehicles` (already exists, has IMEI
-- and Teltonika GPS) plus a 1:1 row here with cargo metadata. We do NOT
-- duplicate the vehicle/GPS plumbing — every trailer is just a vehicle
-- with extra context (cargo type, capacity, planned routes, risk profile).
--
-- New tables:
--   trailers          — cargo metadata per vehicle
--   trailer_routes    — planned routes with origin/destination/waypoints
--   risk_zones        — polygons with crime / closure / blockade scores
--   trailer_alerts    — system-generated alerts (off-route, risk-zone entry)


-- ── trailers (1:1 with vehicles, cargo metadata) ─────────────────────
CREATE TABLE IF NOT EXISTS trailers (
  vehicle_id UUID PRIMARY KEY REFERENCES vehicles(id) ON DELETE CASCADE,
  cargo_type VARCHAR(40) CHECK (cargo_type IN (
    'refrigerated', 'dry', 'tanker', 'flatbed', 'container', 'auto_carrier', 'other'
  )),
  capacity_kg INTEGER,
  trailer_plates VARCHAR(20),                   -- often distinct from tractor plates
  has_temperature_sensor BOOLEAN NOT NULL DEFAULT FALSE,
  fleet_owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trailers_fleet_owner ON trailers(fleet_owner_id)
  WHERE fleet_owner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trailers_cargo_type ON trailers(cargo_type);


-- ── trailer_routes (planned routes) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS trailer_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trailer_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  name VARCHAR(200),

  origin_lat DOUBLE PRECISION NOT NULL,
  origin_lng DOUBLE PRECISION NOT NULL,
  destination_lat DOUBLE PRECISION NOT NULL,
  destination_lng DOUBLE PRECISION NOT NULL,

  -- Optional sequence of waypoints for adherence checks. Stored as a
  -- LineString in WGS84; off-route detection uses ST_Distance against this.
  path GEOMETRY(LineString, 4326),

  buffer_meters INTEGER NOT NULL DEFAULT 500,   -- corridor width for off-route
  planned_departure TIMESTAMPTZ,
  planned_arrival TIMESTAMPTZ,

  status VARCHAR(20) NOT NULL DEFAULT 'planned' CHECK (status IN (
    'planned', 'in_progress', 'completed', 'deviated', 'cancelled'
  )),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trailer_routes_trailer ON trailer_routes(trailer_id);
CREATE INDEX IF NOT EXISTS idx_trailer_routes_status ON trailer_routes(status);
CREATE INDEX IF NOT EXISTS idx_trailer_routes_path ON trailer_routes USING GIST(path);
CREATE INDEX IF NOT EXISTS idx_trailer_routes_active ON trailer_routes(trailer_id, planned_departure DESC)
  WHERE status IN ('planned', 'in_progress');


-- ── risk_zones (polygons + risk score, sourced manually or from APIs) ─
CREATE TABLE IF NOT EXISTS risk_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  source VARCHAR(40) NOT NULL DEFAULT 'manual' CHECK (source IN (
    'manual', 'sesnsp', 'capufe', 'incident_history', 'partner_intel'
  )),
  category VARCHAR(40) NOT NULL CHECK (category IN (
    'cargo_theft', 'highway_robbery', 'narco_violence',
    'protest_blockade', 'natural_hazard', 'road_closure', 'other'
  )),
  risk_score INTEGER NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
  zone GEOMETRY(Polygon, 4326) NOT NULL,

  active_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  active_until TIMESTAMPTZ,                     -- NULL = active indefinitely
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_zones_zone ON risk_zones USING GIST(zone);
-- Plain index on active_until — partial index with NOW() rejected because
-- index predicates must be IMMUTABLE. Active filter pushed to the query side.
CREATE INDEX IF NOT EXISTS idx_risk_zones_active ON risk_zones(active_until);
CREATE INDEX IF NOT EXISTS idx_risk_zones_category ON risk_zones(category);


-- ── trailer_alerts (system-generated, distinct from generic incidents) ─
CREATE TABLE IF NOT EXISTS trailer_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trailer_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  route_id UUID REFERENCES trailer_routes(id) ON DELETE SET NULL,
  risk_zone_id UUID REFERENCES risk_zones(id) ON DELETE SET NULL,

  alert_type VARCHAR(40) NOT NULL CHECK (alert_type IN (
    'off_route',
    'risk_zone_entry',
    'suspicious_stop',
    'route_deviation',
    'temperature_anomaly',
    'satellite_anomaly_detected',
    'eta_breach'
  )),
  severity VARCHAR(16) NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),

  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  geom GEOMETRY(Point, 4326),

  message TEXT,
  metadata JSONB,                               -- e.g. distance_off_route_m, stop_minutes

  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trailer_alerts_trailer ON trailer_alerts(trailer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trailer_alerts_unresolved ON trailer_alerts(created_at DESC)
  WHERE NOT resolved;
CREATE INDEX IF NOT EXISTS idx_trailer_alerts_geom ON trailer_alerts USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_trailer_alerts_type ON trailer_alerts(alert_type);

-- SilentEye - Esquema PostgreSQL con PostGIS
-- Requiere: CREATE EXTENSION postgis en la base de datos
-- Migración desde schema-simple: requiere reset (DROP tablas) - ver EJECUTAR.md

CREATE EXTENSION IF NOT EXISTS postgis;

-- Usuarios (conductores, helpers, admins)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('driver', 'helper', 'admin')),
  last_location GEOMETRY(Point, 4326),
  last_location_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_last_location ON users USING GIST(last_location);

-- Vehículos
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255),
  imei VARCHAR(20) UNIQUE NOT NULL,
  driver_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_imei ON vehicles(imei);
CREATE INDEX IF NOT EXISTS idx_vehicles_driver ON vehicles(driver_id);

-- Logs GPS (tracking) - geom = ubicación espacial, latitude/longitude redundantes para compatibilidad
CREATE TABLE IF NOT EXISTS gps_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  imei VARCHAR(20) NOT NULL,
  geom GEOMETRY(Point, 4326) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  speed INTEGER DEFAULT 0,
  altitude INTEGER DEFAULT 0,
  angle INTEGER DEFAULT 0,
  satellites INTEGER DEFAULT 0,
  timestamp_at TIMESTAMPTZ NOT NULL,
  raw_io JSONB,
  din1_value INTEGER,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gps_logs_vehicle ON gps_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_gps_logs_imei ON gps_logs(imei);
CREATE INDEX IF NOT EXISTS idx_gps_logs_timestamp ON gps_logs(timestamp_at);
CREATE INDEX IF NOT EXISTS idx_gps_logs_geom ON gps_logs USING GIST(geom);

-- Incidentes (pánico)
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
  imei VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'attending', 'resolved', 'cancelled')),
  geom GEOMETRY(Point, 4326) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_geom ON incidents USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_incidents_started ON incidents(started_at);

-- Ubicación en tiempo real de helpers (actualizada vía POST /helpers/location)
CREATE TABLE IF NOT EXISTS helper_locations (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  geom GEOMETRY(Point, 4326) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_helper_locations_geom ON helper_locations USING GIST(geom);

-- Seguidores del incidente (helpers cercanos que van a asistir)
CREATE TABLE IF NOT EXISTS incident_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'notified' CHECK (status IN ('notified', 'en_route', 'on_site', 'completed')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(incident_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_incident_followers_incident ON incident_followers(incident_id);

-- OTP para login (temporal)
CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_codes(expires_at);

-- Alertas (eventos críticos decodificados desde AVL Teltonika)
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_imei VARCHAR(20) NOT NULL,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  alert_type VARCHAR(50) NOT NULL,
  geom GEOMETRY(Point, 4326) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  speed INTEGER DEFAULT 0,
  raw_event_id INTEGER,
  priority INTEGER DEFAULT 0,
  raw_io JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_imei ON alerts(device_imei);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_geom ON alerts USING GIST(geom);

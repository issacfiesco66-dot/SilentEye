-- Fleet prospects: automated prospecting system for fleet detection
CREATE TABLE IF NOT EXISTS fleet_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio VARCHAR(20) NOT NULL UNIQUE,
  razon_social VARCHAR(255) NOT NULL,
  telefono_whatsapp VARCHAR(30),
  ubicacion_patio VARCHAR(500),
  latitud DOUBLE PRECISION,
  longitud DOUBLE PRECISION,
  tipo_transporte VARCHAR(50) NOT NULL DEFAULT 'Fletes',
  vistas_demo INTEGER NOT NULL DEFAULT 0,
  status_seguridad VARCHAR(30) NOT NULL DEFAULT 'detectado',
  slug VARCHAR(100) NOT NULL UNIQUE,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fleet_prospects_folio ON fleet_prospects(folio);
CREATE INDEX IF NOT EXISTS idx_fleet_prospects_slug ON fleet_prospects(slug);
CREATE INDEX IF NOT EXISTS idx_fleet_prospects_status ON fleet_prospects(status_seguridad);

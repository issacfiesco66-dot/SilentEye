-- Facial recognition & suspect tracking system
-- Stores captured media, detected faces, suspects, and cross-incident sightings

-- Media captured during incidents (photos/video frames from phone camera)
CREATE TABLE IF NOT EXISTS incident_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_type VARCHAR(20) NOT NULL DEFAULT 'photo' CHECK (media_type IN ('photo', 'video_frame')),
  image_data TEXT NOT NULL,            -- base64-encoded JPEG (face crops ~20-50KB each)
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incident_media_incident ON incident_media(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_media_user ON incident_media(user_id);

-- Detected faces extracted from incident media
CREATE TABLE IF NOT EXISTS face_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES incident_media(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  face_crop TEXT NOT NULL,             -- base64-encoded cropped face image
  encoding DOUBLE PRECISION[] NOT NULL, -- 128-dim face descriptor vector
  confidence REAL NOT NULL DEFAULT 0,   -- detection confidence 0-1
  box_x REAL, box_y REAL, box_w REAL, box_h REAL, -- bounding box in original image
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_face_detections_incident ON face_detections(incident_id);
CREATE INDEX IF NOT EXISTS idx_face_detections_media ON face_detections(media_id);

-- Suspects — faces marked by users as suspicious
CREATE TABLE IF NOT EXISTS suspects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alias VARCHAR(100),                   -- optional name/alias given by user
  primary_encoding DOUBLE PRECISION[] NOT NULL, -- representative face encoding
  primary_face_crop TEXT NOT NULL,      -- best face crop for display
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'captured', 'cleared', 'archived')),
  notes TEXT,
  incident_count INTEGER NOT NULL DEFAULT 1,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suspects_status ON suspects(status);
CREATE INDEX IF NOT EXISTS idx_suspects_created_by ON suspects(created_by);

-- Links suspects to multiple incidents — builds the criminal pattern
CREATE TABLE IF NOT EXISTS suspect_sightings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suspect_id UUID NOT NULL REFERENCES suspects(id) ON DELETE CASCADE,
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  face_detection_id UUID REFERENCES face_detections(id) ON DELETE SET NULL,
  similarity_score REAL NOT NULL DEFAULT 0, -- cosine similarity 0-1
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  notes TEXT,
  confirmed_by UUID REFERENCES users(id) ON DELETE SET NULL, -- user who confirmed the match
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(suspect_id, incident_id)
);

CREATE INDEX IF NOT EXISTS idx_suspect_sightings_suspect ON suspect_sightings(suspect_id);
CREATE INDEX IF NOT EXISTS idx_suspect_sightings_incident ON suspect_sightings(incident_id);

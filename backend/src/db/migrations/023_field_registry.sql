-- Field verification registry — 3-tier architecture for documenting
-- real-world findings by search collectives and coordinating with
-- families of missing persons.
--
-- Overview of the tables introduced here:
--
--   teams                     — search collectives (colectivos de búsqueda)
--   field_reports             — on-site verification reports (tier 1)
--   field_report_media        — photos/evidence attached to reports
--   missing_persons_profiles  — family-submitted search profiles (tier 3)
--   profile_matches           — admin-curated links between findings
--                               and missing-person profiles (tier 2)
--
-- Access control (enforced at the API layer, not by RLS):
--   • Field reports: visible to reporter + same-team verifiers + admins
--   • Credential photos (is_credential=TRUE): admin-only
--   • Missing-person profiles: the submitter can edit; admins can see all
--   • Profile matches: admin-only — a human always decides before any
--     family is notified about a potential match


-- ── Teams (colectivos de búsqueda) ──────────────────────────────────
-- A team groups verificadores that coordinate on the ground. Admins
-- create teams and assign users to them. A user is in 0 or 1 teams;
-- changing teams rewrites users.team_id but does NOT retroactively
-- change the team_id snapshot on historical field_reports.
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  region VARCHAR(100),                      -- e.g. 'Sinaloa', 'Guerrero'
  contact_email VARCHAR(200),
  contact_phone VARCHAR(32),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teams_active ON teams(is_active);
CREATE INDEX IF NOT EXISTS idx_teams_created_by ON teams(created_by);

-- Users gain an optional team_id. Nullable so that admins, families
-- and citizens (who don't belong to a collective) can still exist.
-- ON DELETE SET NULL: if a team is soft-deleted/purged, users aren't
-- cascaded away.
ALTER TABLE users ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_team ON users(team_id) WHERE team_id IS NOT NULL;


-- ── Field reports (tier 1 — what the verifier found on the ground) ──
-- One row per verified site visit. A field report is created when a
-- verificador reaches a priority location (often one flagged by
-- terrain analysis via terrain_poi_id) and documents what they found.
--
-- Lifecycle:
--   pending                → just created, not yet reported to authorities
--   notified_authority     → fiscalía / CNB / SEMEFO has been contacted
--   processed_by_authority → site has been officially processed
--   closed                 → case closed (either authorities concluded,
--                            or team determined it wasn't relevant)
CREATE TABLE IF NOT EXISTS field_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who created the report
  reporter_user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  -- Team ownership snapshot at report time. If the reporter later
  -- leaves the team, historical reports stay attributed to the
  -- original team. NULL = reporter wasn't in a team when reporting.
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,

  -- Location of the finding
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  geom geometry(Point, 4326),
  accuracy_m INTEGER,                       -- GPS accuracy at capture time (meters)

  -- When the visit happened (may differ from created_at if logged later)
  report_date TIMESTAMPTZ NOT NULL,

  -- What was found. Deliberately coarse-grained categories to avoid
  -- exposing specific identifying details in listings/search results;
  -- detailed descriptions live in notes (access-controlled).
  category VARCHAR(32) NOT NULL CHECK (category IN (
    'remains',            -- restos óseos / humanos
    'clothing',           -- ropa, prendas
    'credentials',        -- identificaciones, INE, licencias
    'personal_objects',   -- joyas, mochilas, teléfonos, llaves
    'soil_disturbance',   -- tierra removida, sin restos visibles
    'other'
  )),
  notes TEXT,                               -- private to reporter/team/admin

  -- Optional back-link to satellite analysis that led here
  terrain_poi_id UUID REFERENCES terrain_pois(id) ON DELETE SET NULL,

  -- Workflow / status tracking
  status VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'notified_authority',
    'processed_by_authority',
    'closed'
  )),
  authority_notified_at TIMESTAMPTZ,
  authority_notified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  authority_reference TEXT,                 -- case number / folder from fiscalía
  processed_at TIMESTAMPTZ,
  processed_notes TEXT,

  -- Meta
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_field_reports_reporter ON field_reports(reporter_user_id);
CREATE INDEX IF NOT EXISTS idx_field_reports_team ON field_reports(team_id);
CREATE INDEX IF NOT EXISTS idx_field_reports_status ON field_reports(status);
CREATE INDEX IF NOT EXISTS idx_field_reports_category ON field_reports(category);
CREATE INDEX IF NOT EXISTS idx_field_reports_geom ON field_reports USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_field_reports_date ON field_reports(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_field_reports_terrain ON field_reports(terrain_poi_id)
  WHERE terrain_poi_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_field_reports_created ON field_reports(created_at DESC);


-- ── Media attached to field reports ─────────────────────────────────
-- Matches the incident_media pattern from migration 019: base64-encoded
-- in a TEXT column, scaled for ~20-500KB JPEGs. NOT external S3/R2 for
-- V1 — simplicity over scale. Reconsider if media count exceeds ~10k.
--
-- is_credential flag gates access: the API layer returns credential
-- media only to admins; regular verifiers see non-credential media of
-- their own team's reports.
CREATE TABLE IF NOT EXISTS field_report_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_report_id UUID NOT NULL REFERENCES field_reports(id) ON DELETE CASCADE,
  media_type VARCHAR(16) NOT NULL DEFAULT 'photo' CHECK (media_type IN ('photo', 'video_frame')),
  image_data TEXT NOT NULL,                 -- base64-encoded JPEG
  mime_type VARCHAR(64) NOT NULL DEFAULT 'image/jpeg',
  is_credential BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,                         -- optional caption
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_field_report_media_report ON field_report_media(field_report_id);
CREATE INDEX IF NOT EXISTS idx_field_report_media_credential ON field_report_media(is_credential)
  WHERE is_credential = TRUE;


-- ── Missing persons profiles (tier 3 — what families register) ──────
-- A family member registers a profile for their missing person. The
-- submitter authenticates with email+OTP (citizen role is enough) so
-- the profile can be edited and contact is possible. Admins can also
-- create profiles on behalf of families who contact the collective
-- through other channels (phone, Facebook, WhatsApp).
--
-- Status values:
--   searching       — active search, no resolution
--   found_deceased  — person was found deceased (via field report match
--                     or external process)
--   found_alive     — person was located alive
--   case_closed     — family requested closure without resolution
CREATE TABLE IF NOT EXISTS missing_persons_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who registered the profile. NULL = admin-created on behalf of a
  -- family that contacted the collective by external means; the
  -- submitted_by_admin_id column tracks the admin who did so.
  submitter_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  submitted_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Identity
  full_name VARCHAR(200) NOT NULL,
  aliases TEXT,                             -- comma-separated alternate names
  date_of_birth DATE,

  -- Disappearance circumstances
  disappearance_date DATE,
  last_known_latitude DOUBLE PRECISION,
  last_known_longitude DOUBLE PRECISION,
  last_known_geom geometry(Point, 4326),
  last_known_description TEXT,              -- free-text: "salió de su casa en ..."

  -- Physical description — helps cross-reference
  physical_description TEXT,                -- height, build, distinctive marks
  photo_base64 TEXT,                        -- optional photo of the person

  -- Contact (the family — NOT the missing person)
  contact_email VARCHAR(200),
  contact_phone VARCHAR(32),
  contact_name VARCHAR(200),                -- who in the family to contact
  contact_relation VARCHAR(64),             -- "madre", "hermano", etc.

  -- Status
  status VARCHAR(32) NOT NULL DEFAULT 'searching' CHECK (status IN (
    'searching',
    'found_deceased',
    'found_alive',
    'case_closed'
  )),
  status_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status_updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status_notes TEXT,

  -- Meta
  is_public BOOLEAN NOT NULL DEFAULT TRUE,  -- if FALSE, only admin + submitter see it
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_missing_submitter ON missing_persons_profiles(submitter_user_id);
CREATE INDEX IF NOT EXISTS idx_missing_admin ON missing_persons_profiles(submitted_by_admin_id);
CREATE INDEX IF NOT EXISTS idx_missing_status ON missing_persons_profiles(status);
CREATE INDEX IF NOT EXISTS idx_missing_disappearance ON missing_persons_profiles(disappearance_date DESC)
  WHERE disappearance_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_missing_geom ON missing_persons_profiles USING GIST(last_known_geom)
  WHERE last_known_geom IS NOT NULL;
-- Trigram index for fuzzy name search: admin reviewing a credential
-- can type a partial name and get suggestions. Requires pg_trgm.
-- Wrapped in a DO block because a managed Postgres user might not
-- have privilege to CREATE EXTENSION; if so, we skip the index and
-- the app falls back to ILIKE. Worse performance on large datasets
-- but zero functional loss.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  CREATE INDEX IF NOT EXISTS idx_missing_full_name_trgm
    ON missing_persons_profiles USING GIN (full_name gin_trgm_ops);
EXCEPTION
  WHEN insufficient_privilege OR undefined_object OR undefined_function THEN
    RAISE NOTICE 'pg_trgm unavailable — name search will fall back to ILIKE';
END $$;


-- ── Profile matches (tier 2 — admin-curated connections) ────────────
-- Every row represents an admin's judgment that a specific field_report
-- might correspond to a specific missing_persons_profile. Creating a
-- row does NOT notify the family; that's a separate, explicit action
-- tracked by family_notified_at.
--
-- This table is append-only from the API — matches are never edited,
-- only superseded. If an admin changes their mind, they add a new row
-- with different match_type or notes rather than rewriting history.
CREATE TABLE IF NOT EXISTS profile_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_report_id UUID NOT NULL REFERENCES field_reports(id) ON DELETE CASCADE,
  missing_person_id UUID NOT NULL REFERENCES missing_persons_profiles(id) ON DELETE CASCADE,
  matched_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,

  -- How strong the admin believes the match is
  match_type VARCHAR(32) NOT NULL CHECK (match_type IN (
    'credential_name',  -- name on found credential matches profile name
    'physical',         -- physical description matches
    'location_time',    -- disappearance location + date align with finding
    'dna_confirmed',    -- confirmed via forensic DNA (rare, authoritative)
    'other'
  )),
  confidence VARCHAR(16) NOT NULL DEFAULT 'medium' CHECK (confidence IN ('low', 'medium', 'high')),
  notes TEXT,                               -- admin's reasoning

  -- Notification tracking — the most sensitive event in the pipeline.
  -- NULL until an admin confirms the family has been contacted through
  -- an appropriate channel (never auto-emailed).
  family_notified_at TIMESTAMPTZ,
  family_notified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  family_notification_channel VARCHAR(32),  -- 'phone', 'in_person', 'email_manual', 'via_authority'
  family_notification_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profile_matches_report ON profile_matches(field_report_id);
CREATE INDEX IF NOT EXISTS idx_profile_matches_person ON profile_matches(missing_person_id);
CREATE INDEX IF NOT EXISTS idx_profile_matches_confidence ON profile_matches(confidence);
CREATE INDEX IF NOT EXISTS idx_profile_matches_notified ON profile_matches(family_notified_at)
  WHERE family_notified_at IS NOT NULL;

-- A single (field_report, missing_person) pair may be matched multiple
-- times (e.g. first low-confidence match by one admin, later upgraded
-- to high-confidence by another). No UNIQUE constraint here; history
-- is preserved. Queries should ORDER BY created_at DESC to get latest.

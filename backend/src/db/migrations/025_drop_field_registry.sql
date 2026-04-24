-- Drop field-registry / terrain-analysis tables and revert the verificador role.
--
-- This feature lived in SilentEye through migrations 018, 023, and 024.
-- It has been spun off into a separate humanitarian project (Raíces).
-- This migration cleans it out of SilentEye while keeping the rest of the
-- platform untouched. Production had no real data at the time of removal,
-- so DROP is safe; if rerun on an empty DB the IF EXISTS guards make it a
-- no-op.

-- ── Drop the field-registry tables (FK chain: matches → reports + profiles) ──
DROP TABLE IF EXISTS profile_matches CASCADE;
DROP TABLE IF EXISTS missing_persons_profiles CASCADE;
DROP TABLE IF EXISTS field_report_media CASCADE;
DROP TABLE IF EXISTS field_reports CASCADE;
DROP TABLE IF EXISTS terrain_pois CASCADE;
DROP TABLE IF EXISTS teams CASCADE;

-- ── Drop the team_id column from users (added by migration 023) ──
ALTER TABLE users DROP COLUMN IF EXISTS team_id;

-- ── Revert role CHECK to exclude 'verificador' ──
-- If any user still has role='verificador' (shouldn't, since we dropped
-- the feature), demote them to 'citizen' first so the new CHECK passes.
DO $$
BEGIN
  UPDATE users SET role = 'citizen' WHERE role = 'verificador';

  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'users_role_check'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_role_check;
  END IF;

  ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('driver', 'helper', 'admin', 'citizen', 'fleet_owner'));
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Could not revert role constraint cleanly: %', SQLERRM;
END
$$;

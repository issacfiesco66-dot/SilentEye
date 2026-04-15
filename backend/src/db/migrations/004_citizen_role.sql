-- Add 'citizen' to the users role CHECK constraint
-- Also clean up any invalid user data (e.g. phone='bad')

-- Drop and recreate the CHECK constraint to include 'citizen'
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'users_role_check'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_role_check;
  END IF;

  -- Add new constraint with 'citizen' and 'fleet_owner' (added in later migration
  -- but must be present here so a re-run on a live DB doesn't reject valid rows)
  ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('driver', 'helper', 'admin', 'citizen', 'fleet_owner'));
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Could not update role constraint: %', SQLERRM;
END
$$;

-- Clean up invalid users (phone that doesn't look like a phone number)
-- The DELETE is wrapped in a DO block + protected against FK violations
-- from vehicles / incidents / suspects / etc. so a single problematic row
-- can't abort the entire migration pipeline.
--
-- Strategy: only delete orphans (users with NO references from other
-- tables). Users with garbage phones but real vehicles stay and can be
-- cleaned up manually later with better context.
DO $$
BEGIN
  DELETE FROM otp_codes WHERE phone !~ '^\+?[0-9\s\-()]{6,20}$';

  DELETE FROM users u
  WHERE u.phone !~ '^\+?[0-9\s\-()]{6,20}$'
    AND NOT EXISTS (SELECT 1 FROM vehicles v WHERE v.driver_id = u.id OR v.owner_id = u.id)
    AND NOT EXISTS (SELECT 1 FROM incidents i WHERE i.driver_id = u.id);
EXCEPTION
  WHEN others THEN
    -- Never block the pipeline on this cleanup. The FK would already
    -- prevent real damage; we just log and move on.
    RAISE NOTICE 'User cleanup skipped: %', SQLERRM;
END
$$;

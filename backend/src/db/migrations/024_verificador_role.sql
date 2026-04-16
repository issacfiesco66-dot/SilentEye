-- Add 'verificador' to the users role CHECK constraint.
--
-- This role was introduced in Phase 2 of the field verification registry
-- (migration 023). The API allowlist was updated but the DB constraint
-- was forgotten, causing a CHECK violation (→ HTTP 500) on any attempt
-- to assign role = 'verificador' via PUT /users/:id/role.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'users_role_check'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_role_check;
  END IF;

  ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('driver', 'helper', 'admin', 'citizen', 'fleet_owner', 'verificador'));

EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Could not update role constraint: %', SQLERRM;
END
$$;

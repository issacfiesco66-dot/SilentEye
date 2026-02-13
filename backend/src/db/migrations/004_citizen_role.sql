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
  
  -- Add new constraint with 'citizen'
  ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('driver', 'helper', 'admin', 'citizen'));
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Could not update role constraint: %', SQLERRM;
END
$$;

-- Clean up invalid users (phone that doesn't look like a phone number)
DELETE FROM otp_codes WHERE phone !~ '^\+?[0-9\s\-()]{6,20}$';
DELETE FROM users WHERE phone !~ '^\+?[0-9\s\-()]{6,20}$';

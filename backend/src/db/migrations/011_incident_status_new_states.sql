-- Add new incident status values: localizado, recuperado, falsa_alarma, cancelled
-- Drop the old CHECK constraint and recreate with expanded values

ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_status_check;

ALTER TABLE incidents ADD CONSTRAINT incidents_status_check
  CHECK (status IN ('active', 'attending', 'localizado', 'recuperado', 'resolved', 'falsa_alarma', 'cancelled'));

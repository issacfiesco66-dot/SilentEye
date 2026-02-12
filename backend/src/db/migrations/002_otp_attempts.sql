-- Add attempts column to otp_codes for brute-force protection
ALTER TABLE otp_codes ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0;

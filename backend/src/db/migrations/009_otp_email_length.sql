-- Expand otp_codes.phone column to support email addresses (citizen login)
ALTER TABLE otp_codes ALTER COLUMN phone TYPE VARCHAR(255);

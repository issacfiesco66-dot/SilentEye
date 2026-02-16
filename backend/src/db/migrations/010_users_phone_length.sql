-- Expand users.phone column to support email addresses (citizen login uses email as identifier)
ALTER TABLE users ALTER COLUMN phone TYPE VARCHAR(255);

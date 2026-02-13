-- Fix admin role: ensure +51999999999 is always admin
UPDATE users SET role = 'admin', updated_at = NOW() WHERE phone = '+51999999999' AND role != 'admin';

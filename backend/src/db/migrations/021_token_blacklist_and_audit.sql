-- Token revocation + administrative audit log
-- Enables server-side logout (invalidate a JWT before its exp) and leaves
-- a forensic trail of who changed what.

-- ── Token blacklist ──────────────────────────────────────────────────────
-- We store the token's `jti` claim (UUID generated at sign time) plus its
-- expiry so rows can be reaped. A token whose jti is present here is
-- rejected by authMiddleware regardless of its signature validity.
CREATE TABLE IF NOT EXISTS token_blacklist (
  jti TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reason VARCHAR(32) NOT NULL DEFAULT 'logout',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires ON token_blacklist(expires_at);

-- Purge expired blacklist entries (called periodically from backend)
CREATE OR REPLACE FUNCTION purge_expired_blacklist()
RETURNS BIGINT AS $$
DECLARE
  v_deleted BIGINT;
BEGIN
  WITH deleted AS (
    DELETE FROM token_blacklist WHERE expires_at < NOW() RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted FROM deleted;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

-- ── Audit log ────────────────────────────────────────────────────────────
-- Records privileged / state-changing actions. Write-only from app code —
-- we rely on append-only semantics and periodic archival.
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_role VARCHAR(24),
  action VARCHAR(64) NOT NULL,        -- e.g. 'suspect.create', 'vehicle.delete'
  target_type VARCHAR(32),            -- e.g. 'suspect', 'vehicle', 'user'
  target_id TEXT,                     -- UUID or other identifier as string
  ip VARCHAR(64),
  user_agent TEXT,
  details JSONB,                      -- free-form context (previous value, new value, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_target ON audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

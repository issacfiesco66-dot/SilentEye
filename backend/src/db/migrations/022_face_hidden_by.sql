-- Soft-hide mechanism for face detections
--
-- Problem: the original DELETE /api/faces/:id endpoint let any incident
-- driver/follower destroy a face row from the database. In a forensic
-- app that meant a follower (including a potential bad-faith helper)
-- could wipe evidence of a crime before the admin reviewed it. Even
-- in good faith, a driver in panic could tap "delete" on the attacker's
-- face and lose the only evidence.
--
-- Fix: introduce a per-user soft-hide table. When a regular user wants a
-- face "out of their gallery", we record (face_id, user_id) here instead
-- of deleting the row. The face stays in face_detections for admins,
-- legal review, and cross-incident suspect matching. Only admins can
-- issue a true destructive DELETE, and every hard delete is written to
-- audit_log.

CREATE TABLE IF NOT EXISTS face_hidden_by (
  face_id UUID NOT NULL REFERENCES face_detections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hidden_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason VARCHAR(64),
  PRIMARY KEY (face_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_face_hidden_by_user ON face_hidden_by(user_id);

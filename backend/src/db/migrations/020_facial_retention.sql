-- Retention / purge policy for biometric data
-- GDPR / LFPDPPP require time-bounded retention for "special category" data.
-- We enforce a 90-day lifetime on captured media and detected faces that
-- are NOT linked to an active suspect. Suspects themselves are kept until
-- manually archived (they represent evidence of a crime) but their
-- underlying face_detections rows may be dropped once the suspect_sightings
-- links point elsewhere.

CREATE INDEX IF NOT EXISTS idx_incident_media_captured_at ON incident_media(captured_at);
CREATE INDEX IF NOT EXISTS idx_face_detections_created_at ON face_detections(created_at);

-- Function: purge all face-related PII older than the retention window,
-- UNLESS the row is referenced by a live suspect sighting. Suspect
-- sightings become orphaned sightings (face_detection_id → NULL) via the
-- existing ON DELETE SET NULL clause, which preserves the criminal pattern
-- without keeping the raw biometric payload.
CREATE OR REPLACE FUNCTION purge_expired_biometric_data(retention_days INTEGER DEFAULT 90)
RETURNS TABLE(media_deleted BIGINT, faces_deleted BIGINT) AS $$
DECLARE
  cutoff TIMESTAMPTZ := NOW() - (retention_days || ' days')::INTERVAL;
  v_media_deleted BIGINT;
  v_faces_deleted BIGINT;
BEGIN
  -- Delete expired face detections that are not the primary face of any
  -- active suspect. The cascade via suspect_sightings.face_detection_id
  -- (ON DELETE SET NULL) leaves the sighting record intact.
  WITH deleted AS (
    DELETE FROM face_detections fd
    WHERE fd.created_at < cutoff
      AND NOT EXISTS (
        SELECT 1 FROM suspects s
        WHERE s.status = 'active'
          AND s.primary_face_crop = fd.face_crop
      )
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_faces_deleted FROM deleted;

  -- Delete expired incident_media rows (cascades to face_detections still
  -- present). Suspects are NOT affected because they store their own
  -- primary_face_crop independently of incident_media.
  WITH deleted AS (
    DELETE FROM incident_media im
    WHERE im.captured_at < cutoff
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_media_deleted FROM deleted;

  RETURN QUERY SELECT v_media_deleted, v_faces_deleted;
END;
$$ LANGUAGE plpgsql;

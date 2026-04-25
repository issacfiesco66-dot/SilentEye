-- Allow risk_zones.zone to be MultiPolygon so we can store states with
-- offshore islands as a single feature: Baja California (Tiburón etc.),
-- Sonora (Isla Tiburón), Yucatán (Cozumel area), Quintana Roo (Cozumel
-- and Holbox), Colima (Revillagigedo).
--
-- ST_Multi() promotes a single-part Polygon to a 1-part MultiPolygon
-- with no geometric change. Existing rows seeded as Polygon convert
-- losslessly. Future MultiPolygon inserts work natively.

ALTER TABLE risk_zones
  ALTER COLUMN zone TYPE geometry(MultiPolygon, 4326)
  USING ST_Multi(zone);

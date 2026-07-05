/*
  Store the Google Analytics measurement ID in site_settings so the super admin
  can manage it from the backend and the frontend can fall back to a site-wide
  default when the value is empty.
*/

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS ga_measurement_id text NOT NULL DEFAULT 'G-9JDDRD8P1X';

UPDATE site_settings
SET
  ga_measurement_id = COALESCE(NULLIF(ga_measurement_id, ''), 'G-9JDDRD8P1X'),
  updated_at = now()
WHERE is_active = true;

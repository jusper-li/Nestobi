/*
  # Add Advanced SEO Fields

  1. Changes
    - Add `canonical_url` column for specifying the canonical URL
    - Add `robots` column for controlling search engine indexing
    - Add `schema_markup` column for structured data (JSON-LD)
    
  2. Notes
    - All new fields are optional
    - Uses JSONB for schema_markup to enable querying
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seo_settings' AND column_name = 'canonical_url'
  ) THEN
    ALTER TABLE seo_settings ADD COLUMN canonical_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seo_settings' AND column_name = 'robots'
  ) THEN
    ALTER TABLE seo_settings ADD COLUMN robots TEXT DEFAULT 'index, follow';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seo_settings' AND column_name = 'schema_markup'
  ) THEN
    ALTER TABLE seo_settings ADD COLUMN schema_markup JSONB;
  END IF;
END $$;
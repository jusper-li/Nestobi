/*
  # Add images array to hotels table

  ## Summary
  Adds a `images` column (text array) to the hotels table to support multiple
  hotel photos alongside the existing `image_url` cover photo field.

  ## Modified Tables
  - `hotels`
    - `images` (text[], default '{}') — ordered list of image URLs; first element is used as the cover photo
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hotels' AND column_name = 'images'
  ) THEN
    ALTER TABLE hotels ADD COLUMN images text[] DEFAULT '{}';
  END IF;
END $$;

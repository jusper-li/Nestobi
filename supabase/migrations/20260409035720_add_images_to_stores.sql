/*
  # Add images column to stores table

  1. Changes
    - Add images column to stores table (text array type)
  
  2. Notes
    - Stores can have multiple images
    - Images are stored as URLs in an array
*/

ALTER TABLE stores 
  ADD COLUMN IF NOT EXISTS images text[] DEFAULT '{}';
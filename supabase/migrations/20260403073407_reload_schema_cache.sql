/*
  # Reload Schema Cache
  
  1. Purpose
    - Force PostgREST to reload the schema cache
    - This is a harmless operation that updates a comment to trigger cache refresh
  
  2. Changes
    - Updates a comment on the languages table
*/

-- Force schema cache reload by updating table comment
COMMENT ON TABLE languages IS 'Available languages for the multilingual system - updated 2026-04-03';

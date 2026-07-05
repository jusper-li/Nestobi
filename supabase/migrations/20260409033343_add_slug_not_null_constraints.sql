/*
  # Add NOT NULL constraints to slug columns

  1. Changes
    - Add NOT NULL constraint to products.slug
    - Add NOT NULL constraint to categories.slug
  
  2. Notes
    - Ensures slug fields cannot be empty
    - Prevents routing issues with empty slugs
*/

-- Ensure products.slug cannot be NULL or empty
ALTER TABLE products 
  ALTER COLUMN slug SET NOT NULL;

-- Ensure categories.slug cannot be NULL or empty
ALTER TABLE categories 
  ALTER COLUMN slug SET NOT NULL;

-- Add check constraint to ensure slugs are not empty strings
ALTER TABLE products 
  DROP CONSTRAINT IF EXISTS products_slug_not_empty;

ALTER TABLE products 
  ADD CONSTRAINT products_slug_not_empty 
  CHECK (slug <> '');

ALTER TABLE categories 
  DROP CONSTRAINT IF EXISTS categories_slug_not_empty;

ALTER TABLE categories 
  ADD CONSTRAINT categories_slug_not_empty 
  CHECK (slug <> '');
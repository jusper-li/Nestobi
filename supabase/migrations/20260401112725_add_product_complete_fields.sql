/*
  # Add Complete Product Fields

  1. Modifications to Products Table
    - Add `summary` (text) - Product summary/excerpt
    - Add `content` (text) - Full HTML content description
    - Add `cost_price` (numeric) - Cost price for internal tracking
    - Add `member_price` (numeric) - Special price for members (optional)
    - Add `specifications` (jsonb) - Product specifications with variants
    - Add `seo_title` (text) - SEO page title
    - Add `seo_description` (text) - SEO meta description
    - Add `seo_keywords` (text) - SEO keywords
    - Add `og_image` (text) - Open Graph image for social sharing
    - Add `og_title` (text) - Open Graph title
    - Add `og_description` (text) - Open Graph description
    - Add `published_at` (timestamptz) - Product publish date/time
    - Add `unpublished_at` (timestamptz) - Product unpublish date/time
    - Add `is_hidden` (boolean) - Hide product without deleting

  2. Notes
    - All new fields use IF NOT EXISTS to prevent errors
    - Default values provided where appropriate
    - Supports multi-image uploads via existing images jsonb field
    - Specifications stored as JSON array: [{ name: "Size", options: ["S", "M", "L"] }]
*/

-- Add summary field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'summary'
  ) THEN
    ALTER TABLE products ADD COLUMN summary text DEFAULT '';
  END IF;
END $$;

-- Add content field for HTML description
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'content'
  ) THEN
    ALTER TABLE products ADD COLUMN content text DEFAULT '';
  END IF;
END $$;

-- Add cost_price field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'cost_price'
  ) THEN
    ALTER TABLE products ADD COLUMN cost_price numeric DEFAULT 0;
  END IF;
END $$;

-- Add member_price field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'member_price'
  ) THEN
    ALTER TABLE products ADD COLUMN member_price numeric;
  END IF;
END $$;

-- Add specifications field (JSON array of variants)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'specifications'
  ) THEN
    ALTER TABLE products ADD COLUMN specifications jsonb DEFAULT '[]';
  END IF;
END $$;

-- Add SEO title field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'seo_title'
  ) THEN
    ALTER TABLE products ADD COLUMN seo_title text DEFAULT '';
  END IF;
END $$;

-- Add SEO description field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'seo_description'
  ) THEN
    ALTER TABLE products ADD COLUMN seo_description text DEFAULT '';
  END IF;
END $$;

-- Add SEO keywords field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'seo_keywords'
  ) THEN
    ALTER TABLE products ADD COLUMN seo_keywords text DEFAULT '';
  END IF;
END $$;

-- Add Open Graph image field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'og_image'
  ) THEN
    ALTER TABLE products ADD COLUMN og_image text DEFAULT '';
  END IF;
END $$;

-- Add Open Graph title field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'og_title'
  ) THEN
    ALTER TABLE products ADD COLUMN og_title text DEFAULT '';
  END IF;
END $$;

-- Add Open Graph description field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'og_description'
  ) THEN
    ALTER TABLE products ADD COLUMN og_description text DEFAULT '';
  END IF;
END $$;

-- Add published_at field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'published_at'
  ) THEN
    ALTER TABLE products ADD COLUMN published_at timestamptz;
  END IF;
END $$;

-- Add unpublished_at field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'unpublished_at'
  ) THEN
    ALTER TABLE products ADD COLUMN unpublished_at timestamptz;
  END IF;
END $$;

-- Add is_hidden field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'is_hidden'
  ) THEN
    ALTER TABLE products ADD COLUMN is_hidden boolean DEFAULT false;
  END IF;
END $$;
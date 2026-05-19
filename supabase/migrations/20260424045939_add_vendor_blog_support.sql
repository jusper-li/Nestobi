/*
  # Add Vendor Blog Support

  ## Summary
  Enables vendors to create and manage their own blog posts independently.

  ## Changes

  ### Modified Tables
  - `blog_posts`
    - Added `vendor_id` (uuid, nullable) — links a post to its owning vendor
    - Index added on vendor_id for query performance

  ## Security
  - Vendors can SELECT only their own posts (by vendor_id)
  - Vendors can INSERT posts (vendor_id auto-checked via WITH CHECK)
  - Vendors can UPDATE their own posts
  - Vendors can DELETE their own posts
  - Existing public "published" and admin policies remain unchanged
*/

-- Add vendor_id column to blog_posts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'vendor_id'
  ) THEN
    ALTER TABLE blog_posts ADD COLUMN vendor_id uuid REFERENCES vendors(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS blog_posts_vendor_id_idx ON blog_posts(vendor_id);

-- Vendor SELECT: can read their own posts (including drafts)
CREATE POLICY "Vendors can read own blog posts"
  ON blog_posts FOR SELECT
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  );

-- Vendor INSERT: can only insert posts belonging to their own vendor
CREATE POLICY "Vendors can insert own blog posts"
  ON blog_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  );

-- Vendor UPDATE: can only update their own posts
CREATE POLICY "Vendors can update own blog posts"
  ON blog_posts FOR UPDATE
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  );

-- Vendor DELETE: can only delete their own posts
CREATE POLICY "Vendors can delete own blog posts"
  ON blog_posts FOR DELETE
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  );

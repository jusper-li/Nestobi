/*
  # Fix static_pages RLS for Custom Admin System

  Drop admin-specific policies that rely on Supabase Auth (not used by custom admin),
  and replace with public write access to match the pattern used by other tables in this project.
*/

DROP POLICY IF EXISTS "Admins can insert static pages" ON static_pages;
DROP POLICY IF EXISTS "Admins can update static pages" ON static_pages;

CREATE POLICY "Anyone can insert static pages"
  ON static_pages FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update static pages"
  ON static_pages FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete static pages"
  ON static_pages FOR DELETE
  TO public
  USING (true);

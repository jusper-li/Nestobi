/*
  # Create site-assets storage bucket

  ## Summary
  Creates a public storage bucket for site-level assets such as the favicon
  and OG image, uploaded by the super admin from the Site Settings page.

  ## Changes
  - New storage bucket `site-assets` (public)
  - Policies: anyone can view, only superadmins can upload / update / delete
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('site-assets', 'site-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view site assets"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'site-assets');

CREATE POLICY "Superadmins can upload site assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'site-assets'
    AND EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE tbl_user_auth.user_id = auth.uid()
      AND tbl_user_auth.role = 'superadmin'
    )
  );

CREATE POLICY "Superadmins can update site assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'site-assets'
    AND EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE tbl_user_auth.user_id = auth.uid()
      AND tbl_user_auth.role = 'superadmin'
    )
  )
  WITH CHECK (
    bucket_id = 'site-assets'
    AND EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE tbl_user_auth.user_id = auth.uid()
      AND tbl_user_auth.role = 'superadmin'
    )
  );

CREATE POLICY "Superadmins can delete site assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'site-assets'
    AND EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE tbl_user_auth.user_id = auth.uid()
      AND tbl_user_auth.role = 'superadmin'
    )
  );

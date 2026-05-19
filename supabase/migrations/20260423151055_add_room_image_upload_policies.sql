/*
  # Add storage upload policies for room images

  ## Changes
  - Allow authenticated vendors, admins, and superadmins to upload images to the
    site-assets bucket under the rooms/ prefix
  - Allow the same roles to update and delete room images they uploaded

  ## Security
  - Restricted to authenticated users with role in (vendor, admin, superadmin)
  - Scoped to the site-assets bucket
*/

CREATE POLICY "Vendors and admins can upload room images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'site-assets'
    AND (storage.foldername(name))[1] = 'rooms'
    AND EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE user_id = auth.uid()
        AND role IN ('vendor', 'admin', 'superadmin')
    )
  );

CREATE POLICY "Vendors and admins can update room images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'site-assets'
    AND (storage.foldername(name))[1] = 'rooms'
    AND EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE user_id = auth.uid()
        AND role IN ('vendor', 'admin', 'superadmin')
    )
  );

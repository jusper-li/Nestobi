-- Vendors and administrators may upload product images to the existing public bucket.
DROP POLICY IF EXISTS "authenticated upload product assets" ON storage.objects;
CREATE POLICY "authenticated upload product assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'site-assets'
    AND (storage.foldername(name))[1] = 'products'
    AND private.has_role(ARRAY['vendor', 'admin', 'superadmin'])
  );

DROP POLICY IF EXISTS "authenticated update product assets" ON storage.objects;
CREATE POLICY "authenticated update product assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'site-assets'
    AND (storage.foldername(name))[1] = 'products'
    AND private.has_role(ARRAY['vendor', 'admin', 'superadmin'])
  )
  WITH CHECK (
    bucket_id = 'site-assets'
    AND (storage.foldername(name))[1] = 'products'
    AND private.has_role(ARRAY['vendor', 'admin', 'superadmin'])
  );

-- Storage upsert checks SELECT before replacing an existing object.
DROP POLICY IF EXISTS "authenticated read product assets" ON storage.objects;
CREATE POLICY "authenticated read product assets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'site-assets'
    AND (storage.foldername(name))[1] = 'products'
    AND private.has_role(ARRAY['vendor', 'admin', 'superadmin'])
  );

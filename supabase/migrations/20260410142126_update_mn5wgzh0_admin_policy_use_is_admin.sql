/*
  # Update tbl_mn5wgzh0 admin policy to use is_admin() function

  Replaces the inline EXISTS subquery with the is_admin() SECURITY DEFINER function
  for consistency and better performance.
*/

DROP POLICY IF EXISTS "Admins can view all member profiles" ON tbl_mn5wgzh0;

CREATE POLICY "Admins can view all member profiles"
  ON tbl_mn5wgzh0 FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR is_admin()
  );

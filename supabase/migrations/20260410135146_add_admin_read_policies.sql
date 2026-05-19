/*
  # Add Admin Read/Write Policies for User Management

  ## Summary
  This migration adds missing admin-level RLS policies to allow admins and superadmins
  to read and manage all user data through the admin backend.

  ## Changes

  ### tbl_user_auth
  - Add: Admins/superadmins can SELECT all user auth records
  - Add: Admins/superadmins can UPDATE any user auth record (to change roles, toggle active)

  ### tbl_mn5wgzh0
  - Add: Admins/superadmins can SELECT all member profiles

  ## Security Notes
  - Only users with role 'admin' or 'superadmin' in tbl_user_auth can access these
  - Regular users still only see their own data
  - This is required for admin user management functionality to work correctly
*/

-- Allow admins/superadmins to view all user auth records
DROP POLICY IF EXISTS "Admins can view all user auth records" ON tbl_user_auth;
CREATE POLICY "Admins can view all user auth records"
  ON tbl_user_auth FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM tbl_user_auth ua
      WHERE ua.user_id = auth.uid() AND ua.role IN ('admin', 'superadmin')
    )
  );

-- Allow admins/superadmins to update any user auth record (role changes, active toggle)
DROP POLICY IF EXISTS "Admins can update any user auth record" ON tbl_user_auth;
CREATE POLICY "Admins can update any user auth record"
  ON tbl_user_auth FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM tbl_user_auth ua
      WHERE ua.user_id = auth.uid() AND ua.role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM tbl_user_auth ua
      WHERE ua.user_id = auth.uid() AND ua.role IN ('admin', 'superadmin')
    )
  );

-- Allow admins/superadmins to view all member profiles
DROP POLICY IF EXISTS "Admins can view all member profiles" ON tbl_mn5wgzh0;
CREATE POLICY "Admins can view all member profiles"
  ON tbl_mn5wgzh0 FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM tbl_user_auth ua
      WHERE ua.user_id = auth.uid() AND ua.role IN ('admin', 'superadmin')
    )
  );

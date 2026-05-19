/*
  # Fix Infinite Recursion in tbl_user_auth RLS Policies

  ## Problem
  The policies "Admins can view all user auth records" and "Admins can update any
  user auth record" on tbl_user_auth referenced tbl_user_auth inside their own
  USING clause, causing PostgreSQL error 42P17 (infinite loop detected in policy).

  ## Solution
  1. Create a SECURITY DEFINER function `is_admin()` that checks admin status
     while bypassing RLS (preventing recursion).
  2. Drop the problematic recursive policies.
  3. Recreate them using `is_admin()` instead of the self-referencing EXISTS subquery.
*/

-- Create a SECURITY DEFINER helper function that checks if current user is admin
-- SECURITY DEFINER means it runs with the privileges of the function owner,
-- bypassing RLS on tbl_user_auth and preventing infinite recursion.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM tbl_user_auth
    WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
  );
$$;

-- Drop the recursive policies
DROP POLICY IF EXISTS "Admins can view all user auth records" ON tbl_user_auth;
DROP POLICY IF EXISTS "Admins can update any user auth record" ON tbl_user_auth;

-- Recreate SELECT policy using the SECURITY DEFINER function
CREATE POLICY "Admins can view all user auth records"
  ON tbl_user_auth FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR is_admin()
  );

-- Recreate UPDATE policy using the SECURITY DEFINER function
CREATE POLICY "Admins can update any user auth record"
  ON tbl_user_auth FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR is_admin()
  )
  WITH CHECK (
    user_id = auth.uid() OR is_admin()
  );

/*
  # Admin & Super Admin Tables

  1. New Tables
    - `tbl_super_admin` - Records of super admin users (granted_by, granted_at)
    - `user_permissions` - Granular per-user feature permissions (manage_rooms, etc.)
    - `tbl_management_dashboard` - Cached admin dashboard stats (upserted on key events)

  2. Security
    - Super admin table readable only by superadmins
    - Permissions readable by the target user and admins
    - Dashboard stats readable by admins only

  3. Seed Data
    - Default product categories for travel platform
    - Sample rooms and vendors for demonstration
*/

CREATE TABLE IF NOT EXISTS tbl_super_admin (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamptz DEFAULT now()
);

ALTER TABLE tbl_super_admin ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can view super admin table"
  ON tbl_super_admin FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE user_id = auth.uid() AND role = 'superadmin'
    )
  );

CREATE POLICY "Superadmins can insert into super admin table"
  ON tbl_super_admin FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE user_id = auth.uid() AND role = 'superadmin'
    )
  );

CREATE TABLE IF NOT EXISTS user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  permission text NOT NULL,
  granted boolean DEFAULT true,
  granted_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, permission)
);

ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own permissions"
  ON user_permissions FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admins can insert permissions"
  ON user_permissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admins can update permissions"
  ON user_permissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admins can delete permissions"
  ON user_permissions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

CREATE TABLE IF NOT EXISTS tbl_management_dashboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_key text UNIQUE NOT NULL,
  stat_value jsonb DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tbl_management_dashboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view dashboard stats"
  ON tbl_management_dashboard FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admins can upsert dashboard stats"
  ON tbl_management_dashboard FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admins can update dashboard stats"
  ON tbl_management_dashboard FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

INSERT INTO categories (name, slug) VALUES
  ('旅遊紀念品', 'souvenirs'),
  ('旅行配件', 'travel-accessories'),
  ('美食特產', 'local-food'),
  ('戶外用品', 'outdoor-gear'),
  ('文化藝品', 'cultural-art')
ON CONFLICT (slug) DO NOTHING;

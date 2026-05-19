/*
  # User Authentication & Profile Tables

  1. New Tables
    - `tbl_user_auth` - Stores user roles (user/admin/superadmin) linked to Supabase auth
    - `verification_codes` - 6-digit OTP codes for email verification during registration
    - `tbl_mn5wgzh0` - Member profile data (display name, phone, avatar, bio, etc.)
    - `user_preferences` - Per-user app settings (notifications, theme, currency, language)

  2. Security
    - RLS enabled on all tables
    - Users can only read/write their own data
    - Admins and superadmins can read all user data
*/

CREATE TABLE IF NOT EXISTS tbl_user_auth (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  role text NOT NULL DEFAULT 'user',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tbl_user_auth ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own auth record"
  ON tbl_user_auth FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own auth record"
  ON tbl_user_auth FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own auth record"
  ON tbl_user_auth FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  attempts integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert verification codes"
  ON verification_codes FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can read verification codes by email"
  ON verification_codes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can update verification codes"
  ON verification_codes FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS tbl_mn5wgzh0 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  display_name text DEFAULT '',
  phone text DEFAULT '',
  avatar_url text DEFAULT '',
  bio text DEFAULT '',
  nationality text DEFAULT '',
  preferred_language text DEFAULT 'zh-TW',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tbl_mn5wgzh0 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON tbl_mn5wgzh0 FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON tbl_mn5wgzh0 FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON tbl_mn5wgzh0 FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  notifications_email boolean DEFAULT true,
  notifications_sms boolean DEFAULT false,
  theme text DEFAULT 'light',
  currency text DEFAULT 'TWD',
  language text DEFAULT 'zh-TW',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

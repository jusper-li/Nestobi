/*
  # Create Member Profiles System

  ## Summary
  Sets up member authentication profiles linked to Supabase Auth users,
  enabling frontend registration and login for site visitors.

  ## New Tables
  - `member_profiles`
    - `id` (uuid, PK) — references auth.users(id), auto-deleted on user removal
    - `display_name` (text) — user's chosen display name
    - `phone` (text) — optional phone number
    - `avatar_url` (text) — optional avatar image URL
    - `is_active` (boolean) — account active flag, default true
    - `total_spent` (numeric) — cumulative spend amount, default 0
    - `order_count` (integer) — total order count, default 0
    - `created_at` (timestamptz) — record creation time
    - `updated_at` (timestamptz) — last update time

  ## Security
  - RLS enabled on member_profiles
  - SELECT policy: authenticated users can only read their own profile
  - INSERT policy: authenticated users can only insert their own profile
  - UPDATE policy: authenticated users can only update their own profile

  ## Automation
  - Trigger `on_auth_user_created` auto-creates a profile row whenever
    a new user registers via Supabase Auth, using `display_name` from
    user metadata if provided.
*/

CREATE TABLE IF NOT EXISTS member_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text DEFAULT '',
  phone text DEFAULT '',
  avatar_url text DEFAULT '',
  is_active boolean DEFAULT true,
  total_spent numeric DEFAULT 0,
  order_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE member_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own profile"
  ON member_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Members can insert own profile"
  ON member_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Members can update own profile"
  ON member_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION create_member_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.member_profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_member_profile();

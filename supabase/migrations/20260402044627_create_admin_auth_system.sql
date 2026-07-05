/*
  # Create Admin Authentication System

  1. New Tables
    - `admins`
      - `id` (uuid, primary key)
      - `username` (text, unique)
      - `password_hash` (text)
      - `email` (text, unique)
      - `is_active` (boolean, default true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `admins` table
    - Add policies for admin access
*/

CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  email text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read own data"
  ON admins FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins can update own data"
  ON admins FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
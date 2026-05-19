/*
  # Create vendor_staff table

  ## Summary
  Adds a staff management table for vendors to track their housekeeping and management personnel.

  ## New Tables
  - `vendor_staff`
    - `id` (uuid, primary key)
    - `vendor_id` (uuid, FK → vendors.id) — which vendor this staff belongs to
    - `name` (text) — staff member's full name
    - `role` (text) — role/title (e.g., 房務員, 清潔員, 主管)
    - `phone` (text) — contact phone number
    - `email` (text) — contact email
    - `is_active` (boolean, default true) — whether currently active
    - `notes` (text) — additional notes
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Vendors can only view and manage their own staff records
  - Admins/superadmins can view all staff records
*/

CREATE TABLE IF NOT EXISTS vendor_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT '房務員',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vendor_staff_vendor_id_idx ON vendor_staff (vendor_id);

ALTER TABLE vendor_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors can view own staff"
  ON vendor_staff FOR SELECT
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can insert own staff"
  ON vendor_staff FOR INSERT
  TO authenticated
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can update own staff"
  ON vendor_staff FOR UPDATE
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can delete own staff"
  ON vendor_staff FOR DELETE
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all staff"
  ON vendor_staff FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

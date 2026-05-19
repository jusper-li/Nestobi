/*
  # Create Hotels Table

  ## Summary
  Adds a hotels table to support one vendor having multiple hotel properties.
  Each hotel belongs to one vendor, and rooms now optionally belong to a hotel.

  ## New Tables
  - `hotels`
    - `id` (uuid, PK)
    - `vendor_id` (uuid, FK → vendors.id CASCADE)
    - `name` (text, NOT NULL) — hotel display name
    - `description` (text) — hotel description
    - `address` (text) — full address
    - `city` (text) — city for display/search
    - `image_url` (text) — hero image
    - `star_rating` (int, 1–5) — hotel star rating
    - `phone` (text) — front desk phone
    - `email` (text) — contact email
    - `is_active` (boolean, default true)
    - `created_at`, `updated_at` (timestamptz)

  ## Modified Tables
  - `tbl_rooms` — add `hotel_id` (uuid, nullable FK → hotels.id SET NULL)

  ## Security
  - RLS enabled on hotels
  - Vendors can CRUD their own hotels (via vendor_id → vendors.user_id)
  - Admins/superadmins can view and manage all hotels
*/

-- Create hotels table
CREATE TABLE IF NOT EXISTS hotels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  address text DEFAULT '',
  city text DEFAULT '',
  image_url text DEFAULT '',
  star_rating int DEFAULT 3 CHECK (star_rating BETWEEN 1 AND 5),
  phone text DEFAULT '',
  email text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add hotel_id to tbl_rooms (nullable for backward compatibility)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tbl_rooms' AND column_name = 'hotel_id'
  ) THEN
    ALTER TABLE tbl_rooms ADD COLUMN hotel_id uuid REFERENCES hotels(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for fast hotel lookup
CREATE INDEX IF NOT EXISTS idx_hotels_vendor_id ON hotels(vendor_id);
CREATE INDEX IF NOT EXISTS idx_tbl_rooms_hotel_id ON tbl_rooms(hotel_id);

-- Enable RLS
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;

-- Vendors can view their own hotels
CREATE POLICY "Vendors can view own hotels"
  ON hotels FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vendors
      WHERE vendors.id = hotels.vendor_id
        AND vendors.user_id = auth.uid()
    )
  );

-- Vendors can insert hotels for themselves
CREATE POLICY "Vendors can insert own hotels"
  ON hotels FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vendors
      WHERE vendors.id = hotels.vendor_id
        AND vendors.user_id = auth.uid()
    )
  );

-- Vendors can update their own hotels
CREATE POLICY "Vendors can update own hotels"
  ON hotels FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vendors
      WHERE vendors.id = hotels.vendor_id
        AND vendors.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vendors
      WHERE vendors.id = hotels.vendor_id
        AND vendors.user_id = auth.uid()
    )
  );

-- Vendors can delete their own hotels
CREATE POLICY "Vendors can delete own hotels"
  ON hotels FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vendors
      WHERE vendors.id = hotels.vendor_id
        AND vendors.user_id = auth.uid()
    )
  );

-- Admins and superadmins can view all hotels
CREATE POLICY "Admins can view all hotels"
  ON hotels FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE tbl_user_auth.user_id = auth.uid()
        AND tbl_user_auth.role IN ('admin', 'superadmin')
    )
  );

-- Admins and superadmins can manage all hotels
CREATE POLICY "Admins can insert hotels"
  ON hotels FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE tbl_user_auth.user_id = auth.uid()
        AND tbl_user_auth.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admins can update all hotels"
  ON hotels FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE tbl_user_auth.user_id = auth.uid()
        AND tbl_user_auth.role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE tbl_user_auth.user_id = auth.uid()
        AND tbl_user_auth.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admins can delete hotels"
  ON hotels FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE tbl_user_auth.user_id = auth.uid()
        AND tbl_user_auth.role IN ('admin', 'superadmin')
    )
  );

/*
  # Add Vendor User Link and Vendor-Role RLS Policies

  ## Summary
  Extends the vendor system to support a dedicated vendor login/portal.

  ## Changes

  ### Modified Tables
  - `vendors`: Add `user_id` column (nullable) to link a vendor record to a Supabase auth user.
    Vendors with a linked user account can log in and manage their own data.

  ### New RLS Policies
  - `vendors`: Vendors can view/update their own record using `user_id = auth.uid()`
  - `tbl_rooms`: Vendors can insert/update/delete rooms belonging to their vendor record
  - `tbl_bookings`: Vendors can view bookings for their rooms
  - `products`: Vendors can insert/update/delete products belonging to their vendor record

  ## Security Notes
  - All vendor write access is scoped to records owned by that vendor (via vendor_id lookup)
  - Admins/superadmins retain full access through existing policies
  - Vendors cannot access other vendors' data
*/

-- Add user_id column to vendors table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendors' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE vendors ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_vendors_user_id ON vendors(user_id);

-- Vendors can view their own record (even inactive ones)
DROP POLICY IF EXISTS "Vendors can view own record" ON vendors;
CREATE POLICY "Vendors can view own record"
  ON vendors FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Vendors can update their own record
DROP POLICY IF EXISTS "Vendors can update own profile" ON vendors;
CREATE POLICY "Vendors can update own profile"
  ON vendors FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Vendors can insert their own rooms
DROP POLICY IF EXISTS "Vendors can insert own rooms" ON tbl_rooms;
CREATE POLICY "Vendors can insert own rooms"
  ON tbl_rooms FOR INSERT
  TO authenticated
  WITH CHECK (
    vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM tbl_user_auth WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
  );

-- Vendors can update their own rooms
DROP POLICY IF EXISTS "Vendors can update own rooms" ON tbl_rooms;
CREATE POLICY "Vendors can update own rooms"
  ON tbl_rooms FOR UPDATE
  TO authenticated
  USING (
    vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM tbl_user_auth WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
  )
  WITH CHECK (
    vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM tbl_user_auth WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
  );

-- Vendors can delete their own rooms
DROP POLICY IF EXISTS "Vendors can delete own rooms" ON tbl_rooms;
CREATE POLICY "Vendors can delete own rooms"
  ON tbl_rooms FOR DELETE
  TO authenticated
  USING (
    vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM tbl_user_auth WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
  );

-- Vendors can view bookings for their rooms
DROP POLICY IF EXISTS "Vendors can view room bookings" ON tbl_bookings;
CREATE POLICY "Vendors can view room bookings"
  ON tbl_bookings FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR room_id IN (
      SELECT r.id FROM tbl_rooms r
      JOIN vendors v ON v.id = r.vendor_id
      WHERE v.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- Vendors can insert their own products
DROP POLICY IF EXISTS "Vendors can insert own products" ON products;
CREATE POLICY "Vendors can insert own products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM tbl_user_auth WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
  );

-- Vendors can update their own products
DROP POLICY IF EXISTS "Vendors can update own products" ON products;
CREATE POLICY "Vendors can update own products"
  ON products FOR UPDATE
  TO authenticated
  USING (
    vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM tbl_user_auth WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
  )
  WITH CHECK (
    vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM tbl_user_auth WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
  );

-- Vendors can delete their own products
DROP POLICY IF EXISTS "Vendors can delete own products" ON products;
CREATE POLICY "Vendors can delete own products"
  ON products FOR DELETE
  TO authenticated
  USING (
    vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM tbl_user_auth WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
  );

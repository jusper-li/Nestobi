/*
  # Booking System Tables

  1. New Tables
    - `vendors` - Partner vendors/hotels providing rooms and products
    - `tbl_rooms` - Hotel/accommodation rooms with pricing, amenities, availability
    - `tbl_bookings` - User room bookings with check-in/out dates, status, pricing
    - `points` - Points ledger (positive=earned, negative=spent) for rewards system

  2. Security
    - RLS enabled on all tables
    - Rooms and vendors are publicly readable
    - Bookings are private per user; admins can view all
    - Points are private per user
*/

CREATE TABLE IF NOT EXISTS vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  contact_email text DEFAULT '',
  contact_phone text DEFAULT '',
  address text DEFAULT '',
  logo_url text DEFAULT '',
  website text DEFAULT '',
  is_active boolean DEFAULT true,
  note text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors are publicly readable"
  ON vendors FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Authenticated users can view all vendors"
  ON vendors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert vendors"
  ON vendors FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admins can update vendors"
  ON vendors FOR UPDATE
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

CREATE POLICY "Admins can delete vendors"
  ON vendors FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

CREATE TABLE IF NOT EXISTS tbl_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendors(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text DEFAULT '',
  room_type text NOT NULL DEFAULT 'double',
  capacity integer DEFAULT 2,
  price_per_night numeric NOT NULL DEFAULT 0,
  image_url text DEFAULT '',
  amenities jsonb DEFAULT '[]',
  location text DEFAULT '',
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tbl_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rooms are publicly readable"
  ON tbl_rooms FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert rooms"
  ON tbl_rooms FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admins can update rooms"
  ON tbl_rooms FOR UPDATE
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

CREATE POLICY "Admins can delete rooms"
  ON tbl_rooms FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

CREATE TABLE IF NOT EXISTS tbl_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id uuid REFERENCES tbl_rooms(id) ON DELETE SET NULL,
  check_in_date date NOT NULL,
  check_out_date date NOT NULL,
  guests integer DEFAULT 1,
  total_price numeric NOT NULL DEFAULT 0,
  status text DEFAULT 'pending',
  special_requests text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tbl_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookings"
  ON tbl_bookings FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Users can insert own bookings"
  ON tbl_bookings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own bookings"
  ON tbl_bookings FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

CREATE TABLE IF NOT EXISTS points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  transaction_type text NOT NULL DEFAULT 'earned',
  reference_id uuid,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own points"
  ON points FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "System can insert points"
  ON points FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_tbl_bookings_user_id ON tbl_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_tbl_bookings_room_id ON tbl_bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_points_user_id ON points(user_id);

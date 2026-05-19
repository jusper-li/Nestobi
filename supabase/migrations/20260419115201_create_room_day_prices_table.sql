/*
  # Create Room Day Prices Table

  ## Summary
  Adds per-day-of-week pricing for rooms so that administrators and vendors
  can set different rates for Monday through Sunday. When a booking is made,
  the system uses the day-specific price for each night; if no day price is set
  the room's base price_per_night is used as fallback.

  ## New Tables

  ### `tbl_room_day_prices`
  Stores one pricing row per room per day of the week.

  | Column       | Type        | Description                                      |
  |--------------|-------------|--------------------------------------------------|
  | id           | uuid        | Primary key                                      |
  | room_id      | uuid        | Foreign key → tbl_rooms.id (CASCADE delete)      |
  | day_of_week  | smallint    | 0 = Sunday, 1 = Monday … 6 = Saturday            |
  | price        | numeric     | Price for that day (NT$)                         |
  | created_at   | timestamptz | Row creation timestamp                           |
  | updated_at   | timestamptz | Last update timestamp                            |

  Unique constraint: (room_id, day_of_week) — one price per day per room.

  ## Security
  - RLS enabled
  - Admins & superadmins have full CRUD access
  - Vendors can SELECT and UPDATE prices for rooms they own
  - Authenticated regular users can SELECT (needed for price display during booking)
*/

CREATE TABLE IF NOT EXISTS tbl_room_day_prices (
  id           uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id      uuid      NOT NULL REFERENCES tbl_rooms(id) ON DELETE CASCADE,
  day_of_week  smallint  NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  price        numeric   NOT NULL DEFAULT 0,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE (room_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS tbl_room_day_prices_room_id_idx ON tbl_room_day_prices(room_id);

ALTER TABLE tbl_room_day_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can select room day prices"
  ON tbl_room_day_prices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE tbl_user_auth.user_id = auth.uid()
        AND tbl_user_auth.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admins can insert room day prices"
  ON tbl_room_day_prices FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE tbl_user_auth.user_id = auth.uid()
        AND tbl_user_auth.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admins can update room day prices"
  ON tbl_room_day_prices FOR UPDATE
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

CREATE POLICY "Admins can delete room day prices"
  ON tbl_room_day_prices FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE tbl_user_auth.user_id = auth.uid()
        AND tbl_user_auth.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Vendors can select own room day prices"
  ON tbl_room_day_prices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_rooms r
      JOIN vendors v ON v.id = r.vendor_id
      WHERE r.id = tbl_room_day_prices.room_id
        AND v.user_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can insert own room day prices"
  ON tbl_room_day_prices FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tbl_rooms r
      JOIN vendors v ON v.id = r.vendor_id
      WHERE r.id = tbl_room_day_prices.room_id
        AND v.user_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can update own room day prices"
  ON tbl_room_day_prices FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_rooms r
      JOIN vendors v ON v.id = r.vendor_id
      WHERE r.id = tbl_room_day_prices.room_id
        AND v.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tbl_rooms r
      JOIN vendors v ON v.id = r.vendor_id
      WHERE r.id = tbl_room_day_prices.room_id
        AND v.user_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can delete own room day prices"
  ON tbl_room_day_prices FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_rooms r
      JOIN vendors v ON v.id = r.vendor_id
      WHERE r.id = tbl_room_day_prices.room_id
        AND v.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can select room day prices"
  ON tbl_room_day_prices FOR SELECT
  TO authenticated
  USING (true);

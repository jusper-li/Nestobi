/*
  # Create Room Inventory Table

  ## Summary
  Adds a hardware inventory system for housekeeping / room management.
  Staff can track every physical item in each room across four categories,
  assign a status to each item, and manage quantities.

  ## New Tables

  ### `room_inventory_items`
  Stores individual inventory items belonging to a room.

  | Column      | Type      | Description |
  |-------------|-----------|-------------|
  | id          | uuid      | Primary key |
  | room_id     | uuid      | Foreign key → tbl_rooms.id (CASCADE delete) |
  | category    | text      | One of: 3c / cleaning / bedding / furniture |
  | name        | text      | Item name (e.g. "電視", "毛巾") |
  | quantity    | integer   | Number of units (default 1) |
  | status      | text      | Operational status (see below) |
  | notes       | text      | Optional staff notes |
  | created_at  | timestamptz | Row creation time |
  | updated_at  | timestamptz | Last update time |

  ## Status Values
  - 檢查 – needs inspection
  - 確認 – confirmed present & functional
  - 遺失 – missing
  - 損壞 – damaged
  - 清潔中 – being cleaned
  - 待補充 – needs restocking
  - 補充完畢 – restocked

  ## Security
  - RLS enabled
  - Authenticated admins (role IN admin/superadmin) have full CRUD access
  - Vendors can read and update items for rooms they own
  - No public access
*/

CREATE TABLE IF NOT EXISTS room_inventory_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     uuid NOT NULL REFERENCES tbl_rooms(id) ON DELETE CASCADE,
  category    text NOT NULL DEFAULT 'furniture',
  name        text NOT NULL DEFAULT '',
  quantity    integer NOT NULL DEFAULT 1,
  status      text NOT NULL DEFAULT '檢查',
  notes       text NOT NULL DEFAULT '',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS room_inventory_items_room_id_idx ON room_inventory_items(room_id);
CREATE INDEX IF NOT EXISTS room_inventory_items_category_idx ON room_inventory_items(category);

ALTER TABLE room_inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can select inventory"
  ON room_inventory_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE tbl_user_auth.user_id = auth.uid()
        AND tbl_user_auth.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admins can insert inventory"
  ON room_inventory_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE tbl_user_auth.user_id = auth.uid()
        AND tbl_user_auth.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admins can update inventory"
  ON room_inventory_items FOR UPDATE
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

CREATE POLICY "Admins can delete inventory"
  ON room_inventory_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE tbl_user_auth.user_id = auth.uid()
        AND tbl_user_auth.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Vendors can select own room inventory"
  ON room_inventory_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_rooms r
      JOIN vendors v ON v.id = r.vendor_id
      WHERE r.id = room_inventory_items.room_id
        AND v.user_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can update own room inventory"
  ON room_inventory_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_rooms r
      JOIN vendors v ON v.id = r.vendor_id
      WHERE r.id = room_inventory_items.room_id
        AND v.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tbl_rooms r
      JOIN vendors v ON v.id = r.vendor_id
      WHERE r.id = room_inventory_items.room_id
        AND v.user_id = auth.uid()
    )
  );

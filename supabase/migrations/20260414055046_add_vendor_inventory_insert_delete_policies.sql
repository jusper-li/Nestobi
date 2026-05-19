/*
  # Add Vendor Insert and Delete Policies for room_inventory_items

  ## Summary
  The original migration only gave vendors SELECT and UPDATE on room_inventory_items.
  Vendors could not add new items or delete items from their rooms' inventory.
  This migration adds the missing INSERT and DELETE policies for vendors.

  ## Security Changes
  - Vendors can INSERT inventory items into rooms they own
  - Vendors can DELETE inventory items from rooms they own
  - Ownership is verified via tbl_rooms → vendors → user_id join
*/

CREATE POLICY "Vendors can insert own room inventory"
  ON room_inventory_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tbl_rooms r
      JOIN vendors v ON v.id = r.vendor_id
      WHERE r.id = room_inventory_items.room_id
        AND v.user_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can delete own room inventory"
  ON room_inventory_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_rooms r
      JOIN vendors v ON v.id = r.vendor_id
      WHERE r.id = room_inventory_items.room_id
        AND v.user_id = auth.uid()
    )
  );

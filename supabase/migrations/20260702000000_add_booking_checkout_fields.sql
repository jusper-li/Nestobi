/*
  Add checkout fields used by the booking form and booking detail pages.
  These columns are written when a room booking is created and read later by
  the member booking detail page.
*/

ALTER TABLE tbl_bookings
  ADD COLUMN IF NOT EXISTS subtotal_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'service',
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS points_discount numeric NOT NULL DEFAULT 0;

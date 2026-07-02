/*
  The booking form uses "service" as the payment method for assisted booking.
  The existing check constraint only allowed online/points variants, which caused
  inserts to fail with a 400 response.
*/

ALTER TABLE tbl_bookings
  DROP CONSTRAINT IF EXISTS tbl_bookings_payment_method_check;

ALTER TABLE tbl_bookings
  ADD CONSTRAINT tbl_bookings_payment_method_check
  CHECK (payment_method = ANY (ARRAY['online'::text, 'service'::text, 'points'::text, 'points_online'::text]));

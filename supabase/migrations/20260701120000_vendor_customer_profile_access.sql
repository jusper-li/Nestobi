/*
  # Allow vendors to view customer profiles for their own bookings and orders

  Vendors need access to customer display names and phone numbers so they can
  manage bookings and product orders without exposing unrelated member data.

  This policy keeps the scope limited to:
  - the vendor's own room bookings
  - the vendor's own product orders
  - the member's own profile
  - admins/superadmins
*/

DROP POLICY IF EXISTS "Vendors can view customer profiles for own orders" ON public.tbl_mn5wgzh0;
CREATE POLICY "Vendors can view customer profiles for own orders"
  ON public.tbl_mn5wgzh0
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR private.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.tbl_bookings b
      JOIN public.tbl_rooms r ON r.id = b.room_id
      JOIN public.vendors v ON v.id = r.vendor_id
      WHERE b.user_id = tbl_mn5wgzh0.user_id
        AND v.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.orders o
      JOIN public.purchase_records pr ON pr.order_id = o.id
      JOIN public.products p ON p.id = pr.product_id
      JOIN public.vendors v ON v.id = p.vendor_id
      WHERE o.user_id = tbl_mn5wgzh0.user_id
        AND v.user_id = auth.uid()
    )
  );

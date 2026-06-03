/*
  # Vendor and admin engagement management policies

  Allows vendors to manage engagement records connected to their own products
  and rooms, while admins keep global access through existing private.is_admin().
*/

GRANT SELECT ON public.product_reviews TO anon, authenticated;
GRANT SELECT, UPDATE ON public.product_reviews TO authenticated;
GRANT SELECT, UPDATE ON public.room_reviews TO authenticated;
GRANT SELECT ON public.member_favorites TO authenticated;
GRANT SELECT, UPDATE ON public.after_sales_requests TO authenticated;

DROP POLICY IF EXISTS "vendors read own product reviews" ON public.product_reviews;
CREATE POLICY "vendors read own product reviews"
  ON public.product_reviews
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.products
      JOIN public.vendors ON vendors.id = products.vendor_id
      WHERE products.id = product_reviews.product_id
        AND vendors.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "vendors update own product reviews" ON public.product_reviews;
CREATE POLICY "vendors update own product reviews"
  ON public.product_reviews
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.products
      JOIN public.vendors ON vendors.id = products.vendor_id
      WHERE products.id = product_reviews.product_id
        AND vendors.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.products
      JOIN public.vendors ON vendors.id = products.vendor_id
      WHERE products.id = product_reviews.product_id
        AND vendors.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "vendors read own room reviews" ON public.room_reviews;
CREATE POLICY "vendors read own room reviews"
  ON public.room_reviews
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tbl_rooms
      JOIN public.vendors ON vendors.id = tbl_rooms.vendor_id
      WHERE tbl_rooms.id = room_reviews.room_id
        AND vendors.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "vendors update own room reviews" ON public.room_reviews;
CREATE POLICY "vendors update own room reviews"
  ON public.room_reviews
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tbl_rooms
      JOIN public.vendors ON vendors.id = tbl_rooms.vendor_id
      WHERE tbl_rooms.id = room_reviews.room_id
        AND vendors.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.tbl_rooms
      JOIN public.vendors ON vendors.id = tbl_rooms.vendor_id
      WHERE tbl_rooms.id = room_reviews.room_id
        AND vendors.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "vendors read own target favorites" ON public.member_favorites;
CREATE POLICY "vendors read own target favorites"
  ON public.member_favorites
  FOR SELECT
  TO authenticated
  USING (
    (
      target_type = 'product'
      AND EXISTS (
        SELECT 1
        FROM public.products
        JOIN public.vendors ON vendors.id = products.vendor_id
        WHERE products.id = member_favorites.target_id
          AND vendors.user_id = auth.uid()
      )
    )
    OR (
      target_type = 'room'
      AND EXISTS (
        SELECT 1
        FROM public.tbl_rooms
        JOIN public.vendors ON vendors.id = tbl_rooms.vendor_id
        WHERE tbl_rooms.id = member_favorites.target_id
          AND vendors.user_id = auth.uid()
      )
    )
    OR (
      target_type = 'hotel'
      AND EXISTS (
        SELECT 1
        FROM public.hotels
        JOIN public.vendors ON vendors.id = hotels.vendor_id
        WHERE hotels.id = member_favorites.target_id
          AND vendors.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "vendors read own order after sales requests" ON public.after_sales_requests;
CREATE POLICY "vendors read own order after sales requests"
  ON public.after_sales_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.purchase_records
      JOIN public.products ON products.id = purchase_records.product_id
      JOIN public.vendors ON vendors.id = products.vendor_id
      WHERE purchase_records.order_id = after_sales_requests.order_id
        AND vendors.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "vendors update own order after sales requests" ON public.after_sales_requests;
CREATE POLICY "vendors update own order after sales requests"
  ON public.after_sales_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.purchase_records
      JOIN public.products ON products.id = purchase_records.product_id
      JOIN public.vendors ON vendors.id = products.vendor_id
      WHERE purchase_records.order_id = after_sales_requests.order_id
        AND vendors.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.purchase_records
      JOIN public.products ON products.id = purchase_records.product_id
      JOIN public.vendors ON vendors.id = products.vendor_id
      WHERE purchase_records.order_id = after_sales_requests.order_id
        AND vendors.user_id = auth.uid()
    )
  );

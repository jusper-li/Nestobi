/*
  # Harden member, vendor, admin operation policies

  Client route guards are only UX. These policies keep ownership and role checks
  in Postgres for member orders/bookings/favorites/points and vendor updates.
*/

REVOKE INSERT, UPDATE, DELETE ON public.points FROM anon;
REVOKE UPDATE, DELETE ON public.points FROM authenticated;
GRANT SELECT, INSERT ON public.points TO authenticated;

DROP POLICY IF EXISTS "System can insert points" ON public.points;
DROP POLICY IF EXISTS "Users can insert own validated point ledger rows" ON public.points;
CREATE POLICY "Users can insert own validated point ledger rows"
  ON public.points
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (
      private.is_admin()
      OR (
        transaction_type IN ('earn', 'spent')
        AND source_type IN ('booking', 'order')
        AND source_id IS NOT NULL
        AND reference_id = source_id
        AND (
          (
            source_type = 'booking'
            AND EXISTS (
              SELECT 1
              FROM public.tbl_bookings
              WHERE tbl_bookings.id = points.source_id
                AND tbl_bookings.user_id = (SELECT auth.uid())
                AND (
                  (points.amount > 0 AND points.amount <= floor(tbl_bookings.total_price / 100) * 10)
                  OR
                  (points.amount < 0 AND abs(points.amount) <= tbl_bookings.total_price)
                )
            )
          )
          OR
          (
            source_type = 'order'
            AND EXISTS (
              SELECT 1
              FROM public.orders
              WHERE orders.id = points.source_id
                AND orders.user_id = (SELECT auth.uid())
                AND (
                  (points.amount > 0 AND points.amount <= floor(orders.total_amount / 100) * 5)
                  OR
                  (points.amount < 0 AND abs(points.amount) <= orders.total_amount)
                )
            )
          )
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
CREATE POLICY "Users can insert own orders"
  ON public.orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND total_amount >= 0
    AND status IN ('pending', 'processing', 'completed')
    AND payment_status IN ('unpaid', 'paid')
  );

DROP POLICY IF EXISTS "Users and admins can update orders" ON public.orders;
CREATE POLICY "Users and admins can update orders"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "System can insert purchase records" ON public.purchase_records;
CREATE POLICY "Users can insert own purchase records for own orders"
  ON public.purchase_records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND quantity > 0
    AND unit_price >= 0
    AND total_price >= 0
    AND EXISTS (
      SELECT 1
      FROM public.orders
      WHERE orders.id = purchase_records.order_id
        AND orders.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own bookings" ON public.tbl_bookings;
CREATE POLICY "Users can cancel own bookings"
  ON public.tbl_bookings
  FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR private.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.tbl_rooms
      JOIN public.vendors ON vendors.id = tbl_rooms.vendor_id
      WHERE tbl_rooms.id = tbl_bookings.room_id
        AND vendors.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    private.is_admin()
    OR (
      user_id = (SELECT auth.uid())
      AND status = 'cancelled'
    )
    OR EXISTS (
      SELECT 1
      FROM public.tbl_rooms
      JOIN public.vendors ON vendors.id = tbl_rooms.vendor_id
      WHERE tbl_rooms.id = tbl_bookings.room_id
        AND vendors.user_id = (SELECT auth.uid())
        AND tbl_bookings.status IN ('pending', 'confirmed', 'cancelled', 'completed')
    )
  );

DROP POLICY IF EXISTS "Users can insert own bookings" ON public.tbl_bookings;
CREATE POLICY "Users can insert own bookings"
  ON public.tbl_bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND total_price >= 0
    AND guests > 0
    AND check_out_date > check_in_date
    AND status IN ('pending', 'confirmed')
  );

DROP POLICY IF EXISTS "users create own member favorites" ON public.member_favorites;
CREATE POLICY "users create own member favorites"
  ON public.member_favorites
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND target_type IN ('product', 'blog_post', 'room', 'hotel')
  );

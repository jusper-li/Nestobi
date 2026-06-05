/*
  # Add points payment support

  Stores original totals and points discounts for bookings and shop orders so
  full points payment can pass database validation without relying on frontend
  clamps alone.
*/

ALTER TABLE public.tbl_bookings
  ADD COLUMN IF NOT EXISTS subtotal_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS points_discount integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'paid';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS subtotal_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS points_discount integer NOT NULL DEFAULT 0;

UPDATE public.tbl_bookings
SET subtotal_price = total_price
WHERE subtotal_price = 0 AND total_price > 0;

UPDATE public.orders
SET subtotal_amount = total_amount
WHERE subtotal_amount = 0 AND total_amount > 0;

ALTER TABLE public.tbl_bookings
  DROP CONSTRAINT IF EXISTS tbl_bookings_points_discount_check,
  DROP CONSTRAINT IF EXISTS tbl_bookings_payment_method_check,
  DROP CONSTRAINT IF EXISTS tbl_bookings_payment_status_check;

ALTER TABLE public.tbl_bookings
  ADD CONSTRAINT tbl_bookings_points_discount_check
    CHECK (points_discount >= 0 AND points_discount <= subtotal_price),
  ADD CONSTRAINT tbl_bookings_payment_method_check
    CHECK (payment_method IN ('online', 'points', 'points_online')),
  ADD CONSTRAINT tbl_bookings_payment_status_check
    CHECK (payment_status IN ('unpaid', 'paid', 'refunded'));

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_points_discount_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_points_discount_check
    CHECK (points_discount >= 0 AND points_discount <= subtotal_amount);

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
              LEFT JOIN public.member_point_balances
                ON member_point_balances.user_id = (SELECT auth.uid())
              WHERE tbl_bookings.id = points.source_id
                AND tbl_bookings.user_id = (SELECT auth.uid())
                AND (
                  (
                    points.amount > 0
                    AND points.amount <= floor(tbl_bookings.total_price / 100) * 10
                  )
                  OR
                  (
                    points.amount < 0
                    AND abs(points.amount) = tbl_bookings.points_discount
                    AND abs(points.amount) <= tbl_bookings.subtotal_price
                    AND abs(points.amount) <= (
                      coalesce(member_point_balances.current_points, 0)
                      - coalesce((
                        SELECT sum(existing.amount)
                        FROM public.points existing
                        WHERE existing.user_id = (SELECT auth.uid())
                          AND existing.source_type = 'booking'
                          AND existing.source_id = points.source_id
                          AND existing.amount > 0
                      ), 0)
                    )
                  )
                )
            )
          )
          OR
          (
            source_type = 'order'
            AND EXISTS (
              SELECT 1
              FROM public.orders
              LEFT JOIN public.member_point_balances
                ON member_point_balances.user_id = (SELECT auth.uid())
              WHERE orders.id = points.source_id
                AND orders.user_id = (SELECT auth.uid())
                AND (
                  (
                    points.amount > 0
                    AND points.amount <= floor(orders.total_amount / 100) * 5
                  )
                  OR
                  (
                    points.amount < 0
                    AND abs(points.amount) = orders.points_discount
                    AND abs(points.amount) <= orders.subtotal_amount
                    AND abs(points.amount) <= (
                      coalesce(member_point_balances.current_points, 0)
                      - coalesce((
                        SELECT sum(existing.amount)
                        FROM public.points existing
                        WHERE existing.user_id = (SELECT auth.uid())
                          AND existing.source_type = 'order'
                          AND existing.source_id = points.source_id
                          AND existing.amount > 0
                      ), 0)
                    )
                  )
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
    AND subtotal_amount >= total_amount
    AND points_discount >= 0
    AND points_discount <= subtotal_amount
    AND total_amount = subtotal_amount - points_discount
    AND status IN ('pending', 'processing', 'completed')
    AND payment_status IN ('unpaid', 'paid')
    AND payment_method IN ('credit_card', 'points', 'points_credit_card')
  );

DROP POLICY IF EXISTS "Users can insert own bookings" ON public.tbl_bookings;
CREATE POLICY "Users can insert own bookings"
  ON public.tbl_bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND total_price >= 0
    AND subtotal_price >= total_price
    AND points_discount >= 0
    AND points_discount <= subtotal_price
    AND total_price = subtotal_price - points_discount
    AND guests > 0
    AND check_out_date > check_in_date
    AND status IN ('pending', 'confirmed')
    AND payment_method IN ('online', 'points', 'points_online')
    AND payment_status IN ('unpaid', 'paid')
  );

CREATE OR REPLACE FUNCTION private.sync_booking_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  current_balance integer := 0;
  booking_vendor_id uuid;
  earned_points integer := 0;
BEGIN
  IF NEW.points_discount < 0 THEN
    RAISE EXCEPTION 'Booking point discount cannot be negative';
  END IF;

  IF NEW.points_discount > 0 THEN
    SELECT COALESCE(current_points, 0)
    INTO current_balance
    FROM public.member_point_balances
    WHERE user_id = NEW.user_id
    FOR UPDATE;

    IF COALESCE(current_balance, 0) < NEW.points_discount THEN
      RAISE EXCEPTION 'Insufficient points for booking';
    END IF;
  END IF;

  SELECT vendor_id
  INTO booking_vendor_id
  FROM public.tbl_rooms
  WHERE id = NEW.room_id;

  IF NEW.points_discount > 0
    AND NOT EXISTS (
      SELECT 1
      FROM public.points
      WHERE source_type = 'booking'
        AND source_id = NEW.id
        AND transaction_type = 'spent'
        AND amount < 0
    )
  THEN
    INSERT INTO public.points (
      user_id,
      amount,
      transaction_type,
      reference_id,
      source_type,
      source_id,
      vendor_id,
      description
    )
    VALUES (
      NEW.user_id,
      -NEW.points_discount,
      'spent',
      NEW.id,
      'booking',
      NEW.id,
      booking_vendor_id,
      'Booking points redemption'
    );
  END IF;

  earned_points := public.calculate_point_reward_points('booking', NEW.total_price);

  IF earned_points > 0
    AND NOT EXISTS (
      SELECT 1
      FROM public.points
      WHERE source_type = 'booking'
        AND source_id = NEW.id
        AND transaction_type = 'earned'
        AND amount > 0
    )
  THEN
    INSERT INTO public.points (
      user_id,
      amount,
      transaction_type,
      reference_id,
      source_type,
      source_id,
      vendor_id,
      description
    )
    VALUES (
      NEW.user_id,
      earned_points,
      'earned',
      NEW.id,
      'booking',
      NEW.id,
      booking_vendor_id,
      'Booking reward points'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_booking_points ON public.tbl_bookings;
CREATE TRIGGER trg_sync_booking_points
  AFTER INSERT ON public.tbl_bookings
  FOR EACH ROW
  EXECUTE FUNCTION private.sync_booking_points();

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
        transaction_type IN ('earned', 'spent')
        AND source_type = 'order'
        AND source_id IS NOT NULL
        AND reference_id = source_id
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
                AND points.transaction_type = 'earned'
                AND points.amount <= floor(orders.total_amount / 100) * 5
              )
              OR (
                points.amount < 0
                AND points.transaction_type = 'spent'
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
  );

WITH missing_booking_points AS (
  SELECT
    b.id,
    b.user_id,
    b.room_id,
    b.total_price,
    b.points_discount,
    COALESCE(m.current_points, 0) AS current_points,
    r.vendor_id
  FROM public.tbl_bookings b
  LEFT JOIN public.member_point_balances m ON m.user_id = b.user_id
  LEFT JOIN public.tbl_rooms r ON r.id = b.room_id
  WHERE b.points_discount > 0
    AND NOT EXISTS (
      SELECT 1
      FROM public.points p
      WHERE p.source_type = 'booking'
        AND p.source_id = b.id
        AND p.transaction_type = 'spent'
        AND p.amount < 0
    )
)
INSERT INTO public.points (
  user_id,
  amount,
  transaction_type,
  reference_id,
  source_type,
  source_id,
  vendor_id,
  description
)
SELECT
  user_id,
  -points_discount,
  'spent',
  id,
  'booking',
  id,
  vendor_id,
  'Booking points redemption'
FROM missing_booking_points
WHERE current_points >= points_discount;

WITH missing_booking_rewards AS (
  SELECT
    b.id,
    b.user_id,
    b.room_id,
    (floor(b.total_price / 100) * 10)::integer AS earned_points,
    r.vendor_id
  FROM public.tbl_bookings b
  LEFT JOIN public.tbl_rooms r ON r.id = b.room_id
  WHERE b.points_discount > 0
    AND b.total_price > 0
    AND NOT EXISTS (
      SELECT 1
      FROM public.points p
      WHERE p.source_type = 'booking'
        AND p.source_id = b.id
        AND p.transaction_type = 'earned'
        AND p.amount > 0
    )
)
INSERT INTO public.points (
  user_id,
  amount,
  transaction_type,
  reference_id,
  source_type,
  source_id,
  vendor_id,
  description
)
SELECT
  user_id,
  earned_points,
  'earned',
  id,
  'booking',
  id,
  vendor_id,
  'Booking reward points'
FROM missing_booking_rewards
WHERE earned_points > 0;

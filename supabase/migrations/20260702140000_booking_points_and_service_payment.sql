/*
  # Booking payment options: points payment and service support

  - Allows booking payment_method to store service support for manual follow-up.
  - Keeps legacy online values valid so historic bookings remain editable.
  - Prevents points rewards / deductions from running for unpaid service requests.
*/

ALTER TABLE public.tbl_bookings
  ALTER COLUMN payment_method SET DEFAULT 'service',
  ALTER COLUMN payment_status SET DEFAULT 'unpaid';

ALTER TABLE public.tbl_bookings
  DROP CONSTRAINT IF EXISTS tbl_bookings_payment_method_check,
  DROP CONSTRAINT IF EXISTS tbl_bookings_payment_status_check;

ALTER TABLE public.tbl_bookings
  ADD CONSTRAINT tbl_bookings_payment_method_check
    CHECK (payment_method IN ('points', 'service', 'online', 'points_online')),
  ADD CONSTRAINT tbl_bookings_payment_status_check
    CHECK (payment_status IN ('unpaid', 'paid', 'refunded'));

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
    AND payment_method IN ('points', 'service', 'online', 'points_online')
    AND payment_status IN ('unpaid', 'paid')
  );

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
  IF NEW.payment_status = 'paid' AND NEW.points_discount < 0 THEN
    RAISE EXCEPTION 'Booking point discount cannot be negative';
  END IF;

  IF NEW.payment_status = 'paid' AND NEW.points_discount > 0 THEN
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

  IF NEW.payment_status = 'paid'
    AND NEW.points_discount > 0
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

  IF NEW.payment_status = 'paid' THEN
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
  END IF;

  RETURN NEW;
END;
$$;

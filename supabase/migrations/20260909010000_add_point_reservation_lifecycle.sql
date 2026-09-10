/* Point reservation lifecycle for shop orders. Reserve before payment, capture after success. */

ALTER TABLE public.member_point_balances
  ADD COLUMN IF NOT EXISTS reserved_points integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.lookup_member_points(p_phone text DEFAULT NULL, p_email text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE v_user_id uuid := auth.uid(); v_profile public.tbl_mn5wgzh0%ROWTYPE; v_email text; v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_profile FROM public.tbl_mn5wgzh0 WHERE user_id = v_user_id;
  SELECT coalesce(email, '') INTO v_email FROM auth.users WHERE id = v_user_id;
  IF v_phone <> '' AND regexp_replace(coalesce(v_profile.phone, ''), '[^0-9+]', '', 'g') <> v_phone THEN RETURN jsonb_build_object('success', true, 'matched', false); END IF;
  IF nullif(trim(coalesce(p_email, '')), '') IS NOT NULL AND lower(trim(p_email)) <> lower(v_email) THEN RETURN jsonb_build_object('success', true, 'matched', false); END IF;
  RETURN jsonb_build_object('success', true, 'matched', true, 'maskedPhone', CASE WHEN length(coalesce(v_profile.phone, '')) >= 7 THEN left(v_profile.phone, 2) || '•••••' || right(v_profile.phone, 3) ELSE NULL END, 'maskedEmail', CASE WHEN position('@' in v_email) > 2 THEN left(v_email, 2) || '••••@' || split_part(v_email, '@', 2) ELSE NULL END, 'availablePoints', (SELECT greatest(0, coalesce(current_points, 0) - coalesce(reserved_points, 0)) FROM public.member_point_balances WHERE user_id = v_user_id));
END;
$$;

CREATE OR REPLACE FUNCTION public.create_point_redemption_session(p_requested_points integer, p_channel text DEFAULT 'email')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE v_user_id uuid := auth.uid(); v_balance integer; v_subtotal numeric; v_points integer; v_session uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_channel NOT IN ('email', 'sms') THEN RAISE EXCEPTION 'Unsupported verification channel'; END IF;
  SELECT greatest(0, coalesce(current_points, 0) - coalesce(reserved_points, 0)) INTO v_balance FROM public.member_point_balances WHERE user_id = v_user_id FOR UPDATE;
  SELECT coalesce(sum(p.price * c.quantity), 0) INTO v_subtotal FROM public.tbl_mn5uxems c JOIN public.products p ON p.id = c.product_id WHERE c.user_id = v_user_id AND p.is_active = true AND coalesce(p.stock_quantity, 0) >= c.quantity;
  v_points := least(greatest(coalesce(p_requested_points, 0), 0), v_balance, floor(v_subtotal)::integer);
  IF v_points <= 0 THEN RAISE EXCEPTION 'No redeemable points'; END IF;
  UPDATE public.point_redemption_sessions SET status = 'expired' WHERE user_id = v_user_id AND status IN ('pending_otp', 'verified') AND expires_at <= now();
  INSERT INTO public.point_redemption_sessions(user_id, requested_points, calculated_discount, verification_channel) VALUES (v_user_id, v_points, v_points, p_channel) RETURNING id INTO v_session;
  RETURN jsonb_build_object('success', true, 'sessionId', v_session, 'requestedPoints', v_points, 'discountAmount', v_points, 'availablePoints', v_balance);
END;
$$;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS points_reservation_id uuid;

ALTER TABLE public.point_redemption_sessions
  DROP CONSTRAINT IF EXISTS point_redemption_sessions_status_check;
ALTER TABLE public.point_redemption_sessions
  ADD CONSTRAINT point_redemption_sessions_status_check
  CHECK (status IN ('pending_otp', 'verified', 'reserved', 'redeemed', 'cancelled', 'expired'));

CREATE TABLE IF NOT EXISTS public.point_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  redemption_session_id uuid REFERENCES public.point_redemption_sessions(id) ON DELETE SET NULL,
  otp_request_id uuid REFERENCES public.point_otp_requests(id) ON DELETE SET NULL,
  points integer NOT NULL CHECK (points > 0),
  discount_amount numeric NOT NULL CHECK (discount_amount > 0),
  status text NOT NULL DEFAULT 'reserved'
    CHECK (status IN ('reserved', 'captured', 'released', 'expired', 'refunded')),
  balance_before integer,
  balance_after integer,
  reserved_at timestamptz NOT NULL DEFAULT now(),
  captured_at timestamptz,
  released_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '20 minutes'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(order_id),
  UNIQUE(redemption_session_id)
);

CREATE INDEX IF NOT EXISTS point_reservations_member_status_idx
  ON public.point_reservations(member_id, status, expires_at);
CREATE INDEX IF NOT EXISTS point_reservations_order_idx
  ON public.point_reservations(order_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_points_reservation_id_fkey'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_points_reservation_id_fkey
      FOREIGN KEY (points_reservation_id) REFERENCES public.point_reservations(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.point_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.point_reservations FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.reserve_member_points_for_order(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_session public.point_redemption_sessions%ROWTYPE;
  v_balance public.member_point_balances%ROWTYPE;
  v_reservation public.point_reservations%ROWTYPE;
  v_available integer;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF v_order.id IS NULL OR coalesce(v_order.points_discount, 0) <= 0 THEN
    RETURN jsonb_build_object('success', true, 'reserved', false);
  END IF;

  SELECT * INTO v_reservation FROM public.point_reservations WHERE order_id = p_order_id FOR UPDATE;
  IF v_reservation.id IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'reserved', true, 'reservationId', v_reservation.id, 'status', v_reservation.status);
  END IF;

  SELECT * INTO v_balance FROM public.member_point_balances WHERE user_id = v_order.user_id FOR UPDATE;
  v_available := coalesce(v_balance.current_points, 0) - coalesce(v_balance.reserved_points, 0);
  IF v_available < v_order.points_discount THEN RAISE EXCEPTION 'INSUFFICIENT_POINTS'; END IF;

  SELECT * INTO v_session
  FROM public.point_redemption_sessions
  WHERE user_id = v_order.user_id
    AND status = 'verified'
    AND requested_points = v_order.points_discount
    AND expires_at > now()
  ORDER BY verified_at DESC NULLS LAST
  LIMIT 1
  FOR UPDATE;
  IF v_session.id IS NULL THEN RAISE EXCEPTION 'VERIFIED_POINT_SESSION_REQUIRED'; END IF;

  INSERT INTO public.point_reservations (
    member_id, order_id, redemption_session_id, points, discount_amount,
    status, balance_before, balance_after, expires_at
  ) VALUES (
    v_order.user_id, v_order.id, v_session.id, v_order.points_discount,
    v_order.points_discount, 'reserved', v_available,
    v_available - v_order.points_discount, now() + interval '20 minutes'
  ) RETURNING * INTO v_reservation;

  UPDATE public.member_point_balances
  SET reserved_points = reserved_points + v_reservation.points, updated_at = now()
  WHERE user_id = v_order.user_id;
  UPDATE public.point_redemption_sessions SET status = 'reserved' WHERE id = v_session.id;
  UPDATE public.point_otp_requests SET used_at = now()
  WHERE session_id = v_session.id AND verified_at IS NOT NULL AND used_at IS NULL;
  UPDATE public.orders SET points_reservation_id = v_reservation.id WHERE id = v_order.id;
  INSERT INTO public.point_audit_logs(user_id, session_id, action, status, points, discount_amount, metadata)
  VALUES (v_order.user_id, v_session.id, 'redeem', 'reserved', v_reservation.points, v_reservation.discount_amount, jsonb_build_object('order_id', v_order.id, 'reservation_id', v_reservation.id));
  RETURN jsonb_build_object('success', true, 'reserved', true, 'reservationId', v_reservation.id, 'points', v_reservation.points, 'discountAmount', v_reservation.discount_amount);
END;
$$;

CREATE OR REPLACE FUNCTION public.capture_member_points(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_res public.point_reservations%ROWTYPE;
  v_balance public.member_point_balances%ROWTYPE;
  v_tx_id uuid;
BEGIN
  SELECT * INTO v_res FROM public.point_reservations WHERE order_id = p_order_id FOR UPDATE;
  IF v_res.id IS NULL THEN RETURN jsonb_build_object('success', true, 'captured', false, 'reason', 'no_reservation'); END IF;
  IF v_res.status = 'captured' THEN RETURN jsonb_build_object('success', true, 'captured', true, 'reservationId', v_res.id, 'idempotent', true); END IF;
  IF v_res.status <> 'reserved' THEN RAISE EXCEPTION 'RESERVATION_NOT_CAPTUREABLE'; END IF;
  IF v_res.expires_at <= now() THEN RAISE EXCEPTION 'RESERVATION_EXPIRED'; END IF;
  SELECT * INTO v_balance FROM public.member_point_balances WHERE user_id = v_res.member_id FOR UPDATE;
  IF coalesce(v_balance.reserved_points, 0) < v_res.points THEN RAISE EXCEPTION 'RESERVED_POINTS_MISMATCH'; END IF;
  INSERT INTO public.points(user_id, amount, transaction_type, reference_id, source_type, source_id, description)
  VALUES (v_res.member_id, -v_res.points, 'spent', p_order_id, 'redemption', v_res.id, 'Shop points redeem')
  RETURNING id INTO v_tx_id;
  UPDATE public.member_point_balances SET reserved_points = reserved_points - v_res.points, updated_at = now() WHERE user_id = v_res.member_id;
  UPDATE public.point_reservations SET status = 'captured', captured_at = now(), updated_at = now(), balance_after = v_balance.current_points - v_res.points WHERE id = v_res.id;
  UPDATE public.point_redemption_sessions SET status = 'redeemed', redeemed_at = now() WHERE id = v_res.redemption_session_id;
  INSERT INTO public.point_audit_logs(user_id, session_id, action, status, points, discount_amount, metadata)
  VALUES (v_res.member_id, v_res.redemption_session_id, 'redeem', 'captured', v_res.points, v_res.discount_amount, jsonb_build_object('order_id', p_order_id, 'reservation_id', v_res.id, 'transaction_id', v_tx_id));
  RETURN jsonb_build_object('success', true, 'captured', true, 'reservationId', v_res.id, 'transactionId', v_tx_id, 'points', v_res.points);
END;
$$;

CREATE OR REPLACE FUNCTION public.release_member_points(p_order_id uuid, p_reason text DEFAULT 'payment_failed')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE v_res public.point_reservations%ROWTYPE;
BEGIN
  SELECT * INTO v_res FROM public.point_reservations WHERE order_id = p_order_id FOR UPDATE;
  IF v_res.id IS NULL THEN RETURN jsonb_build_object('success', true, 'released', false, 'reason', 'no_reservation'); END IF;
  IF v_res.status IN ('released', 'expired') THEN RETURN jsonb_build_object('success', true, 'released', true, 'idempotent', true, 'status', v_res.status); END IF;
  IF v_res.status <> 'reserved' THEN RAISE EXCEPTION 'RESERVATION_NOT_RELEASEABLE'; END IF;
  UPDATE public.member_point_balances SET reserved_points = greatest(0, reserved_points - v_res.points), updated_at = now() WHERE user_id = v_res.member_id;
  UPDATE public.point_reservations SET status = CASE WHEN p_reason = 'expired' THEN 'expired' ELSE 'released' END, released_at = now(), updated_at = now(), metadata = metadata || jsonb_build_object('reason', p_reason) WHERE id = v_res.id;
  UPDATE public.point_redemption_sessions SET status = 'cancelled' WHERE id = v_res.redemption_session_id AND status = 'reserved';
  INSERT INTO public.point_audit_logs(user_id, session_id, action, status, points, discount_amount, metadata)
  VALUES (v_res.member_id, v_res.redemption_session_id, 'release', CASE WHEN p_reason = 'expired' THEN 'expired' ELSE 'released' END, v_res.points, v_res.discount_amount, jsonb_build_object('order_id', p_order_id, 'reservation_id', v_res.id, 'reason', p_reason));
  RETURN jsonb_build_object('success', true, 'released', true, 'reservationId', v_res.id, 'points', v_res.points);
END;
$$;

CREATE OR REPLACE FUNCTION public.release_expired_point_reservations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE v_res public.point_reservations%ROWTYPE; v_count integer := 0;
BEGIN
  FOR v_res IN SELECT * FROM public.point_reservations WHERE status = 'reserved' AND expires_at <= now() FOR UPDATE SKIP LOCKED LOOP
    PERFORM public.release_member_points(v_res.order_id, 'expired');
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_member_points(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE v_res public.point_reservations%ROWTYPE; v_tx_id uuid; v_balance public.member_point_balances%ROWTYPE;
BEGIN
  SELECT * INTO v_res FROM public.point_reservations WHERE order_id = p_order_id FOR UPDATE;
  IF v_res.id IS NULL THEN RETURN jsonb_build_object('success', true, 'refunded', false, 'reason', 'no_reservation'); END IF;
  IF v_res.status = 'refunded' THEN RETURN jsonb_build_object('success', true, 'refunded', true, 'idempotent', true, 'reservationId', v_res.id); END IF;
  IF v_res.status <> 'captured' THEN RAISE EXCEPTION 'RESERVATION_NOT_REFUNDABLE'; END IF;
  SELECT * INTO v_balance FROM public.member_point_balances WHERE user_id = v_res.member_id FOR UPDATE;
  INSERT INTO public.points(user_id, amount, transaction_type, reference_id, source_type, source_id, description)
  VALUES (v_res.member_id, v_res.points, 'earned', p_order_id, 'redemption', v_res.id, 'Shop points refund') RETURNING id INTO v_tx_id;
  UPDATE public.point_reservations SET status = 'refunded', updated_at = now(), metadata = metadata || jsonb_build_object('refund_transaction_id', v_tx_id) WHERE id = v_res.id;
  INSERT INTO public.point_audit_logs(user_id, session_id, action, status, points, discount_amount, metadata)
  VALUES (v_res.member_id, v_res.redemption_session_id, 'refund', 'refunded', v_res.points, v_res.discount_amount, jsonb_build_object('order_id', p_order_id, 'reservation_id', v_res.id, 'transaction_id', v_tx_id));
  RETURN jsonb_build_object('success', true, 'refunded', true, 'reservationId', v_res.id, 'transactionId', v_tx_id, 'points', v_res.points);
END;
$$;

CREATE OR REPLACE FUNCTION private.reserve_shop_order_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF NEW.points_discount > 0 AND NEW.payment_method IN ('credit_card', 'points_credit_card', 'points') THEN
    PERFORM public.reserve_member_points_for_order(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reserve_shop_order_points ON public.orders;
CREATE TRIGGER trg_reserve_shop_order_points
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION private.reserve_shop_order_points();

CREATE OR REPLACE FUNCTION private.require_verified_shop_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF NEW.description = 'Shop points discount' AND NEW.amount < 0 THEN
    IF EXISTS (SELECT 1 FROM public.point_reservations WHERE order_id = NEW.reference_id AND status = 'reserved') THEN
      RETURN NULL;
    END IF;
    RAISE EXCEPTION 'Point reservation required';
  END IF;
  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reserve_member_points_for_order(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.capture_member_points(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_member_points(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_expired_point_reservations() TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_member_points(uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.reserve_member_points_for_order(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.capture_member_points(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_member_points(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_expired_point_reservations() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refund_member_points(uuid) FROM PUBLIC, anon, authenticated;

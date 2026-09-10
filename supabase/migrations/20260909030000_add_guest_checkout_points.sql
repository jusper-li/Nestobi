/* Guest checkout and OTP-authorized points redemption. */

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS guest_checkout_token text,
  ADD COLUMN IF NOT EXISTS points_member_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS orders_guest_checkout_token_idx
  ON public.orders(guest_checkout_token)
  WHERE guest_checkout_token IS NOT NULL;

ALTER TABLE public.point_redemption_sessions
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS member_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS guest_checkout_token text;

ALTER TABLE public.point_otp_requests
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS member_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS guest_checkout_token text;

ALTER TABLE public.point_reservations
  ADD COLUMN IF NOT EXISTS guest_checkout_token text;

CREATE TABLE IF NOT EXISTS public.point_member_lookup_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  member_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  identifier_hash text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS point_member_lookup_tokens_expiry_idx
  ON public.point_member_lookup_tokens(expires_at);
ALTER TABLE public.point_member_lookup_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.point_member_lookup_tokens FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.lookup_guest_member(p_phone text DEFAULT NULL, p_email text DEFAULT NULL)
RETURNS TABLE(member_id uuid, member_email text, available_points integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private
AS $$
DECLARE v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
BEGIN
  IF v_phone = '' AND nullif(trim(coalesce(p_email, '')), '') IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT u.id,
    coalesce(u.email, ''),
    greatest(0, coalesce(b.current_points, 0) - coalesce(b.reserved_points, 0))
  FROM auth.users u
  LEFT JOIN public.tbl_mn5wgzh0 p ON p.user_id = u.id
  LEFT JOIN public.member_point_balances b ON b.user_id = u.id
  WHERE (v_phone <> '' AND regexp_replace(coalesce(p.phone, ''), '[^0-9+]', '', 'g') = v_phone)
     OR (nullif(trim(coalesce(p_email, '')), '') IS NOT NULL AND lower(u.email) = lower(trim(p_email)))
  ORDER BY u.created_at
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_guest_shop_checkout_order(
  p_merchant_order_no text,
  p_guest_checkout_token text,
  p_shipping_name text,
  p_shipping_phone text,
  p_shipping_email text,
  p_shipping_address text,
  p_items jsonb,
  p_point_session_id uuid DEFAULT NULL,
  p_points_to_use integer DEFAULT 0
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private
AS $$
DECLARE
  v_order_id uuid; v_subtotal numeric := 0; v_points integer := 0; v_total numeric := 0;
  v_member_id uuid; v_session public.point_redemption_sessions%ROWTYPE;
  v_balance public.member_point_balances%ROWTYPE; v_res public.point_reservations%ROWTYPE;
  v_items jsonb := '[]'::jsonb; v_item_count integer := 0;
BEGIN
  IF nullif(trim(p_merchant_order_no), '') IS NULL OR nullif(trim(p_guest_checkout_token), '') IS NULL THEN RAISE EXCEPTION 'Guest checkout token is required'; END IF;
  IF nullif(trim(p_shipping_name), '') IS NULL OR nullif(trim(p_shipping_phone), '') IS NULL OR nullif(trim(p_shipping_email), '') IS NULL THEN RAISE EXCEPTION 'Name, phone, and email are required'; END IF;
  IF nullif(trim(p_shipping_address), '') IS NULL THEN RAISE EXCEPTION 'Shipping address is required'; END IF;
  IF EXISTS (SELECT 1 FROM public.orders WHERE merchant_order_no = trim(p_merchant_order_no)) THEN RAISE EXCEPTION 'Duplicate merchant order number'; END IF;

  SELECT coalesce(sum(p.price * x.quantity), 0), count(*), coalesce(jsonb_agg(jsonb_build_object(
    'product_id', p.id, 'name', p.name, 'quantity', x.quantity, 'unit_price', p.price,
    'total_price', p.price * x.quantity) ORDER BY p.id), '[]'::jsonb)
  INTO v_subtotal, v_item_count, v_items
  FROM jsonb_to_recordset(coalesce(p_items, '[]'::jsonb)) AS x(product_id uuid, quantity integer)
  JOIN public.products p ON p.id = x.product_id
  WHERE x.quantity > 0 AND p.is_active = true AND coalesce(p.stock_quantity, 0) >= x.quantity;
  IF v_item_count = 0 OR v_item_count <> jsonb_array_length(coalesce(p_items, '[]'::jsonb)) THEN RAISE EXCEPTION 'Cart contains unavailable items'; END IF;

  IF p_point_session_id IS NOT NULL OR coalesce(p_points_to_use, 0) > 0 THEN
    SELECT * INTO v_session FROM public.point_redemption_sessions
    WHERE id = p_point_session_id AND status = 'verified' AND expires_at > now()
      AND guest_checkout_token = trim(p_guest_checkout_token) AND member_id IS NOT NULL FOR UPDATE;
    IF v_session.id IS NULL THEN RAISE EXCEPTION 'Verified guest point session required'; END IF;
    v_member_id := v_session.member_id;
    v_points := least(greatest(coalesce(p_points_to_use, 0), 0), v_session.requested_points, floor(v_subtotal)::integer);
    IF v_points <= 0 OR v_points <> v_session.requested_points THEN RAISE EXCEPTION 'Invalid point amount'; END IF;
    SELECT * INTO v_balance FROM public.member_point_balances WHERE user_id = v_member_id FOR UPDATE;
    IF coalesce(v_balance.current_points, 0) - coalesce(v_balance.reserved_points, 0) < v_points THEN RAISE EXCEPTION 'INSUFFICIENT_POINTS'; END IF;
  END IF;

  v_total := greatest(v_subtotal - v_points, 0);
  INSERT INTO public.orders(user_id, points_member_id, guest_checkout_token, total_amount, subtotal_amount, points_discount,
    status, payment_method, payment_status, newebpay_status, merchant_order_no, shipping_address, currency, created_at, updated_at)
  VALUES (NULL, v_member_id, trim(p_guest_checkout_token), v_total, v_subtotal, v_points,
    CASE WHEN v_total = 0 THEN 'processing' ELSE 'pending' END,
    CASE WHEN v_total = 0 THEN 'points' WHEN v_points > 0 THEN 'points_credit_card' ELSE 'credit_card' END,
    CASE WHEN v_total = 0 THEN 'paid' ELSE 'unpaid' END,
    CASE WHEN v_total = 0 THEN 'not_required' ELSE 'pending' END,
    trim(p_merchant_order_no), jsonb_build_object('name', trim(p_shipping_name), 'phone', trim(p_shipping_phone), 'email', lower(trim(p_shipping_email)), 'address', trim(p_shipping_address)), 'TWD', now(), now())
  RETURNING id INTO v_order_id;

  INSERT INTO public.purchase_records(order_id, user_id, product_id, quantity, unit_price, total_price, payment_method, shipping_address, status, created_at)
  SELECT v_order_id, NULL, p.id, x.quantity, p.price, p.price * x.quantity,
    CASE WHEN v_total = 0 THEN 'points' WHEN v_points > 0 THEN 'points_credit_card' ELSE 'credit_card' END,
    jsonb_build_object('name', trim(p_shipping_name), 'phone', trim(p_shipping_phone), 'email', lower(trim(p_shipping_email)), 'address', trim(p_shipping_address)),
    CASE WHEN v_total = 0 THEN 'completed' ELSE 'pending' END, now()
  FROM jsonb_to_recordset(p_items) AS x(product_id uuid, quantity integer) JOIN public.products p ON p.id = x.product_id;

  IF v_points > 0 THEN
    INSERT INTO public.point_reservations(member_id, order_id, redemption_session_id, points, discount_amount, status, balance_before, balance_after, expires_at, guest_checkout_token)
    VALUES (v_member_id, v_order_id, v_session.id, v_points, v_points, 'reserved',
      greatest(0, v_balance.current_points - v_balance.reserved_points), greatest(0, v_balance.current_points - v_balance.reserved_points) - v_points,
      now() + interval '20 minutes', trim(p_guest_checkout_token)) RETURNING * INTO v_res;
    UPDATE public.member_point_balances SET reserved_points = reserved_points + v_points, updated_at = now() WHERE user_id = v_member_id;
    UPDATE public.point_redemption_sessions SET status = 'reserved' WHERE id = v_session.id;
    UPDATE public.point_otp_requests SET used_at = now() WHERE session_id = v_session.id AND used_at IS NULL;
    UPDATE public.orders SET points_reservation_id = v_res.id WHERE id = v_order_id;
    INSERT INTO public.point_audit_logs(user_id, session_id, action, status, points, discount_amount, metadata)
    VALUES (v_member_id, v_session.id, 'redeem', 'reserved', v_points, v_points,
      jsonb_build_object('order_id', v_order_id, 'reservation_id', v_res.id, 'checkout_token', trim(p_guest_checkout_token), 'actor_type', 'guest'));
  END IF;

  RETURN jsonb_build_object('success', true, 'order_id', v_order_id, 'merchant_order_no', trim(p_merchant_order_no),
    'subtotal_amount', v_subtotal, 'points_discount', v_points, 'total_amount', v_total,
    'payment_method', CASE WHEN v_total = 0 THEN 'points' WHEN v_points > 0 THEN 'points_credit_card' ELSE 'credit_card' END,
    'payment_status', CASE WHEN v_total = 0 THEN 'paid' ELSE 'unpaid' END, 'order_status', CASE WHEN v_total = 0 THEN 'processing' ELSE 'pending' END, 'newebpay_status', CASE WHEN v_total = 0 THEN 'not_required' ELSE 'pending' END, 'items', v_items);
END;
$$;

CREATE OR REPLACE FUNCTION private.reserve_shop_order_points()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND NEW.points_discount > 0 AND NEW.payment_method IN ('credit_card', 'points_credit_card', 'points') THEN
    PERFORM public.reserve_member_points_for_order(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_guest_point_otp(p_request_id uuid, p_member_id uuid, p_otp_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_req public.point_otp_requests%ROWTYPE; v_session public.point_redemption_sessions%ROWTYPE;
BEGIN
  SELECT * INTO v_req FROM public.point_otp_requests WHERE id = p_request_id AND member_id = p_member_id FOR UPDATE;
  IF v_req.id IS NULL OR v_req.used_at IS NOT NULL OR v_req.verified_at IS NOT NULL OR v_req.expires_at <= now() THEN RAISE EXCEPTION 'OTP request is invalid or expired'; END IF;
  IF v_req.attempts >= v_req.max_attempts THEN RAISE EXCEPTION 'OTP attempts exceeded'; END IF;
  IF v_req.otp_hash <> p_otp_hash THEN
    UPDATE public.point_otp_requests SET attempts = attempts + 1 WHERE id = v_req.id;
    RAISE EXCEPTION 'Invalid OTP';
  END IF;
  UPDATE public.point_otp_requests SET verified_at = now() WHERE id = v_req.id;
  UPDATE public.point_redemption_sessions SET status = 'verified', verified_at = now() WHERE id = v_req.session_id AND status = 'pending_otp' RETURNING * INTO v_session;
  IF v_session.id IS NULL THEN RAISE EXCEPTION 'Point session is invalid'; END IF;
  INSERT INTO public.point_audit_logs(user_id, session_id, otp_request_id, action, status, channel, points, discount_amount, metadata)
  VALUES (p_member_id, v_session.id, v_req.id, 'verify_otp', 'success', v_req.channel, v_req.requested_points, v_req.calculated_discount, jsonb_build_object('actor_type', 'guest', 'guest_checkout_token', v_session.guest_checkout_token));
  RETURN jsonb_build_object('success', true, 'sessionId', v_session.id, 'requestedPoints', v_session.requested_points, 'discountAmount', v_session.calculated_discount);
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_guest_member(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_guest_member(text, text) TO service_role;
REVOKE ALL ON FUNCTION public.create_guest_shop_checkout_order(text, text, text, text, text, text, jsonb, uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_guest_shop_checkout_order(text, text, text, text, text, text, jsonb, uuid, integer) TO service_role;
REVOKE ALL ON FUNCTION public.verify_guest_point_otp(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_guest_point_otp(uuid, uuid, text) TO service_role;

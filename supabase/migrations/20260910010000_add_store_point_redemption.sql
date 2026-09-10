/* Store-specific, amount-bound point redemption orders. */

CREATE TABLE IF NOT EXISTS public.store_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_location_id uuid NOT NULL REFERENCES public.store_locations(id) ON DELETE RESTRICT,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  customer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  points_member_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name text,
  customer_phone text,
  customer_email text,
  gross_amount numeric NOT NULL CHECK (gross_amount > 0),
  points_used integer NOT NULL DEFAULT 0 CHECK (points_used >= 0),
  points_discount numeric NOT NULL DEFAULT 0 CHECK (points_discount >= 0),
  final_amount numeric NOT NULL DEFAULT 0 CHECK (final_amount >= 0),
  status text NOT NULL DEFAULT 'waiting_customer' CHECK (status IN ('waiting_customer','customer_opened','verifying','processing','completed','cancelled','expired')),
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','points_paid','partial_paid','paid','refunded')),
  verification_type text CHECK (verification_type IN ('logged_in','email_otp','sms_otp')),
  point_transaction_id uuid REFERENCES public.points(id) ON DELETE SET NULL,
  point_reservation_id uuid,
  checkout_token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '20 minutes'),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.store_orders FROM anon, authenticated;
CREATE INDEX IF NOT EXISTS store_orders_store_created_idx ON public.store_orders(store_location_id, created_at DESC);
CREATE INDEX IF NOT EXISTS store_orders_status_idx ON public.store_orders(status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS points_store_order_spent_idx
  ON public.points(reference_id, source_type, transaction_type)
  WHERE source_type = 'store_order' AND transaction_type = 'spent' AND reference_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'store_orders') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.store_orders;
  END IF;
EXCEPTION WHEN undefined_object THEN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_store_point_order(p_store_location_id uuid, p_gross_amount numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private
AS $$
DECLARE v_id uuid; v_token text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
BEGIN
  IF auth.uid() IS NULL OR NOT private.can_manage_store(p_store_location_id, 'sales') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF p_gross_amount IS NULL OR p_gross_amount <= 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  INSERT INTO public.store_orders(store_location_id, created_by, gross_amount, checkout_token_hash)
  VALUES (p_store_location_id, auth.uid(), round(p_gross_amount, 0), encode(digest(v_token, 'sha256'), 'hex'))
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('success', true, 'orderId', v_id, 'checkoutToken', v_token, 'grossAmount', round(p_gross_amount, 0));
END;
$$;

CREATE OR REPLACE FUNCTION public.get_store_point_order(p_checkout_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_order public.store_orders%ROWTYPE; v_store public.store_locations%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.store_orders WHERE checkout_token_hash = encode(digest(trim(p_checkout_token), 'sha256'), 'hex') FOR UPDATE;
  IF v_order.id IS NULL OR v_order.expires_at <= now() OR v_order.status IN ('cancelled','expired') THEN RAISE EXCEPTION 'Store redemption link expired'; END IF;
  SELECT * INTO v_store FROM public.store_locations WHERE id = v_order.store_location_id;
  IF v_order.status = 'waiting_customer' THEN UPDATE public.store_orders SET status = 'customer_opened', updated_at = now() WHERE id = v_order.id; END IF;
  RETURN jsonb_build_object('success', true, 'orderId', v_order.id, 'storeId', v_order.store_location_id, 'storeName', v_store.name, 'storeImageUrl', v_store.image_url, 'grossAmount', v_order.gross_amount, 'pointsUsed', v_order.points_used, 'pointsDiscount', v_order.points_discount, 'finalAmount', v_order.final_amount, 'status', CASE WHEN v_order.status = 'waiting_customer' THEN 'customer_opened' ELSE v_order.status END, 'paymentStatus', v_order.payment_status, 'expiresAt', v_order.expires_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_logged_in_store_point_balance()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_balance public.member_point_balances%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_balance FROM public.member_point_balances WHERE user_id = auth.uid();
  RETURN jsonb_build_object('success', true, 'availablePoints', greatest(0, coalesce(v_balance.current_points, 0) - coalesce(v_balance.reserved_points, 0)));
END;
$$;

CREATE OR REPLACE FUNCTION public.redeem_logged_in_store_points(p_checkout_token text, p_points integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private
AS $$
DECLARE v_order public.store_orders%ROWTYPE; v_balance public.member_point_balances%ROWTYPE; v_tx uuid; v_available integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_order FROM public.store_orders WHERE checkout_token_hash = encode(digest(trim(p_checkout_token), 'sha256'), 'hex') FOR UPDATE;
  IF v_order.id IS NULL OR v_order.status IN ('completed','cancelled','expired') OR v_order.expires_at <= now() THEN RAISE EXCEPTION 'Store order is not redeemable'; END IF;
  IF p_points <= 0 OR p_points > floor(v_order.gross_amount)::integer THEN RAISE EXCEPTION 'Invalid points'; END IF;
  SELECT * INTO v_balance FROM public.member_point_balances WHERE user_id = auth.uid() FOR UPDATE;
  v_available := greatest(0, coalesce(v_balance.current_points, 0) - coalesce(v_balance.reserved_points, 0));
  IF p_points > v_available THEN RAISE EXCEPTION 'INSUFFICIENT_POINTS'; END IF;
  INSERT INTO public.points(user_id, amount, transaction_type, reference_id, source_type, source_id, store_location_id, description)
  VALUES (auth.uid(), -p_points, 'spent', v_order.id, 'store_order', v_order.id, v_order.store_location_id, 'Store point redemption') RETURNING id INTO v_tx;
  UPDATE public.member_point_balances SET current_points = current_points - p_points, month_used = month_used + p_points, updated_at = now() WHERE user_id = auth.uid();
  UPDATE public.store_orders SET customer_user_id = auth.uid(), points_member_id = auth.uid(), points_used = p_points, points_discount = p_points, final_amount = greatest(0, gross_amount - p_points), status = 'completed', payment_status = CASE WHEN p_points >= gross_amount THEN 'points_paid' ELSE 'partial_paid' END, verification_type = 'logged_in', point_transaction_id = v_tx, completed_at = now(), updated_at = now() WHERE id = v_order.id;
  INSERT INTO public.point_audit_logs(user_id, action, status, points, discount_amount, metadata) VALUES (auth.uid(), 'redeem', 'captured', p_points, p_points, jsonb_build_object('store_order_id', v_order.id, 'transaction_id', v_tx, 'verification_type', 'logged_in'));
  RETURN jsonb_build_object('success', true, 'orderId', v_order.id, 'pointsUsed', p_points, 'pointsDiscount', p_points, 'finalAmount', greatest(0, v_order.gross_amount - p_points), 'verificationType', 'logged_in');
EXCEPTION WHEN unique_violation THEN
  SELECT * INTO v_order FROM public.store_orders WHERE checkout_token_hash = encode(digest(trim(p_checkout_token), 'sha256'), 'hex');
  RETURN jsonb_build_object('success', true, 'orderId', v_order.id, 'pointsUsed', v_order.points_used, 'pointsDiscount', v_order.points_discount, 'finalAmount', v_order.final_amount, 'idempotent', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.redeem_guest_store_points(p_checkout_token text, p_session_id uuid, p_points integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_order public.store_orders%ROWTYPE; v_session public.point_redemption_sessions%ROWTYPE; v_balance public.member_point_balances%ROWTYPE; v_tx uuid; v_available integer;
BEGIN
  SELECT * INTO v_order FROM public.store_orders WHERE checkout_token_hash = encode(digest(trim(p_checkout_token), 'sha256'), 'hex') FOR UPDATE;
  SELECT * INTO v_session FROM public.point_redemption_sessions WHERE id = p_session_id AND guest_checkout_token = trim(p_checkout_token) AND status = 'verified' AND expires_at > now() AND member_id IS NOT NULL FOR UPDATE;
  IF v_order.id IS NULL OR v_order.status IN ('completed','cancelled','expired') OR v_order.expires_at <= now() OR v_session.id IS NULL THEN RAISE EXCEPTION 'Verification session invalid'; END IF;
  IF p_points <= 0 OR p_points > floor(v_order.gross_amount)::integer OR p_points <> v_session.requested_points THEN RAISE EXCEPTION 'Invalid points'; END IF;
  SELECT * INTO v_balance FROM public.member_point_balances WHERE user_id = v_session.member_id FOR UPDATE;
  v_available := greatest(0, coalesce(v_balance.current_points, 0) - coalesce(v_balance.reserved_points, 0));
  IF p_points > v_available THEN RAISE EXCEPTION 'INSUFFICIENT_POINTS'; END IF;
  INSERT INTO public.points(user_id, amount, transaction_type, reference_id, source_type, source_id, store_location_id, description)
  VALUES (v_session.member_id, -p_points, 'spent', v_order.id, 'store_order', v_order.id, v_order.store_location_id, 'Store point redemption') RETURNING id INTO v_tx;
  UPDATE public.member_point_balances SET current_points = current_points - p_points, month_used = month_used + p_points, updated_at = now() WHERE user_id = v_session.member_id;
  UPDATE public.point_redemption_sessions SET status = 'redeemed', redeemed_at = now() WHERE id = v_session.id;
  UPDATE public.store_orders SET points_member_id = v_session.member_id, points_used = p_points, points_discount = p_points, final_amount = greatest(0, gross_amount - p_points), status = 'completed', payment_status = CASE WHEN p_points >= gross_amount THEN 'points_paid' ELSE 'partial_paid' END, verification_type = 'email_otp', point_transaction_id = v_tx, completed_at = now(), updated_at = now() WHERE id = v_order.id;
  INSERT INTO public.point_audit_logs(user_id, session_id, action, status, channel, points, discount_amount, metadata) VALUES (v_session.member_id, v_session.id, 'redeem', 'captured', 'email', p_points, p_points, jsonb_build_object('store_order_id', v_order.id, 'transaction_id', v_tx, 'verification_type', 'email_otp'));
  RETURN jsonb_build_object('success', true, 'orderId', v_order.id, 'pointsUsed', p_points, 'pointsDiscount', p_points, 'finalAmount', greatest(0, v_order.gross_amount - p_points), 'verificationType', 'email_otp');
EXCEPTION WHEN unique_violation THEN
  SELECT * INTO v_order FROM public.store_orders WHERE checkout_token_hash = encode(digest(trim(p_checkout_token), 'sha256'), 'hex');
  RETURN jsonb_build_object('success', true, 'orderId', v_order.id, 'pointsUsed', v_order.points_used, 'pointsDiscount', v_order.points_discount, 'finalAmount', v_order.final_amount, 'idempotent', true);
END;
$$;

REVOKE ALL ON FUNCTION public.create_store_point_order(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_store_point_order(uuid, numeric) TO authenticated;
REVOKE ALL ON FUNCTION public.get_store_point_order(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_store_point_order(text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.get_logged_in_store_point_balance() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_logged_in_store_point_balance() TO authenticated;
REVOKE ALL ON FUNCTION public.redeem_logged_in_store_points(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_logged_in_store_points(text, integer) TO authenticated;
REVOKE ALL ON FUNCTION public.redeem_guest_store_points(text, uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_guest_store_points(text, uuid, integer) TO service_role;

/* Store POS: staff creates a pending order, customer pays from a QR page. */

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_channel text NOT NULL DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS store_location_id uuid REFERENCES public.store_locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pos_payment_token_hash text,
  ADD COLUMN IF NOT EXISTS pos_created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_order_channel_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_order_channel_check CHECK (order_channel IN ('web', 'pos'));

CREATE UNIQUE INDEX IF NOT EXISTS orders_pos_payment_token_hash_idx
  ON public.orders(pos_payment_token_hash)
  WHERE pos_payment_token_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS orders_pos_store_status_idx
  ON public.orders(store_location_id, order_channel, payment_status, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
EXCEPTION
  WHEN undefined_object THEN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_pos_order(
  p_store_location_id uuid,
  p_items jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private
AS $$
DECLARE
  v_user_id uuid := auth.uid(); v_order_id uuid; v_token text := gen_random_uuid()::text;
  v_merchant text := 'POS' || to_char(now(), 'YYYYMMDDHH24MISS') || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  v_subtotal numeric := 0; v_count integer := 0; v_items jsonb := '[]'::jsonb;
BEGIN
  IF v_user_id IS NULL OR NOT private.can_manage_store(p_store_location_id, 'sales') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT coalesce(sum(p.price * x.quantity), 0), count(*), coalesce(jsonb_agg(jsonb_build_object('product_id', p.id, 'name', p.name, 'quantity', x.quantity, 'unit_price', p.price, 'total_price', p.price * x.quantity) ORDER BY p.name), '[]'::jsonb)
  INTO v_subtotal, v_count, v_items
  FROM jsonb_to_recordset(coalesce(p_items, '[]'::jsonb)) AS x(product_id uuid, quantity integer)
  JOIN public.products p ON p.id = x.product_id
  WHERE x.quantity > 0 AND p.is_active = true AND p.store_location_id = p_store_location_id AND coalesce(p.stock_quantity, 0) >= x.quantity;
  IF v_count = 0 OR v_count <> jsonb_array_length(coalesce(p_items, '[]'::jsonb)) THEN RAISE EXCEPTION 'Cart contains unavailable items'; END IF;

  INSERT INTO public.orders(user_id, total_amount, subtotal_amount, points_discount, status, payment_method, payment_status, newebpay_status, merchant_order_no, shipping_address, currency, order_channel, store_location_id, pos_payment_token_hash, pos_created_by, created_at, updated_at)
  VALUES (NULL, v_subtotal, v_subtotal, 0, 'pending', 'pos_pending', 'unpaid', 'pending', v_merchant,
    jsonb_build_object('name', '', 'phone', '', 'email', '', 'address', ''), 'TWD', 'pos', p_store_location_id, encode(digest(v_token, 'sha256'), 'hex'), v_user_id, now(), now())
  RETURNING id INTO v_order_id;

  INSERT INTO public.purchase_records(order_id, user_id, product_id, quantity, unit_price, total_price, payment_method, shipping_address, status, created_at)
  SELECT v_order_id, NULL, p.id, x.quantity, p.price, p.price * x.quantity, 'pos_pending', '{}'::jsonb, 'pending', now()
  FROM jsonb_to_recordset(p_items) AS x(product_id uuid, quantity integer) JOIN public.products p ON p.id = x.product_id;

  RETURN jsonb_build_object('success', true, 'orderId', v_order_id, 'merchantOrderNo', v_merchant, 'paymentToken', v_token, 'subtotal', v_subtotal, 'items', v_items);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_pos_order(p_payment_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private
AS $$
DECLARE v_order public.orders%ROWTYPE; v_items jsonb;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE pos_payment_token_hash = encode(digest(trim(p_payment_token), 'sha256'), 'hex') AND order_channel = 'pos';
  IF v_order.id IS NULL THEN RAISE EXCEPTION 'POS order not found'; END IF;
  IF v_order.created_at < now() - interval '2 hours' AND v_order.payment_status <> 'paid' THEN RAISE EXCEPTION 'POS payment link expired'; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('product_id', p.id, 'name', p.name, 'quantity', r.quantity, 'unit_price', r.unit_price, 'total_price', r.total_price) ORDER BY p.name), '[]'::jsonb) INTO v_items
  FROM public.purchase_records r JOIN public.products p ON p.id = r.product_id WHERE r.order_id = v_order.id;
  RETURN jsonb_build_object('success', true, 'orderId', v_order.id, 'merchantOrderNo', v_order.merchant_order_no, 'storeLocationId', v_order.store_location_id, 'totalAmount', v_order.total_amount, 'subtotalAmount', v_order.subtotal_amount, 'pointsDiscount', v_order.points_discount, 'paymentStatus', v_order.payment_status, 'newebpayStatus', v_order.newebpay_status, 'shippingAddress', v_order.shipping_address, 'items', v_items);
END;
$$;

CREATE OR REPLACE FUNCTION public.reserve_guest_points_for_pos_order(
  p_payment_token text,
  p_session_id uuid,
  p_points integer,
  p_name text,
  p_phone text,
  p_email text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private
AS $$
DECLARE v_order public.orders%ROWTYPE; v_session public.point_redemption_sessions%ROWTYPE; v_balance public.member_point_balances%ROWTYPE; v_res public.point_reservations%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE pos_payment_token_hash = encode(digest(trim(p_payment_token), 'sha256'), 'hex') AND order_channel = 'pos' FOR UPDATE;
  IF v_order.id IS NULL OR v_order.payment_status <> 'unpaid' THEN RAISE EXCEPTION 'POS order is not payable'; END IF;
  SELECT * INTO v_session FROM public.point_redemption_sessions WHERE id = p_session_id AND guest_checkout_token = trim(p_payment_token) AND status = 'verified' AND expires_at > now() AND member_id IS NOT NULL FOR UPDATE;
  IF v_session.id IS NULL OR p_points <= 0 OR p_points <> v_session.requested_points THEN RAISE EXCEPTION 'Verified point session required'; END IF;
  SELECT * INTO v_balance FROM public.member_point_balances WHERE user_id = v_session.member_id FOR UPDATE;
  IF coalesce(v_balance.current_points, 0) - coalesce(v_balance.reserved_points, 0) < p_points OR p_points > floor(v_order.subtotal_amount)::integer THEN RAISE EXCEPTION 'INSUFFICIENT_POINTS'; END IF;
  UPDATE public.orders SET points_member_id = v_session.member_id, points_discount = p_points, total_amount = greatest(0, subtotal_amount - p_points), payment_method = CASE WHEN p_points >= subtotal_amount THEN 'points' ELSE 'points_credit_card' END, payment_status = CASE WHEN p_points >= subtotal_amount THEN 'paid' ELSE 'unpaid' END, status = CASE WHEN p_points >= subtotal_amount THEN 'processing' ELSE 'pending' END, newebpay_status = CASE WHEN p_points >= subtotal_amount THEN 'not_required' ELSE 'pending' END, shipping_address = jsonb_build_object('name', trim(p_name), 'phone', trim(p_phone), 'email', lower(trim(p_email)), 'address', ''), updated_at = now() WHERE id = v_order.id;
  UPDATE public.purchase_records SET payment_method = CASE WHEN p_points >= v_order.subtotal_amount THEN 'points' ELSE 'points_credit_card' END, shipping_address = jsonb_build_object('name', trim(p_name), 'phone', trim(p_phone), 'email', lower(trim(p_email))) WHERE order_id = v_order.id;
  INSERT INTO public.point_reservations(member_id, order_id, redemption_session_id, points, discount_amount, status, balance_before, balance_after, expires_at, guest_checkout_token)
  VALUES (v_session.member_id, v_order.id, v_session.id, p_points, p_points, 'reserved', greatest(0, v_balance.current_points - v_balance.reserved_points), greatest(0, v_balance.current_points - v_balance.reserved_points) - p_points, now() + interval '20 minutes', trim(p_payment_token)) RETURNING * INTO v_res;
  UPDATE public.member_point_balances SET reserved_points = reserved_points + p_points, updated_at = now() WHERE user_id = v_session.member_id;
  UPDATE public.point_redemption_sessions SET status = 'reserved' WHERE id = v_session.id;
  UPDATE public.point_otp_requests SET used_at = now() WHERE session_id = v_session.id AND used_at IS NULL;
  UPDATE public.orders SET points_reservation_id = v_res.id WHERE id = v_order.id;
  RETURN jsonb_build_object('success', true, 'orderId', v_order.id, 'totalAmount', greatest(0, v_order.subtotal_amount - p_points), 'pointsDiscount', p_points, 'paymentStatus', CASE WHEN p_points >= v_order.subtotal_amount THEN 'paid' ELSE 'unpaid' END);
END;
$$;

REVOKE ALL ON FUNCTION public.create_pos_order(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_pos_order(uuid, jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.get_pos_order(text) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.get_pos_order(text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.reserve_guest_points_for_pos_order(text, uuid, integer, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_guest_points_for_pos_order(text, uuid, integer, text, text, text) TO service_role;

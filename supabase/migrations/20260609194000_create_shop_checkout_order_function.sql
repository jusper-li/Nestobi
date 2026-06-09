/*
  # Shop checkout order transaction

  Creates a secured helper that validates the authenticated user's cart,
  computes points discounts, creates the order and line items in one database
  transaction, and clears the cart only after all writes succeed.
*/

CREATE OR REPLACE FUNCTION public.create_shop_checkout_order(
  p_merchant_order_no text,
  p_points_to_use integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_cart_count integer := 0;
  v_valid_item_count integer := 0;
  v_balance integer := 0;
  v_subtotal numeric := 0;
  v_points_discount integer := 0;
  v_total numeric := 0;
  v_payment_method text := 'credit_card';
  v_payment_status text := 'unpaid';
  v_order_status text := 'pending';
  v_newebpay_status text := 'pending';
  v_order_id uuid;
  v_items jsonb := '[]'::jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_merchant_order_no IS NULL OR length(trim(p_merchant_order_no)) = 0 THEN
    RAISE EXCEPTION 'Merchant order number is required';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.orders
    WHERE merchant_order_no = p_merchant_order_no
  ) THEN
    RAISE EXCEPTION 'Duplicate merchant order number';
  END IF;

  SELECT COUNT(*)
    INTO v_cart_count
  FROM public.tbl_mn5uxems
  WHERE user_id = v_user_id;

  IF v_cart_count = 0 THEN
    RAISE EXCEPTION 'Cart is empty';
  END IF;

  SELECT
    COALESCE(SUM((p.price::numeric) * c.quantity), 0),
    COUNT(*),
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'product_id', p.id,
        'name', p.name,
        'quantity', c.quantity,
        'unit_price', p.price,
        'total_price', (p.price::numeric * c.quantity)
      )
      ORDER BY c.created_at
    ), '[]'::jsonb)
  INTO v_subtotal, v_valid_item_count, v_items
  FROM public.tbl_mn5uxems c
  JOIN public.products p
    ON p.id = c.product_id
  WHERE c.user_id = v_user_id
    AND p.is_active = true
    AND COALESCE(p.stock_quantity, 0) >= c.quantity;

  IF v_valid_item_count = 0 OR v_valid_item_count <> v_cart_count THEN
    RAISE EXCEPTION 'Cart contains unavailable items';
  END IF;

  SELECT COALESCE(current_points, 0)
    INTO v_balance
  FROM public.member_point_balances
  WHERE user_id = v_user_id;

  v_points_discount := LEAST(
    GREATEST(COALESCE(p_points_to_use, 0), 0),
    v_balance,
    FLOOR(v_subtotal)::integer
  );
  v_total := GREATEST(v_subtotal - v_points_discount, 0);

  IF v_total = 0 THEN
    v_payment_method := 'points';
    v_payment_status := 'paid';
    v_order_status := 'processing';
    v_newebpay_status := 'not_required';
  ELSIF v_points_discount > 0 THEN
    v_payment_method := 'points_credit_card';
  ELSE
    v_payment_method := 'credit_card';
  END IF;

  INSERT INTO public.orders (
    user_id,
    total_amount,
    subtotal_amount,
    points_discount,
    status,
    payment_method,
    payment_status,
    newebpay_status,
    merchant_order_no,
    shipping_address,
    discount_code,
    currency,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    v_total,
    v_subtotal,
    v_points_discount,
    v_order_status,
    v_payment_method,
    v_payment_status,
    v_newebpay_status,
    p_merchant_order_no,
    '{}'::jsonb,
    '',
    'TWD',
    now(),
    now()
  )
  RETURNING id INTO v_order_id;

  INSERT INTO public.purchase_records (
    order_id,
    user_id,
    product_id,
    quantity,
    unit_price,
    total_price,
    payment_method,
    shipping_address,
    status,
    created_at
  )
  SELECT
    v_order_id,
    v_user_id,
    p.id,
    c.quantity,
    p.price,
    (p.price::numeric * c.quantity),
    v_payment_method,
    '{}'::jsonb,
    CASE WHEN v_payment_status = 'paid' THEN 'completed' ELSE 'pending' END,
    now()
  FROM public.tbl_mn5uxems c
  JOIN public.products p
    ON p.id = c.product_id
  WHERE c.user_id = v_user_id;

  IF v_points_discount > 0 THEN
    INSERT INTO public.points (
      user_id,
      amount,
      transaction_type,
      reference_id,
      source_type,
      source_id,
      vendor_id,
      store_location_id,
      description,
      created_at
    ) VALUES (
      v_user_id,
      -v_points_discount,
      'spent',
      v_order_id,
      'order',
      v_order_id,
      NULL,
      NULL,
      'Shop points discount',
      now()
    );
  END IF;

  DELETE FROM public.tbl_mn5uxems
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'merchant_order_no', p_merchant_order_no,
    'subtotal_amount', v_subtotal,
    'points_discount', v_points_discount,
    'total_amount', v_total,
    'payment_method', v_payment_method,
    'payment_status', v_payment_status,
    'order_status', v_order_status,
    'newebpay_status', v_newebpay_status,
    'items', v_items
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_shop_checkout_order(text, integer)
  TO authenticated;

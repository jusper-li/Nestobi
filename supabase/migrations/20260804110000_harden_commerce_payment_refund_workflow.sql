/*
  Harden checkout and refund processing.

  - Prevent anonymous execution of checkout SECURITY DEFINER functions.
  - Keep reward-point issuance idempotent for payment callback retries.
  - Record every provider refund attempt without exposing writes to clients.
*/

ALTER TABLE public.tbl_mn5wgzh0
  ADD COLUMN IF NOT EXISTS shipping_address text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.create_shop_checkout_order(
  p_merchant_order_no text,
  p_shipping_name text,
  p_shipping_phone text,
  p_shipping_address text,
  p_points_to_use integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_result jsonb;
  v_order_id uuid;
  v_email text := '';
  v_shipping jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF trim(coalesce(p_shipping_name, '')) = ''
    OR trim(coalesce(p_shipping_phone, '')) = ''
    OR trim(coalesce(p_shipping_address, '')) = '' THEN
    RAISE EXCEPTION 'Shipping name, phone, and address are required';
  END IF;

  v_result := public.create_shop_checkout_order(p_merchant_order_no, p_points_to_use);
  v_order_id := (v_result->>'order_id')::uuid;

  SELECT coalesce(email, '') INTO v_email FROM auth.users WHERE id = v_user_id;
  v_shipping := jsonb_build_object(
    'customer_name', trim(p_shipping_name),
    'recipient_name', trim(p_shipping_name),
    'customer_phone', trim(p_shipping_phone),
    'recipient_phone', trim(p_shipping_phone),
    'customer_email', v_email,
    'recipient_email', v_email,
    'name', trim(p_shipping_name),
    'phone', trim(p_shipping_phone),
    'email', v_email,
    'address', trim(p_shipping_address),
    'shipping_address', trim(p_shipping_address),
    'recipient_address', trim(p_shipping_address)
  );

  UPDATE public.orders
  SET shipping_address = v_shipping, updated_at = now()
  WHERE id = v_order_id AND user_id = v_user_id;

  UPDATE public.purchase_records
  SET shipping_address = v_shipping
  WHERE order_id = v_order_id AND user_id = v_user_id;

  UPDATE public.tbl_mn5wgzh0
  SET display_name = trim(p_shipping_name),
      phone = trim(p_shipping_phone),
      shipping_address = trim(p_shipping_address),
      updated_at = now()
  WHERE user_id = v_user_id;

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_shop_checkout_order(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_shop_checkout_order(text, integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.create_shop_checkout_order(text, text, text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_shop_checkout_order(text, text, text, text, integer) TO authenticated;

DO $$
BEGIN
  IF to_regprocedure('public.create_shop_checkout_order(text,text,text,text,integer)') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.create_shop_checkout_order(text,text,text,text,integer) FROM PUBLIC, anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.create_shop_checkout_order(text,text,text,text,integer) TO authenticated';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS points_shop_purchase_reward_order_unique
  ON public.points (source_id)
  WHERE source_type = 'order'
    AND transaction_type = 'earned'
    AND description = 'Shop purchase points reward';

CREATE TABLE IF NOT EXISTS public.payment_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  requested_by uuid,
  provider text NOT NULL DEFAULT 'newebpay',
  payment_type text,
  amount numeric NOT NULL CHECK (amount >= 0),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'manual_required')),
  provider_trade_no text,
  raw_request jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_response jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_refunds_order_id_idx ON public.payment_refunds(order_id);
CREATE INDEX IF NOT EXISTS payment_refunds_status_idx ON public.payment_refunds(status);
CREATE INDEX IF NOT EXISTS payment_refunds_created_at_idx ON public.payment_refunds(created_at DESC);

ALTER TABLE public.payment_refunds ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.payment_refunds FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.payment_refunds TO authenticated;

DROP POLICY IF EXISTS "Admins can read payment refunds" ON public.payment_refunds;
CREATE POLICY "Admins can read payment refunds"
  ON public.payment_refunds FOR SELECT TO authenticated
  USING (private.is_admin());

DROP POLICY IF EXISTS "Vendors can read owned payment refunds" ON public.payment_refunds;
CREATE POLICY "Vendors can read owned payment refunds"
  ON public.payment_refunds FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.purchase_records pr
      JOIN public.products product ON product.id = pr.product_id
      JOIN public.vendors vendor ON vendor.id = product.vendor_id
      WHERE pr.order_id = payment_refunds.order_id
        AND vendor.user_id = auth.uid()
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_payment_refunds_updated_at') THEN
    CREATE TRIGGER update_payment_refunds_updated_at
      BEFORE UPDATE ON public.payment_refunds
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

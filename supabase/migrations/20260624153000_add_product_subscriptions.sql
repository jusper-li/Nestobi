/*
  # Add coffee subscription support

  Stores subscription contracts, billing cycles, and gateway metadata so
  recurring NewebPay charges can generate fresh shop orders for each month.
*/

CREATE TABLE IF NOT EXISTS public.product_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  merchant_order_no text,
  newebpay_period_no text,
  quantity integer NOT NULL DEFAULT 1,
  monthly_amount numeric NOT NULL DEFAULT 0,
  period_type text NOT NULL DEFAULT 'M',
  period_point text NOT NULL DEFAULT '01',
  period_start_type text NOT NULL DEFAULT '2',
  period_times text NOT NULL DEFAULT 'NE',
  billing_cycle_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  next_bill_at timestamptz,
  last_billed_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  expires_at timestamptz,
  shipping_address jsonb NOT NULL DEFAULT '{}'::jsonb,
  customer_name text NOT NULL DEFAULT '',
  customer_email text NOT NULL DEFAULT '',
  customer_phone text NOT NULL DEFAULT '',
  newebpay_trade_no text,
  newebpay_auth_code text,
  newebpay_card_no text,
  newebpay_payment_type text,
  newebpay_respond_code text,
  newebpay_status text NOT NULL DEFAULT 'pending',
  newebpay_paid_at timestamptz,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.product_subscriptions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.product_subscriptions
  DROP CONSTRAINT IF EXISTS product_subscriptions_status_check;

ALTER TABLE public.product_subscriptions
  ADD CONSTRAINT product_subscriptions_status_check
    CHECK (status IN ('pending', 'active', 'paused', 'cancelled', 'expired'));

ALTER TABLE public.product_subscriptions
  DROP CONSTRAINT IF EXISTS product_subscriptions_newebpay_status_check;

ALTER TABLE public.product_subscriptions
  ADD CONSTRAINT product_subscriptions_newebpay_status_check
    CHECK (newebpay_status IN ('pending', 'success', 'failed', 'not_required'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_subscriptions_merchant_order_no
  ON public.product_subscriptions (merchant_order_no)
  WHERE merchant_order_no IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_subscriptions_period_no
  ON public.product_subscriptions (newebpay_period_no)
  WHERE newebpay_period_no IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_product_subscriptions_user_id
  ON public.product_subscriptions (user_id);

CREATE INDEX IF NOT EXISTS idx_product_subscriptions_product_id
  ON public.product_subscriptions (product_id);

CREATE INDEX IF NOT EXISTS idx_product_subscriptions_status
  ON public.product_subscriptions (status);

CREATE POLICY "Users can view own subscriptions"
  ON public.product_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.tbl_user_auth
      WHERE tbl_user_auth.user_id = (SELECT auth.uid())
        AND tbl_user_auth.role IN ('admin', 'superadmin')
    )
    OR EXISTS (
      SELECT 1
      FROM public.products
      JOIN public.vendors ON vendors.id = products.vendor_id
      WHERE products.id = product_subscriptions.product_id
        AND vendors.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can insert own subscriptions"
  ON public.product_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users and admins can update subscriptions"
  ON public.product_subscriptions
  FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.tbl_user_auth
      WHERE tbl_user_auth.user_id = (SELECT auth.uid())
        AND tbl_user_auth.role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.tbl_user_auth
      WHERE tbl_user_auth.user_id = (SELECT auth.uid())
        AND tbl_user_auth.role IN ('admin', 'superadmin')
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.product_subscriptions TO authenticated;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS subscription_id uuid REFERENCES public.product_subscriptions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recurring_cycle_no integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_orders_subscription_id
  ON public.orders (subscription_id);

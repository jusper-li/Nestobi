/*
  # Add NewebPay shop checkout support

  Stores merchant order numbers and payment gateway callbacks for shop orders
  so checkout can redirect to NewebPay and later reconcile through webhook
  updates without relying on frontend-only state.
*/

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS merchant_order_no text,
  ADD COLUMN IF NOT EXISTS newebpay_status text NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS newebpay_trade_no text,
  ADD COLUMN IF NOT EXISTS newebpay_auth_code text,
  ADD COLUMN IF NOT EXISTS newebpay_card_no text,
  ADD COLUMN IF NOT EXISTS newebpay_respond_code text,
  ADD COLUMN IF NOT EXISTS newebpay_payment_type text,
  ADD COLUMN IF NOT EXISTS newebpay_paid_at timestamptz;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_newebpay_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_newebpay_status_check
    CHECK (newebpay_status IN ('not_required', 'pending', 'success', 'failed'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_merchant_order_no
  ON public.orders (merchant_order_no)
  WHERE merchant_order_no IS NOT NULL;

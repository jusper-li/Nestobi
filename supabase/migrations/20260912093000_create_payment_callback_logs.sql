CREATE TABLE IF NOT EXISTS public.payment_callback_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  payment_type text NOT NULL,
  merchant_order_no text,
  trade_no text,
  status text,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  decrypted_payload jsonb,
  processed boolean NOT NULL DEFAULT false,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_callback_logs_merchant_order
  ON public.payment_callback_logs(merchant_order_no, created_at DESC);
ALTER TABLE public.payment_callback_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can read payment callback logs" ON public.payment_callback_logs;
CREATE POLICY "Admins can read payment callback logs"
  ON public.payment_callback_logs FOR SELECT TO authenticated
  USING (private.is_admin());

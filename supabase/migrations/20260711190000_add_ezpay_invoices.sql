/*
  # Add ezPay electronic invoices

  - Create invoices table to store ezPay issuance results and errors.
  - Keep invoice writes in Edge Functions / service role only.
  - Allow admins and the owning member to read invoice records.
*/

CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  invoice_status text NOT NULL DEFAULT 'pending',
  invoice_number text,
  invoice_random_number text,
  invoice_date timestamptz,
  buyer_name text,
  buyer_email text,
  buyer_identifier text,
  carrier_type text,
  carrier_number text,
  love_code text,
  tax_type text,
  sales_amount numeric,
  tax_amount numeric,
  total_amount numeric,
  ezpay_trade_no text,
  ezpay_raw_request jsonb DEFAULT '{}'::jsonb,
  ezpay_raw_response jsonb DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invoices_invoice_status_check
    CHECK (invoice_status IN ('pending', 'issued', 'failed', 'cancelled', 'allowance')),
  CONSTRAINT invoices_order_id_unique UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON public.invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(invoice_status);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices(invoice_number);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members and admins can read invoices" ON public.invoices;
CREATE POLICY "Members and admins can read invoices"
  ON public.invoices
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR private.is_admin());

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_invoices_updated_at') THEN
    CREATE TRIGGER update_invoices_updated_at
      BEFORE UPDATE ON public.invoices
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

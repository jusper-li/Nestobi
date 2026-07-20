/*
  # Add ezPay logistics shipment management

  - Create logistics_shipments table to store ezPay shipment creation, query and print responses.
  - Keep writes inside Edge Functions / service role only.
  - Allow admins and the owning member to read shipment records.
*/

CREATE TABLE IF NOT EXISTS public.logistics_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  logistics_status text NOT NULL DEFAULT 'pending',
  logistics_type text NOT NULL DEFAULT 'B2C',
  ship_type text NOT NULL DEFAULT '1',
  trade_type integer NOT NULL DEFAULT 3,
  merchant_order_no text NOT NULL DEFAULT '',
  lgs_no text,
  store_print_no text,
  store_id text,
  store_name text,
  store_tel text,
  store_addr text,
  recipient_name text,
  recipient_phone text,
  recipient_email text,
  total_amount numeric,
  ezpay_raw_request jsonb NOT NULL DEFAULT '{}'::jsonb,
  ezpay_raw_response jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT logistics_shipments_status_check
    CHECK (logistics_status IN ('pending', 'created', 'failed', 'cancelled')),
  CONSTRAINT logistics_shipments_order_id_unique UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_logistics_shipments_order_id ON public.logistics_shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_logistics_shipments_user_id ON public.logistics_shipments(user_id);
CREATE INDEX IF NOT EXISTS idx_logistics_shipments_status ON public.logistics_shipments(logistics_status);
CREATE INDEX IF NOT EXISTS idx_logistics_shipments_merchant_order_no ON public.logistics_shipments(merchant_order_no);
CREATE INDEX IF NOT EXISTS idx_logistics_shipments_lgs_no ON public.logistics_shipments(lgs_no);

GRANT SELECT ON public.logistics_shipments TO authenticated;

ALTER TABLE public.logistics_shipments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members and admins can read logistics shipments" ON public.logistics_shipments;
CREATE POLICY "Members and admins can read logistics shipments"
  ON public.logistics_shipments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR private.is_admin());

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_logistics_shipments_updated_at') THEN
    CREATE TRIGGER update_logistics_shipments_updated_at
      BEFORE UPDATE ON public.logistics_shipments
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

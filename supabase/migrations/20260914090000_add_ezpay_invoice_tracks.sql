CREATE TABLE IF NOT EXISTS public.ezpay_invoice_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year smallint NOT NULL,
  term smallint NOT NULL CHECK (term BETWEEN 1 AND 6),
  alphabetic_letter text NOT NULL CHECK (alphabetic_letter ~ '^[A-Z]{2}$'),
  start_number text NOT NULL CHECK (start_number ~ '^[0-9]{8}$'),
  end_number text NOT NULL CHECK (end_number ~ '^[0-9]{8}$'),
  invoice_type text NOT NULL DEFAULT '07' CHECK (invoice_type IN ('07','08')),
  management_no text,
  remaining_number integer,
  flag smallint NOT NULL DEFAULT 0 CHECK (flag BETWEEN 0 AND 2),
  raw_response jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(year, term, alphabetic_letter, start_number, end_number)
);
ALTER TABLE public.ezpay_invoice_tracks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage invoice tracks" ON public.ezpay_invoice_tracks;
CREATE POLICY "Admins manage invoice tracks" ON public.ezpay_invoice_tracks FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

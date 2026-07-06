CREATE OR REPLACE FUNCTION private.can_manage_store(
  store_id uuid,
  permission text DEFAULT 'any'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF private.is_admin() THEN
    RETURN true;
  END IF;

  IF private.is_store_owner(store_id) THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.store_location_managers managers
    WHERE managers.store_location_id = store_id
      AND managers.user_id = auth.uid()
      AND managers.is_active = true
      AND (
        permission = 'any'
        OR (permission = 'info' AND managers.can_manage_store_info)
        OR (permission = 'products' AND managers.can_manage_products)
        OR (permission = 'inventory' AND managers.can_manage_inventory)
        OR (permission = 'points' AND managers.can_manage_points)
        OR (permission = 'sales' AND managers.can_manage_sales)
      )
  );
END;
$$;

ALTER TABLE public.store_location_managers
  ADD COLUMN IF NOT EXISTS can_manage_sales boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.store_daily_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_location_id uuid NOT NULL REFERENCES public.store_locations(id) ON DELETE CASCADE,
  sales_date date NOT NULL DEFAULT CURRENT_DATE,
  revenue_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (revenue_amount >= 0),
  note text NOT NULL DEFAULT '',
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_location_id, sales_date)
);

CREATE INDEX IF NOT EXISTS idx_store_daily_sales_store_date
  ON public.store_daily_sales (store_location_id, sales_date DESC);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

ALTER TABLE public.store_daily_sales ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_daily_sales TO authenticated;

DROP POLICY IF EXISTS "Store sales read" ON public.store_daily_sales;
CREATE POLICY "Store sales read"
  ON public.store_daily_sales
  FOR SELECT
  TO authenticated
  USING (private.can_manage_store(store_location_id, 'sales'));

DROP POLICY IF EXISTS "Store sales insert" ON public.store_daily_sales;
CREATE POLICY "Store sales insert"
  ON public.store_daily_sales
  FOR INSERT
  TO authenticated
  WITH CHECK (private.can_manage_store(store_location_id, 'sales'));

DROP POLICY IF EXISTS "Store sales update" ON public.store_daily_sales;
CREATE POLICY "Store sales update"
  ON public.store_daily_sales
  FOR UPDATE
  TO authenticated
  USING (private.can_manage_store(store_location_id, 'sales'))
  WITH CHECK (private.can_manage_store(store_location_id, 'sales'));

DROP POLICY IF EXISTS "Store sales delete" ON public.store_daily_sales;
CREATE POLICY "Store sales delete"
  ON public.store_daily_sales
  FOR DELETE
  TO authenticated
  USING (private.can_manage_store(store_location_id, 'sales'));

DROP TRIGGER IF EXISTS update_store_daily_sales_updated_at ON public.store_daily_sales;
CREATE TRIGGER update_store_daily_sales_updated_at
  BEFORE UPDATE ON public.store_daily_sales
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

INSERT INTO public.store_daily_sales (
  store_location_id,
  sales_date,
  revenue_amount,
  note,
  recorded_by
)
SELECT
  locations.id,
  sales_day.sales_day::date,
  (((abs(hashtextextended(locations.id::text || ':' || sales_day.sales_day::text, 0)) % 12000) + 6000)::numeric(12,2)),
  '測試資料',
  NULL
FROM public.store_locations locations
CROSS JOIN generate_series(current_date - INTERVAL '89 days', current_date, INTERVAL '1 day') AS sales_day(sales_day)
ON CONFLICT (store_location_id, sales_date) DO NOTHING;

NOTIFY pgrst, 'reload schema';

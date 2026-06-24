/*
  # Store admin, inventory, and in-store points management

  Adds store-scoped administration tables so each branch can manage its own
  profile, product catalog, inventory intake logs, and point redemptions.
  All write access is enforced in Postgres RLS / SECURITY DEFINER helpers.
*/

ALTER TABLE public.store_locations
  ADD COLUMN IF NOT EXISTS manager_notes text NOT NULL DEFAULT '';

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS store_location_id uuid REFERENCES public.store_locations(id) ON DELETE SET NULL;

ALTER TABLE public.points
  ADD COLUMN IF NOT EXISTS store_location_id uuid REFERENCES public.store_locations(id) ON DELETE SET NULL;

ALTER TABLE public.points
  DROP CONSTRAINT IF EXISTS points_source_type_check;

ALTER TABLE public.points
  ADD CONSTRAINT points_source_type_check
  CHECK (source_type IS NULL OR source_type IN ('booking', 'order', 'subscription', 'manual', 'redemption', 'store_redemption'));

CREATE TABLE IF NOT EXISTS public.store_location_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_location_id uuid NOT NULL REFERENCES public.store_locations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'manager' CHECK (role IN ('manager', 'assistant', 'supervisor')),
  can_manage_store_info boolean NOT NULL DEFAULT true,
  can_manage_products boolean NOT NULL DEFAULT true,
  can_manage_inventory boolean NOT NULL DEFAULT true,
  can_manage_points boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_location_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_store_location_managers_store
  ON public.store_location_managers (store_location_id, is_active);

CREATE INDEX IF NOT EXISTS idx_store_location_managers_user
  ON public.store_location_managers (user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_products_store_location
  ON public.products (store_location_id, is_active, stock_quantity);

CREATE INDEX IF NOT EXISTS idx_points_store_location
  ON public.points (store_location_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.store_inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_location_id uuid NOT NULL REFERENCES public.store_locations(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  movement_type text NOT NULL CHECK (movement_type IN ('purchase', 'sale', 'adjustment_in', 'adjustment_out', 'transfer_in', 'transfer_out', 'writeoff')),
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_cost numeric NOT NULL DEFAULT 0,
  supplier_name text NOT NULL DEFAULT '',
  invoice_no text NOT NULL DEFAULT '',
  purchase_date date NOT NULL DEFAULT CURRENT_DATE,
  note text NOT NULL DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_inventory_movements_store_date
  ON public.store_inventory_movements (store_location_id, purchase_date DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_store_inventory_movements_product
  ON public.store_inventory_movements (product_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.store_point_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_location_id uuid NOT NULL REFERENCES public.store_locations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points_used integer NOT NULL CHECK (points_used > 0),
  discount_amount numeric NOT NULL DEFAULT 0,
  reference_type text NOT NULL DEFAULT 'store_purchase',
  reference_id uuid,
  note text NOT NULL DEFAULT '',
  used_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_point_redemptions_store_date
  ON public.store_point_redemptions (store_location_id, used_at DESC);

CREATE INDEX IF NOT EXISTS idx_store_point_redemptions_user_date
  ON public.store_point_redemptions (user_id, used_at DESC);

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
      )
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.refresh_store_product_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_product_id uuid;
  target_store_id uuid;
BEGIN
  target_product_id := COALESCE(NEW.product_id, OLD.product_id);
  target_store_id := COALESCE(NEW.store_location_id, OLD.store_location_id);

  UPDATE public.products
  SET stock_quantity = COALESCE((
    SELECT SUM(
      CASE
        WHEN movement_type IN ('purchase', 'adjustment_in', 'transfer_in') THEN quantity
        WHEN movement_type IN ('sale', 'adjustment_out', 'transfer_out', 'writeoff') THEN -quantity
        ELSE 0
      END
    )
    FROM public.store_inventory_movements
    WHERE product_id = target_product_id
      AND store_location_id = target_store_id
  ), 0),
  updated_at = now()
  WHERE id = target_product_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_store_product_stock ON public.store_inventory_movements;
CREATE TRIGGER trg_refresh_store_product_stock
AFTER INSERT OR UPDATE OR DELETE ON public.store_inventory_movements
FOR EACH ROW
EXECUTE FUNCTION private.refresh_store_product_stock();

CREATE OR REPLACE FUNCTION private.sync_store_point_redemption()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  current_balance integer := 0;
BEGIN
  IF NEW.points_used <= 0 THEN
    RAISE EXCEPTION 'Points used must be greater than zero';
  END IF;

  SELECT COALESCE(current_points, 0)
    INTO current_balance
  FROM public.member_point_balances
  WHERE user_id = NEW.user_id;

  IF current_balance < NEW.points_used THEN
    RAISE EXCEPTION 'Insufficient points for store redemption';
  END IF;

  INSERT INTO public.points (
    user_id,
    amount,
    transaction_type,
    reference_id,
    source_type,
    source_id,
    store_location_id,
    description,
    created_at
  ) VALUES (
    NEW.user_id,
    -NEW.points_used,
    'spent',
    NEW.id,
    'store_redemption',
    NEW.id,
    NEW.store_location_id,
    COALESCE(NULLIF(NEW.note, ''), 'Store points redemption'),
    NEW.used_at
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_store_point_redemption ON public.store_point_redemptions;
CREATE TRIGGER trg_sync_store_point_redemption
BEFORE INSERT ON public.store_point_redemptions
FOR EACH ROW
EXECUTE FUNCTION private.sync_store_point_redemption();

ALTER TABLE public.store_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_location_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_point_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_location_managers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_inventory_movements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_point_redemptions TO authenticated;

DROP POLICY IF EXISTS "Store managers can read managed store locations" ON public.store_locations;
CREATE POLICY "Store managers can read managed store locations"
  ON public.store_locations
  FOR SELECT
  TO authenticated
  USING (private.can_manage_store(id, 'info'));

DROP POLICY IF EXISTS "Store managers can update managed store locations" ON public.store_locations;
CREATE POLICY "Store managers can update managed store locations"
  ON public.store_locations
  FOR UPDATE
  TO authenticated
  USING (private.can_manage_store(id, 'info'))
  WITH CHECK (private.can_manage_store(id, 'info'));

DROP POLICY IF EXISTS "Store info managers can manage store managers" ON public.store_location_managers;
CREATE POLICY "Store info managers can manage store managers"
  ON public.store_location_managers
  FOR ALL
  TO authenticated
  USING (
    private.is_admin()
    OR private.can_manage_store(store_location_id, 'info')
  )
  WITH CHECK (
    private.is_admin()
    OR private.can_manage_store(store_location_id, 'info')
  );

DROP POLICY IF EXISTS "Store managers can view own assignments" ON public.store_location_managers;
CREATE POLICY "Store managers can view own assignments"
  ON public.store_location_managers
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR private.is_admin()
    OR private.can_manage_store(store_location_id, 'info')
  );

DROP POLICY IF EXISTS "Store managers can manage store products" ON public.products;
CREATE POLICY "Store managers can manage store products"
  ON public.products
  FOR ALL
  TO authenticated
  USING (
    store_location_id IS NOT NULL
    AND private.can_manage_store(store_location_id, 'products')
  )
  WITH CHECK (
    store_location_id IS NOT NULL
    AND private.can_manage_store(store_location_id, 'products')
  );

DROP POLICY IF EXISTS "Store managers can manage inventory movements" ON public.store_inventory_movements;
CREATE POLICY "Store managers can manage inventory movements"
  ON public.store_inventory_movements
  FOR ALL
  TO authenticated
  USING (
    private.can_manage_store(store_location_id, 'inventory')
    AND EXISTS (
      SELECT 1
      FROM public.products
      WHERE products.id = store_inventory_movements.product_id
        AND products.store_location_id = store_inventory_movements.store_location_id
    )
  )
  WITH CHECK (
    private.can_manage_store(store_location_id, 'inventory')
    AND EXISTS (
      SELECT 1
      FROM public.products
      WHERE products.id = store_inventory_movements.product_id
        AND products.store_location_id = store_inventory_movements.store_location_id
    )
  );

DROP POLICY IF EXISTS "Store managers can manage point redemptions" ON public.store_point_redemptions;
CREATE POLICY "Store managers can manage point redemptions"
  ON public.store_point_redemptions
  FOR ALL
  TO authenticated
  USING (private.can_manage_store(store_location_id, 'points'))
  WITH CHECK (
    private.can_manage_store(store_location_id, 'points')
    AND points_used > 0
  );

DROP POLICY IF EXISTS "Store managers can view store point redemptions" ON public.store_point_redemptions;
CREATE POLICY "Store managers can view store point redemptions"
  ON public.store_point_redemptions
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR private.can_manage_store(store_location_id, 'points')
  );

DROP POLICY IF EXISTS "Store managers can view store point ledger" ON public.points;
CREATE POLICY "Store managers can view store point ledger"
  ON public.points
  FOR SELECT
  TO authenticated
  USING (
    store_location_id IS NOT NULL
    AND private.can_manage_store(store_location_id, 'points')
  );

DROP POLICY IF EXISTS "Store managers can create product rows" ON public.products;
CREATE POLICY "Store managers can create product rows"
  ON public.products
  FOR INSERT
  TO authenticated
  WITH CHECK (
    store_location_id IS NOT NULL
    AND private.can_manage_store(store_location_id, 'products')
  );

DROP POLICY IF EXISTS "Store managers can update product rows" ON public.products;
CREATE POLICY "Store managers can update product rows"
  ON public.products
  FOR UPDATE
  TO authenticated
  USING (
    store_location_id IS NOT NULL
    AND private.can_manage_store(store_location_id, 'products')
  )
  WITH CHECK (
    store_location_id IS NOT NULL
    AND private.can_manage_store(store_location_id, 'products')
  );

DROP POLICY IF EXISTS "Store managers can delete product rows" ON public.products;
CREATE POLICY "Store managers can delete product rows"
  ON public.products
  FOR DELETE
  TO authenticated
  USING (
    store_location_id IS NOT NULL
    AND private.can_manage_store(store_location_id, 'products')
  );

NOTIFY pgrst, 'reload schema';

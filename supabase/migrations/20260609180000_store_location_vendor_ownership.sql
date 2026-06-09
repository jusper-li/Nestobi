/*
  # Store ownership belongs to vendors

  Adds a vendor ownership column to store_locations so each store can be
  attached to a vendor account. Store-scoped permissions keep using the same
  helper, but now vendor owners are treated as managers for their stores.
*/

ALTER TABLE public.store_locations
  ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_store_locations_vendor_id
  ON public.store_locations (vendor_id, is_active, sort_order);

CREATE OR REPLACE FUNCTION private.is_store_owner(store_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.store_locations locations
    JOIN public.vendors vendors ON vendors.id = locations.vendor_id
    WHERE locations.id = store_id
      AND vendors.user_id = auth.uid()
      AND vendors.is_active = true
  );
END;
$$;

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
      )
  );
END;
$$;

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

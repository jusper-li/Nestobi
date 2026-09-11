-- Ensure vendor product writes are authorized by the linked vendor account.
-- This policy is intentionally explicit so product creation does not depend on
-- store-location fields or a client supplied role.
DROP POLICY IF EXISTS "Vendors can create products by linked account" ON public.products;
CREATE POLICY "Vendors can create products by linked account"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.vendors AS vendor
      WHERE vendor.id = products.vendor_id
        AND vendor.user_id = (SELECT auth.uid())
    )
    OR private.is_admin()
  );

DROP POLICY IF EXISTS "Vendors can update products by linked account" ON public.products;
CREATE POLICY "Vendors can update products by linked account"
  ON public.products FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.vendors AS vendor
      WHERE vendor.id = products.vendor_id
        AND vendor.user_id = (SELECT auth.uid())
    )
    OR private.is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.vendors AS vendor
      WHERE vendor.id = products.vendor_id
        AND vendor.user_id = (SELECT auth.uid())
    )
    OR private.is_admin()
  );

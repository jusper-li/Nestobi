/*
  # Vendor product order policies

  Lets vendors read order rows and product purchase records linked to their own
  products. Vendors update line-item fulfillment status on purchase_records, not
  the full order, because one order may contain products from multiple vendors.
*/

GRANT SELECT ON public.orders TO authenticated;
GRANT SELECT, UPDATE ON public.purchase_records TO authenticated;

DROP POLICY IF EXISTS "vendors read own product orders" ON public.orders;
CREATE POLICY "vendors read own product orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.purchase_records
      JOIN public.products ON products.id = purchase_records.product_id
      JOIN public.vendors ON vendors.id = products.vendor_id
      WHERE purchase_records.order_id = orders.id
        AND vendors.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "vendors read own product purchase records" ON public.purchase_records;
CREATE POLICY "vendors read own product purchase records"
  ON public.purchase_records
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.products
      JOIN public.vendors ON vendors.id = products.vendor_id
      WHERE products.id = purchase_records.product_id
        AND vendors.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "vendors update own product purchase records" ON public.purchase_records;
CREATE POLICY "vendors update own product purchase records"
  ON public.purchase_records
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.products
      JOIN public.vendors ON vendors.id = products.vendor_id
      WHERE products.id = purchase_records.product_id
        AND vendors.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.products
      JOIN public.vendors ON vendors.id = products.vendor_id
      WHERE products.id = purchase_records.product_id
        AND vendors.user_id = (SELECT auth.uid())
    )
  );

CREATE INDEX IF NOT EXISTS idx_purchase_records_order_id ON public.purchase_records(order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_records_product_id ON public.purchase_records(product_id);

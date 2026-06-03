/*
  # Member after-sales tables

  Adds user-owned after-sales request, favorite, and review tables for product
  orders. All tables are exposed in public with RLS enabled.
*/

CREATE TABLE IF NOT EXISTS public.after_sales_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('return', 'refund')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'resolved', 'rejected', 'cancelled')),
  message text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, order_id, request_type)
);

CREATE TABLE IF NOT EXISTS public.product_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  purchase_record_id uuid NOT NULL REFERENCES public.purchase_records(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  rating integer NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, purchase_record_id)
);

CREATE INDEX IF NOT EXISTS idx_after_sales_requests_user_id ON public.after_sales_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_after_sales_requests_order_id ON public.after_sales_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_product_favorites_user_id ON public.product_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_product_favorites_product_id ON public.product_favorites(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON public.product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON public.product_reviews(product_id);

ALTER TABLE public.after_sales_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.after_sales_requests TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.product_favorites TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.product_reviews TO authenticated;

DROP POLICY IF EXISTS "users read own after sales requests" ON public.after_sales_requests;
CREATE POLICY "users read own after sales requests"
  ON public.after_sales_requests
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR private.is_admin());

DROP POLICY IF EXISTS "users create own after sales requests" ON public.after_sales_requests;
CREATE POLICY "users create own after sales requests"
  ON public.after_sales_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_id AND orders.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "users update pending after sales requests" ON public.after_sales_requests;
CREATE POLICY "users update pending after sales requests"
  ON public.after_sales_requests
  FOR UPDATE
  TO authenticated
  USING (private.is_admin() OR (user_id = auth.uid() AND status = 'pending'))
  WITH CHECK (
    private.is_admin()
    OR (
      user_id = auth.uid()
      AND status IN ('pending', 'cancelled')
      AND EXISTS (
        SELECT 1 FROM public.orders
        WHERE orders.id = order_id AND orders.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "users read own favorites" ON public.product_favorites;
CREATE POLICY "users read own favorites"
  ON public.product_favorites
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR private.is_admin());

DROP POLICY IF EXISTS "users create own favorites" ON public.product_favorites;
CREATE POLICY "users create own favorites"
  ON public.product_favorites
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users delete own favorites" ON public.product_favorites;
CREATE POLICY "users delete own favorites"
  ON public.product_favorites
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR private.is_admin());

DROP POLICY IF EXISTS "users read own product reviews" ON public.product_reviews;
CREATE POLICY "users read own product reviews"
  ON public.product_reviews
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR private.is_admin());

DROP POLICY IF EXISTS "users create own product reviews" ON public.product_reviews;
CREATE POLICY "users create own product reviews"
  ON public.product_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_id AND orders.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.purchase_records
      WHERE purchase_records.id = purchase_record_id
        AND purchase_records.user_id = auth.uid()
        AND purchase_records.order_id = product_reviews.order_id
        AND purchase_records.product_id = product_reviews.product_id
    )
  );

DROP POLICY IF EXISTS "users update own product reviews" ON public.product_reviews;
CREATE POLICY "users update own product reviews"
  ON public.product_reviews
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR private.is_admin())
  WITH CHECK (
    private.is_admin()
    OR (
      user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.purchase_records
        WHERE purchase_records.id = purchase_record_id
          AND purchase_records.user_id = auth.uid()
          AND purchase_records.order_id = product_reviews.order_id
          AND purchase_records.product_id = product_reviews.product_id
      )
    )
  );

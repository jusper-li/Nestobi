/*
  # Tighten after-sales table grants

  RLS protects rows, but table privileges should also be minimal for Data API
  exposure. Anonymous users should not access member after-sales tables.
*/

REVOKE ALL ON public.after_sales_requests FROM anon;
REVOKE ALL ON public.product_favorites FROM anon;
REVOKE ALL ON public.product_reviews FROM anon;

REVOKE ALL ON public.after_sales_requests FROM authenticated;
REVOKE ALL ON public.product_favorites FROM authenticated;
REVOKE ALL ON public.product_reviews FROM authenticated;

GRANT SELECT, INSERT, UPDATE ON public.after_sales_requests TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.product_favorites TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.product_reviews TO authenticated;

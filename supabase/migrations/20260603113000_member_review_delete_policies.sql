/*
  # Member review delete policies

  Allows members to remove their own product and room reviews from the member
  value cards. Admin access remains available through private.is_admin().
*/

GRANT DELETE ON public.product_reviews TO authenticated;
GRANT DELETE ON public.room_reviews TO authenticated;

DROP POLICY IF EXISTS "users delete own product reviews" ON public.product_reviews;
CREATE POLICY "users delete own product reviews"
  ON public.product_reviews
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR private.is_admin());

DROP POLICY IF EXISTS "users delete own room reviews" ON public.room_reviews;
CREATE POLICY "users delete own room reviews"
  ON public.room_reviews
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR private.is_admin());

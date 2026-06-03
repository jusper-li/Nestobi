/*
  # Unified favorites and room reviews

  Adds a cross-content favorite table for products, blog posts, rooms, and hotels.
  Keeps verified review flows separated by domain: product_reviews for purchased
  products, room_reviews for completed stays.
*/

CREATE TABLE IF NOT EXISTS public.member_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('product', 'blog_post', 'room', 'hotel')),
  target_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_type, target_id)
);

CREATE TABLE IF NOT EXISTS public.room_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES public.tbl_bookings(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.tbl_rooms(id) ON DELETE CASCADE,
  rating integer NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, booking_id)
);

INSERT INTO public.member_favorites (user_id, target_type, target_id, created_at)
SELECT user_id, 'product', product_id, created_at
FROM public.product_favorites
ON CONFLICT (user_id, target_type, target_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_member_favorites_user_id ON public.member_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_member_favorites_target ON public.member_favorites(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_room_reviews_user_id ON public.room_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_room_reviews_room_id ON public.room_reviews(room_id);

ALTER TABLE public.member_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_reviews ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.member_favorites FROM anon;
REVOKE ALL ON public.member_favorites FROM authenticated;
REVOKE ALL ON public.room_reviews FROM anon;
REVOKE ALL ON public.room_reviews FROM authenticated;

GRANT SELECT, INSERT, DELETE ON public.member_favorites TO authenticated;
GRANT SELECT ON public.room_reviews TO anon, authenticated;
GRANT INSERT, UPDATE ON public.room_reviews TO authenticated;

DROP POLICY IF EXISTS "users read own member favorites" ON public.member_favorites;
CREATE POLICY "users read own member favorites"
  ON public.member_favorites
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR private.is_admin());

DROP POLICY IF EXISTS "users create own member favorites" ON public.member_favorites;
CREATE POLICY "users create own member favorites"
  ON public.member_favorites
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users delete own member favorites" ON public.member_favorites;
CREATE POLICY "users delete own member favorites"
  ON public.member_favorites
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR private.is_admin());

DROP POLICY IF EXISTS "public read published product reviews" ON public.product_reviews;
CREATE POLICY "public read published product reviews"
  ON public.product_reviews
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

DROP POLICY IF EXISTS "public read published room reviews" ON public.room_reviews;
CREATE POLICY "public read published room reviews"
  ON public.room_reviews
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

DROP POLICY IF EXISTS "users create own room reviews" ON public.room_reviews;
CREATE POLICY "users create own room reviews"
  ON public.room_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.tbl_bookings
      WHERE tbl_bookings.id = booking_id
        AND tbl_bookings.user_id = auth.uid()
        AND tbl_bookings.room_id = room_reviews.room_id
        AND tbl_bookings.status = 'completed'
    )
  );

DROP POLICY IF EXISTS "users update own room reviews" ON public.room_reviews;
CREATE POLICY "users update own room reviews"
  ON public.room_reviews
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR private.is_admin())
  WITH CHECK (
    private.is_admin()
    OR (
      user_id = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM public.tbl_bookings
        WHERE tbl_bookings.id = booking_id
          AND tbl_bookings.user_id = auth.uid()
          AND tbl_bookings.room_id = room_reviews.room_id
          AND tbl_bookings.status = 'completed'
      )
    )
  );

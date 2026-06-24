/*
  # Add point reward rule management

  Centralizes earning logic for booking, product, and subscription purchases so
  admins can change reward rates from the dashboard without editing webhook code.
*/

CREATE TABLE IF NOT EXISTS public.point_reward_rules (
  source_type text PRIMARY KEY,
  label text NOT NULL,
  points_per_100 integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  notes text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.point_reward_rules (source_type, label, points_per_100, is_active, notes)
VALUES
  ('booking', '訂房回饋', 10, true, '每 100 元回饋 10 點'),
  ('order', '商城回饋', 5, true, '每 100 元回饋 5 點'),
  ('subscription', '定期便回饋', 5, true, '每 100 元回饋 5 點')
ON CONFLICT (source_type) DO UPDATE SET
  label = EXCLUDED.label,
  points_per_100 = EXCLUDED.points_per_100,
  is_active = EXCLUDED.is_active,
  notes = EXCLUDED.notes,
  updated_at = now();

ALTER TABLE public.point_reward_rules ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.point_reward_rules TO authenticated;

DROP POLICY IF EXISTS "Admins can view point reward rules" ON public.point_reward_rules;
CREATE POLICY "Admins can view point reward rules"
  ON public.point_reward_rules
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tbl_user_auth
      WHERE tbl_user_auth.user_id = (SELECT auth.uid())
        AND tbl_user_auth.role IN ('admin', 'superadmin')
    )
  );

DROP POLICY IF EXISTS "Admins can manage point reward rules" ON public.point_reward_rules;
CREATE POLICY "Admins can manage point reward rules"
  ON public.point_reward_rules
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tbl_user_auth
      WHERE tbl_user_auth.user_id = (SELECT auth.uid())
        AND tbl_user_auth.role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.tbl_user_auth
      WHERE tbl_user_auth.user_id = (SELECT auth.uid())
        AND tbl_user_auth.role IN ('admin', 'superadmin')
    )
  );

CREATE OR REPLACE FUNCTION public.calculate_point_reward_points(
  p_source_type text,
  p_amount numeric
)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_rate integer := 0;
  v_amount numeric := GREATEST(COALESCE(p_amount, 0), 0);
BEGIN
  SELECT points_per_100
    INTO v_rate
  FROM public.point_reward_rules
  WHERE source_type = p_source_type
    AND is_active = true
  LIMIT 1;

  IF v_rate IS NULL THEN
    v_rate := CASE p_source_type
      WHEN 'booking' THEN 10
      WHEN 'order' THEN 5
      WHEN 'subscription' THEN 5
      ELSE 0
    END;
  END IF;

  IF v_rate < 0 THEN
    v_rate := 0;
  END IF;

  RETURN (floor(v_amount / 100) * v_rate)::integer;
END;
$$;


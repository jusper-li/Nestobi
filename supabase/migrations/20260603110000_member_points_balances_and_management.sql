/*
  # Member points balances and management linkage

  Adds a cached member point balance table for summary cards and extends the
  point ledger with source/vendor metadata so vendor and admin portals can read
  linked reward usage.
*/

ALTER TABLE public.points
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS source_id uuid,
  ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

ALTER TABLE public.points
  DROP CONSTRAINT IF EXISTS points_source_type_check;

ALTER TABLE public.points
  ADD CONSTRAINT points_source_type_check
  CHECK (source_type IS NULL OR source_type IN ('booking', 'order', 'manual', 'redemption'));

CREATE TABLE IF NOT EXISTS public.member_point_balances (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_points integer NOT NULL DEFAULT 0,
  month_earned integer NOT NULL DEFAULT 0,
  month_used integer NOT NULL DEFAULT 0,
  expiring_points integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_points_vendor_id ON public.points(vendor_id);
CREATE INDEX IF NOT EXISTS idx_points_source ON public.points(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_points_expires_at ON public.points(expires_at);

ALTER TABLE public.points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_point_balances ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.points FROM anon;
REVOKE ALL ON public.points FROM authenticated;
REVOKE ALL ON public.member_point_balances FROM anon;
REVOKE ALL ON public.member_point_balances FROM authenticated;

GRANT SELECT, INSERT ON public.points TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.member_point_balances TO authenticated;

DROP POLICY IF EXISTS "Users can view own point balance" ON public.member_point_balances;
CREATE POLICY "Users can view own point balance"
  ON public.member_point_balances
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR private.is_admin());

DROP POLICY IF EXISTS "Admins can manage point balances" ON public.member_point_balances;
CREATE POLICY "Admins can manage point balances"
  ON public.member_point_balances
  FOR ALL
  TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "Vendors can view linked points" ON public.points;
CREATE POLICY "Vendors can view linked points"
  ON public.points
  FOR SELECT
  TO authenticated
  USING (
    vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION private.sync_member_point_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  INSERT INTO public.member_point_balances (
    user_id,
    current_points,
    month_earned,
    month_used,
    expiring_points,
    updated_at
  )
  VALUES (
    NEW.user_id,
    NEW.amount,
    CASE WHEN NEW.amount > 0 AND date_trunc('month', NEW.created_at) = date_trunc('month', now()) THEN NEW.amount ELSE 0 END,
    CASE WHEN NEW.amount < 0 AND date_trunc('month', NEW.created_at) = date_trunc('month', now()) THEN abs(NEW.amount) ELSE 0 END,
    CASE WHEN NEW.amount > 0 AND NEW.expires_at IS NOT NULL AND NEW.expires_at <= now() + interval '30 days' THEN NEW.amount ELSE 0 END,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    current_points = public.member_point_balances.current_points + NEW.amount,
    month_earned = public.member_point_balances.month_earned +
      CASE WHEN NEW.amount > 0 AND date_trunc('month', NEW.created_at) = date_trunc('month', now()) THEN NEW.amount ELSE 0 END,
    month_used = public.member_point_balances.month_used +
      CASE WHEN NEW.amount < 0 AND date_trunc('month', NEW.created_at) = date_trunc('month', now()) THEN abs(NEW.amount) ELSE 0 END,
    expiring_points = public.member_point_balances.expiring_points +
      CASE WHEN NEW.amount > 0 AND NEW.expires_at IS NOT NULL AND NEW.expires_at <= now() + interval '30 days' THEN NEW.amount ELSE 0 END,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_member_point_balance ON public.points;
CREATE TRIGGER trg_sync_member_point_balance
AFTER INSERT ON public.points
FOR EACH ROW
EXECUTE FUNCTION private.sync_member_point_balance();

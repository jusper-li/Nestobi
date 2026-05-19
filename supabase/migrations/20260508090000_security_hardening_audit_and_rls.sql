/*
  # Security hardening: audit logs and tighter public RLS

  Adds an admin activity log table and narrows broad public/authenticated read
  policies so vendor-owned draft or inactive records are not exposed through the
  Data API. Vendor and admin access remains available through explicit owner or
  role checks.
*/

CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_created_at
  ON public.admin_activity_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_entity
  ON public.admin_activity_logs(entity_type, entity_id);

ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can insert admin activity logs" ON public.admin_activity_logs;
CREATE POLICY "Admins can insert admin activity logs"
  ON public.admin_activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tbl_user_auth
      WHERE tbl_user_auth.user_id = auth.uid()
        AND tbl_user_auth.role IN ('admin', 'superadmin')
    )
  );

DROP POLICY IF EXISTS "Admins can read admin activity logs" ON public.admin_activity_logs;
CREATE POLICY "Admins can read admin activity logs"
  ON public.admin_activity_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tbl_user_auth
      WHERE tbl_user_auth.user_id = auth.uid()
        AND tbl_user_auth.role IN ('admin', 'superadmin')
    )
  );

DROP POLICY IF EXISTS "Authenticated users can view all vendors" ON public.vendors;
CREATE POLICY "Admins can view all vendors"
  ON public.vendors FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tbl_user_auth
      WHERE tbl_user_auth.user_id = auth.uid()
        AND tbl_user_auth.role IN ('admin', 'superadmin')
    )
  );

DROP POLICY IF EXISTS "Active products are publicly readable" ON public.products;
CREATE POLICY "Active products are publicly readable"
  ON public.products FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    OR vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.tbl_user_auth
      WHERE tbl_user_auth.user_id = auth.uid()
        AND tbl_user_auth.role IN ('admin', 'superadmin')
    )
  );

DROP POLICY IF EXISTS "Rooms are publicly readable" ON public.tbl_rooms;
CREATE POLICY "Rooms are publicly readable"
  ON public.tbl_rooms FOR SELECT
  TO anon, authenticated
  USING (
    is_available = true
    OR vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.tbl_user_auth
      WHERE tbl_user_auth.user_id = auth.uid()
        AND tbl_user_auth.role IN ('admin', 'superadmin')
    )
  );

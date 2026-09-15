CREATE TABLE IF NOT EXISTS public.user_line_accounts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, line_user_id text NOT NULL UNIQUE, line_display_name text NOT NULL DEFAULT '', line_picture_url text, is_active boolean NOT NULL DEFAULT true, bound_at timestamptz NOT NULL DEFAULT now(), unbound_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id));
ALTER TABLE public.user_line_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_line_accounts_select_own ON public.user_line_accounts FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE POLICY user_line_accounts_update_own ON public.user_line_accounts FOR UPDATE TO authenticated USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid());
GRANT SELECT,UPDATE ON public.user_line_accounts TO authenticated;

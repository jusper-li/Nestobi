/*
  # Fix points table permission mismatch (403 on insert)

  Problem:
  - `points` has RLS policies, but role-level table grants were not explicit.
  - PostgREST can return 403 when role privileges do not allow INSERT/SELECT.

  Fix:
  - Explicitly grant authenticated role read/write permissions needed by app.
  - Keep data safety via existing RLS policy (user_id must match auth.uid()).
*/

-- Ensure authenticated users can read and insert points rows.
GRANT SELECT, INSERT ON TABLE public.points TO authenticated;

-- Ensure public users cannot write points directly.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.points FROM anon;

-- Optional hardening: remove policy drift and keep the intended insert policy.
DROP POLICY IF EXISTS "System can insert points" ON public.points;
CREATE POLICY "System can insert points"
  ON public.points
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

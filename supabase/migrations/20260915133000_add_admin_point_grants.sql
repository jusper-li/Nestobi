ALTER TABLE public.points
  ADD COLUMN IF NOT EXISTS granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS grant_note text;

CREATE INDEX IF NOT EXISTS idx_points_granted_by ON public.points(granted_by);

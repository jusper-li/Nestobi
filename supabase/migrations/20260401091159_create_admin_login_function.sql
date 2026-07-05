/*
  # Legacy Password Admin Login Removed

  The backoffice now uses Supabase Auth email magic links.
  No password verification RPC should be created in the exposed public schema.
*/

DROP FUNCTION IF EXISTS public.verify_admin_login(text, text);

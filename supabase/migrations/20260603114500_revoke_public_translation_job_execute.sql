/*
  # Revoke public translation job execution

  SECURITY DEFINER helper is only for internal triggers and service-role work.
  Remove default PUBLIC execute grants so it cannot be called through RPC.
*/

REVOKE EXECUTE ON FUNCTION public.enqueue_translation_job(text, uuid, jsonb, text, text[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_translation_job(text, uuid, jsonb, text, text[]) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_translation_job(text, uuid, jsonb, text, text[]) TO postgres, service_role;

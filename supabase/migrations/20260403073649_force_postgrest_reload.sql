/*
  # Force PostgREST Schema Cache Reload
  
  1. Purpose
    - Create a simple function to trigger PostgREST schema cache update
    - This function can be called via the API to verify connectivity
  
  2. Changes
    - Creates a health check function
    - Grants execute permissions to anon and authenticated roles
*/

-- Create a simple health check function
CREATE OR REPLACE FUNCTION public.api_health_check()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'status', 'ok',
    'timestamp', now(),
    'tables', (
      SELECT jsonb_agg(tablename)
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename IN ('languages', 'homepage_sections', 'site_settings', 'products')
    )
  );
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.api_health_check() TO anon, authenticated;

-- Add comment to trigger schema reload
COMMENT ON FUNCTION public.api_health_check() IS 'Health check endpoint for API connectivity';

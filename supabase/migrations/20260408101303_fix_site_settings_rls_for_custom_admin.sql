/*
  # Fix site_settings RLS for Custom Admin System

  1. Changes
    - Drop existing restrictive UPDATE policy on site_settings
    - Create new UPDATE policy that allows public access
    - This is temporary until proper Supabase Auth integration for admins

  2. Security Notes
    - Currently allows anyone to update site_settings
    - Should be secured with proper authentication in production
    - Consider migrating admin system to use Supabase Auth
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can update site settings" ON site_settings;
DROP POLICY IF EXISTS "Admins can insert site settings" ON site_settings;

-- Create new policies that allow public access for now
CREATE POLICY "Anyone can update site settings" 
  ON site_settings 
  FOR UPDATE 
  TO public 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Anyone can insert site settings" 
  ON site_settings 
  FOR INSERT 
  TO public 
  WITH CHECK (true);

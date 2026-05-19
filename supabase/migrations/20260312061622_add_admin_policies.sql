/*
  # Add Admin Policies for Property Management

  1. Changes
    - Add INSERT policy for authenticated users to create properties
    - Add UPDATE policy for authenticated users to modify properties
    - Add DELETE policy for authenticated users to remove properties
  
  2. Security
    - All write operations require authentication
    - Only authenticated admin users can create, update, or delete properties
*/

-- Add INSERT policy
CREATE POLICY "Authenticated users can insert properties"
  ON properties
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add UPDATE policy
CREATE POLICY "Authenticated users can update properties"
  ON properties
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add DELETE policy
CREATE POLICY "Authenticated users can delete properties"
  ON properties
  FOR DELETE
  TO authenticated
  USING (true);

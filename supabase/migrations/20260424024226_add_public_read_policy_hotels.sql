/*
  # Add public read policy for hotels

  ## Summary
  The hotels table currently only allows vendors and admins to read hotel records.
  The public /rooms page joins tbl_rooms → hotels to display the hotel name on each
  room card, but unauthenticated visitors have no read access so the join returns null.

  This migration adds a policy that allows anyone (anon + authenticated) to read
  active hotels so the hotel name appears on the public-facing rooms list and detail pages.

  ## Security Changes
  - `hotels` table: new SELECT policy for anon/authenticated roles limited to is_active = true rows
*/

CREATE POLICY "Public can view active hotels"
  ON hotels FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

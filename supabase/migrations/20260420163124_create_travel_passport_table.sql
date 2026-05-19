/*
  # Create travel_passport table

  ## Summary
  Stores user travel stamps — places they have visited, either added manually or
  marked from a generated itinerary. Powers the "旅遊護照" (Travel Passport) feature.

  ## New Tables
  - `travel_passport`
    - `id` (uuid, PK)
    - `user_id` (uuid, FK → auth.users)
    - `place_name` (text) — name of the visited spot
    - `destination` (text) — city / country
    - `visited_date` (date, nullable) — when it was visited
    - `category` (text) — food / culture / nature / shopping / adventure / nightlife
    - `notes` (text) — personal notes / memories
    - `source` (text) — 'manual' | 'itinerary'
    - `itinerary_plan_id` (uuid, nullable) — link back to saved itinerary
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled
  - Authenticated users can only read / write their own stamps
*/

CREATE TABLE IF NOT EXISTS travel_passport (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  place_name        text NOT NULL,
  destination       text NOT NULL DEFAULT '',
  visited_date      date,
  category          text NOT NULL DEFAULT 'culture',
  notes             text NOT NULL DEFAULT '',
  source            text NOT NULL DEFAULT 'manual',
  itinerary_plan_id uuid,
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE travel_passport ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own passport stamps"
  ON travel_passport FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own passport stamps"
  ON travel_passport FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own passport stamps"
  ON travel_passport FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own passport stamps"
  ON travel_passport FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_travel_passport_user_id ON travel_passport(user_id);

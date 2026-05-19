/*
  # AI Features Tables

  1. New Tables
    - `itinerary_plans` - User travel itineraries created via AI planner
    - `translations` - Translation request history (source/target text + languages)
    - `tbl_mn5wn257` - AI customer service chat messages (session-based)
    - `user_usage` - Per-user AI feature usage tracking for analytics

  2. Security
    - All data is private per user
    - Admins can read all usage data for analytics
*/

CREATE TABLE IF NOT EXISTS itinerary_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '我的行程',
  destination text DEFAULT '',
  start_date date,
  end_date date,
  interests text[] DEFAULT '{}',
  plan_data jsonb DEFAULT '{}',
  status text DEFAULT 'draft',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE itinerary_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own itineraries"
  ON itinerary_plans FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own itineraries"
  ON itinerary_plans FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own itineraries"
  ON itinerary_plans FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own itineraries"
  ON itinerary_plans FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  source_text text NOT NULL DEFAULT '',
  translated_text text DEFAULT '',
  source_lang text DEFAULT 'zh-TW',
  target_lang text DEFAULT 'en',
  status text DEFAULT 'completed',
  error_message text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own translations"
  ON translations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own translations"
  ON translations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS tbl_mn5wn257 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL DEFAULT gen_random_uuid(),
  role text NOT NULL DEFAULT 'user',
  content text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tbl_mn5wn257 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chat messages"
  ON tbl_mn5wn257 FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own chat messages"
  ON tbl_mn5wn257 FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS user_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_type text NOT NULL,
  usage_count integer DEFAULT 1,
  last_used_at timestamptz DEFAULT now(),
  UNIQUE(user_id, feature_type)
);

ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage"
  ON user_usage FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM tbl_user_auth
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Users can insert own usage"
  ON user_usage FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own usage"
  ON user_usage FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_itinerary_user_id ON itinerary_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_tbl_mn5wn257_session ON tbl_mn5wn257(session_id);

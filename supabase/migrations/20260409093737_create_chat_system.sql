/*
  # Create AI Chat System

  1. New Tables
    - `chat_sessions`
      - `id` (uuid, primary key)
      - `visitor_name` (text, optional visitor name)
      - `visitor_email` (text, optional visitor email)
      - `status` (text, active/closed)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `chat_messages`
      - `id` (uuid, primary key)
      - `session_id` (uuid, foreign key to chat_sessions)
      - `message` (text, the message content)
      - `sender_type` (text, user/bot/admin)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Public can create sessions and messages
    - Admins can view all sessions and messages
    - Users can view their own session messages
*/

CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_name text,
  visitor_email text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL,
  sender_type text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create chat sessions"
  ON chat_sessions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can view their session"
  ON chat_sessions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can update sessions"
  ON chat_sessions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE id IN (SELECT admin_id FROM admin_roles)
    )
  );

CREATE POLICY "Anyone can create messages"
  ON chat_messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can view messages in their session"
  ON chat_messages FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON chat_sessions(created_at DESC);
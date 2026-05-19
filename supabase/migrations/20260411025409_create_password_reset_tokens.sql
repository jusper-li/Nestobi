/*
  # Create password_reset_tokens table

  ## Purpose
  Supports a custom password reset flow where tokens are generated, stored,
  and validated independently of Supabase's built-in reset system, enabling
  Resend-powered custom-branded password reset emails.

  ## New Tables
  - `password_reset_tokens`
    - `id` (uuid, primary key)
    - `email` (text) – the email that requested the reset
    - `token` (text, unique) – secure random UUID-based token
    - `expires_at` (timestamptz) – token valid for 30 minutes
    - `used_at` (timestamptz, nullable) – set when token is consumed
    - `created_at` (timestamptz) – audit timestamp

  ## Security
  - RLS enabled; no public policies (accessed only via service role key in edge functions)
*/

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

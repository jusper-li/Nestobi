/*
  # Default Admin Seed Removed

  Password-based default admin accounts are intentionally not created.
  Create the admin user in Supabase Auth, then add the matching email to
  `public.admins` with `login_method = 'email_magic_link'`.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

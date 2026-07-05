/*
  # Admin Authentication and Authorization System

  1. New Tables
    - `admins`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `password_hash` (text)
      - `name` (text)
      - `avatar_url` (text, nullable)
      - `is_active` (boolean, default true)
      - `last_login_at` (timestamptz, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `roles`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `description` (text)
      - `created_at` (timestamptz)
    
    - `permissions`
      - `id` (uuid, primary key)
      - `module` (text) - e.g., 'members', 'products', 'orders'
      - `action` (text) - e.g., 'view', 'create', 'update', 'delete'
      - `description` (text)
      - `created_at` (timestamptz)
    
    - `role_permissions`
      - `role_id` (uuid, foreign key)
      - `permission_id` (uuid, foreign key)
      - Primary key: (role_id, permission_id)
    
    - `admin_roles`
      - `admin_id` (uuid, foreign key)
      - `role_id` (uuid, foreign key)
      - Primary key: (admin_id, role_id)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated admins
*/

-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  name text NOT NULL,
  avatar_url text,
  is_active boolean DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module text NOT NULL,
  action text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(module, action)
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- Create admin_roles junction table
CREATE TABLE IF NOT EXISTS admin_roles (
  admin_id uuid REFERENCES admins(id) ON DELETE CASCADE,
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (admin_id, role_id)
);

-- Enable RLS
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to admins table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_admins_updated_at'
  ) THEN
    CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Insert default roles
INSERT INTO roles (name, description) VALUES
  ('super_admin', 'Super administrator with full access'),
  ('admin', 'Administrator with limited access'),
  ('editor', 'Content editor'),
  ('viewer', 'Read-only access')
ON CONFLICT (name) DO NOTHING;

-- Insert default permissions for all modules
INSERT INTO permissions (module, action, description) VALUES
  -- Dashboard
  ('dashboard', 'view', 'View dashboard'),
  
  -- Members
  ('members', 'view', 'View members'),
  ('members', 'create', 'Create members'),
  ('members', 'update', 'Update members'),
  ('members', 'delete', 'Delete members'),
  
  -- Products
  ('products', 'view', 'View products'),
  ('products', 'create', 'Create products'),
  ('products', 'update', 'Update products'),
  ('products', 'delete', 'Delete products'),
  
  -- Orders
  ('orders', 'view', 'View orders'),
  ('orders', 'create', 'Create orders'),
  ('orders', 'update', 'Update orders'),
  ('orders', 'delete', 'Delete orders'),
  
  -- Payments
  ('payments', 'view', 'View payments'),
  ('payments', 'manage', 'Manage payments'),
  
  -- Stores
  ('stores', 'view', 'View stores'),
  ('stores', 'create', 'Create stores'),
  ('stores', 'update', 'Update stores'),
  ('stores', 'delete', 'Delete stores'),
  
  -- Articles
  ('articles', 'view', 'View articles'),
  ('articles', 'create', 'Create articles'),
  ('articles', 'update', 'Update articles'),
  ('articles', 'delete', 'Delete articles'),
  
  -- FAQ
  ('faq', 'view', 'View FAQ'),
  ('faq', 'create', 'Create FAQ'),
  ('faq', 'update', 'Update FAQ'),
  ('faq', 'delete', 'Delete FAQ'),
  
  -- Homepage
  ('homepage', 'view', 'View homepage settings'),
  ('homepage', 'update', 'Update homepage settings'),
  
  -- Social
  ('social', 'view', 'View social accounts'),
  ('social', 'update', 'Update social accounts'),
  
  -- Languages
  ('languages', 'view', 'View languages'),
  ('languages', 'update', 'Update languages'),
  
  -- SEO
  ('seo', 'view', 'View SEO settings'),
  ('seo', 'update', 'Update SEO settings'),
  
  -- AI Chat
  ('ai_chat', 'view', 'View AI chat logs'),
  ('ai_chat', 'manage', 'Manage AI chat'),
  
  -- AI Analytics
  ('ai_analytics', 'view', 'View AI usage analytics'),
  
  -- Permissions
  ('permissions', 'view', 'View permissions'),
  ('permissions', 'manage', 'Manage permissions')
ON CONFLICT (module, action) DO NOTHING;

-- Grant all permissions to super_admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin'
ON CONFLICT DO NOTHING;
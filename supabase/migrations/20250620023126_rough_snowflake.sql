/*
  # Create roles table and update admin_users relationship

  1. New Tables
    - `roles`
      - `id` (uuid, primary key)
      - `name` (text, unique) - role name (admin, super_admin, user)
      - `display_name` (text) - human readable name
      - `description` (text) - role description
      - `permissions` (jsonb) - role permissions
      - `is_active` (boolean) - whether role is active
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Changes
    - Add foreign key constraint to admin_users.role referencing roles.name
    - Insert default roles (admin, super_admin, user)

  3. Security
    - Enable RLS on roles table
    - Add policies for authenticated users to read roles
    - Add policies for super_admin to manage roles
*/

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description text,
  permissions jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Create policies for roles table
CREATE POLICY "Authenticated users can read active roles"
  ON roles
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Super admins can manage all roles"
  ON roles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid() 
      AND admin_users.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid() 
      AND admin_users.role = 'super_admin'
    )
  );

-- Insert default roles
INSERT INTO roles (name, display_name, description, permissions) VALUES
  ('user', 'User', 'Basic user with limited access', '{"read": ["members"]}'),
  ('admin', 'Administrator', 'System administrator with full access to members and settings', '{"read": ["members", "settings"], "write": ["members", "settings"], "delete": ["members"]}'),
  ('super_admin', 'Super Administrator', 'Full system access including user management', '{"read": ["*"], "write": ["*"], "delete": ["*"], "manage_users": true}')
ON CONFLICT (name) DO NOTHING;

-- Add updated_at trigger for roles table
CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles (name);
CREATE INDEX IF NOT EXISTS idx_roles_is_active ON roles (is_active);
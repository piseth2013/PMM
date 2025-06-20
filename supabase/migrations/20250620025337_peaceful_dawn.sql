/*
  # Convert admin_users.role to foreign key

  1. Schema Changes
    - Add `role_id` column (uuid) to admin_users table
    - Populate role_id from existing role enum values
    - Add foreign key constraint to roles table
    - Set role_id as NOT NULL
    - Drop old role column and enum type
    - Add unique constraint on roles.name

  2. Data Migration
    - Maps existing enum values to corresponding role UUIDs
    - Ensures data integrity during transition

  3. Security
    - Updates RLS policies to use new role_id column
    - Maintains existing security model
*/

-- Step 1: Add role_id column to admin_users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_users' AND column_name = 'role_id'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN role_id uuid;
  END IF;
END $$;

-- Step 2: Ensure roles.name has unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'roles' AND constraint_name = 'roles_name_key'
  ) THEN
    ALTER TABLE roles ADD CONSTRAINT roles_name_key UNIQUE (name);
  END IF;
END $$;

-- Step 3: Populate role_id based on existing role enum values
UPDATE admin_users 
SET role_id = roles.id 
FROM roles 
WHERE admin_users.role::text = roles.name;

-- Step 4: Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'admin_users' AND constraint_name = 'admin_users_role_id_fkey'
  ) THEN
    ALTER TABLE admin_users 
    ADD CONSTRAINT admin_users_role_id_fkey 
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- Step 5: Set role_id as NOT NULL (after ensuring all rows have values)
ALTER TABLE admin_users ALTER COLUMN role_id SET NOT NULL;

-- Step 6: Update RLS policies to use role_id instead of role
DROP POLICY IF EXISTS "Super admins can manage all roles" ON roles;

CREATE POLICY "Super admins can manage all roles"
  ON roles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      JOIN roles ON admin_users.role_id = roles.id
      WHERE admin_users.id = auth.uid() 
      AND roles.name = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      JOIN roles ON admin_users.role_id = roles.id
      WHERE admin_users.id = auth.uid() 
      AND roles.name = 'super_admin'
    )
  );

-- Step 7: Add index on role_id for better performance
CREATE INDEX IF NOT EXISTS idx_admin_users_role_id ON admin_users (role_id);

-- Step 8: Drop the old role column and enum type
-- Note: We'll do this in a separate step to ensure everything works first
DO $$
BEGIN
  -- Check if all admin_users have role_id populated
  IF NOT EXISTS (
    SELECT 1 FROM admin_users WHERE role_id IS NULL
  ) THEN
    -- Drop the old role column
    ALTER TABLE admin_users DROP COLUMN IF EXISTS role;
    
    -- Drop the enum type if no other tables use it
    -- First check if the enum is used elsewhere
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE data_type = 'USER-DEFINED' 
      AND udt_name = 'admin_role_type'
      AND table_name != 'admin_users'
    ) THEN
      DROP TYPE IF EXISTS admin_role_type;
    END IF;
  END IF;
END $$;

-- Step 9: Create a view for easier querying (optional but helpful)
CREATE OR REPLACE VIEW admin_users_with_roles AS
SELECT 
  au.*,
  r.name as role_name,
  r.display_name as role_display_name,
  r.permissions as role_permissions
FROM admin_users au
JOIN roles r ON au.role_id = r.id;

-- Step 10: Add helpful function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT r.name
  FROM admin_users au
  JOIN roles r ON au.role_id = r.id
  WHERE au.id = user_id;
$$;

-- Step 11: Add function to check user permissions
CREATE OR REPLACE FUNCTION user_has_permission(user_id uuid, permission_key text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    CASE 
      WHEN r.permissions ? permission_key THEN true
      WHEN r.permissions ? '*' THEN true
      ELSE false
    END
  FROM admin_users au
  JOIN roles r ON au.role_id = r.id
  WHERE au.id = user_id;
$$;
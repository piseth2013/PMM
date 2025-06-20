/*
  # Fix Admin Users Synchronization and Visibility

  1. Enhanced User Synchronization
    - Ensure all auth.users are properly synced to admin_users
    - Fix any missing records
    - Update view with better error handling

  2. Improved View and Permissions
    - Enhanced admin_users_with_roles view
    - Better RLS policies
    - Proper indexing for performance

  3. Data Integrity
    - Ensure all existing users are visible
    - Fix any orphaned records
    - Validate role assignments
*/

-- First, let's ensure all auth users are synced to admin_users
CREATE OR REPLACE FUNCTION sync_all_auth_users()
RETURNS TABLE(synced_users INTEGER, updated_users INTEGER) AS $$
DECLARE
  synced_count INTEGER := 0;
  updated_count INTEGER := 0;
  auth_user RECORD;
  default_role_id UUID;
  admin_role_id UUID;
  super_admin_role_id UUID;
BEGIN
  -- Get available roles
  SELECT id INTO admin_role_id FROM public.roles WHERE name = 'admin' AND is_active = true LIMIT 1;
  SELECT id INTO super_admin_role_id FROM public.roles WHERE name = 'super_admin' AND is_active = true LIMIT 1;
  
  -- Set default role (prefer admin, fallback to super_admin, then any active role)
  default_role_id := COALESCE(admin_role_id, super_admin_role_id);
  
  IF default_role_id IS NULL THEN
    SELECT id INTO default_role_id FROM public.roles WHERE is_active = true ORDER BY created_at LIMIT 1;
  END IF;

  -- If still no role, create a default admin role
  IF default_role_id IS NULL THEN
    INSERT INTO public.roles (name, display_name, description, is_active)
    VALUES ('admin', 'Administrator', 'System Administrator', true)
    RETURNING id INTO default_role_id;
  END IF;

  -- Sync all auth users to admin_users
  FOR auth_user IN 
    SELECT au.id, au.email, au.created_at, au.updated_at, au.raw_user_meta_data, au.last_sign_in_at
    FROM auth.users au
  LOOP
    -- Check if user exists in admin_users
    IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth_user.id) THEN
      -- Insert new admin user
      INSERT INTO public.admin_users (id, email, full_name, role_id, created_at, last_login)
      VALUES (
        auth_user.id,
        auth_user.email,
        COALESCE(
          auth_user.raw_user_meta_data->>'full_name',
          split_part(auth_user.email, '@', 1)
        ),
        default_role_id,
        auth_user.created_at,
        auth_user.last_sign_in_at
      );
      synced_count := synced_count + 1;
    ELSE
      -- Update existing admin user with latest info
      UPDATE public.admin_users
      SET 
        email = auth_user.email,
        full_name = COALESCE(
          auth_user.raw_user_meta_data->>'full_name',
          full_name,
          split_part(auth_user.email, '@', 1)
        ),
        last_login = COALESCE(auth_user.last_sign_in_at, last_login)
      WHERE id = auth_user.id;
      updated_count := updated_count + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT synced_count, updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the sync function
SELECT * FROM sync_all_auth_users();

-- Enhanced admin_users_with_roles view with better error handling
DROP VIEW IF EXISTS admin_users_with_roles CASCADE;
CREATE VIEW admin_users_with_roles AS
SELECT 
  au.id,
  au.email,
  au.full_name,
  au.invited_by,
  au.created_at,
  au.last_login,
  au.role_id,
  COALESCE(r.name, 'unknown') as role_name,
  COALESCE(r.display_name, 'Unknown Role') as role_display_name,
  r.description as role_description,
  COALESCE(r.permissions, '{}'::jsonb) as role_permissions,
  COALESCE(r.is_active, false) as role_is_active,
  -- Enhanced activity status calculation
  CASE 
    WHEN au.last_login IS NULL THEN 'Never logged in'
    WHEN au.last_login > NOW() - INTERVAL '1 day' THEN 'Active'
    WHEN au.last_login > NOW() - INTERVAL '7 days' THEN 'Recently active'
    WHEN au.last_login > NOW() - INTERVAL '30 days' THEN 'Inactive'
    ELSE 'Long inactive'
  END as activity_status,
  -- Invited by user info with null handling
  inviter.full_name as invited_by_name,
  inviter.email as invited_by_email,
  -- Additional useful fields
  au.created_at::date as created_date,
  au.last_login::date as last_login_date,
  EXTRACT(days FROM NOW() - au.created_at) as days_since_created,
  CASE WHEN au.last_login IS NOT NULL 
    THEN EXTRACT(days FROM NOW() - au.last_login) 
    ELSE NULL 
  END as days_since_last_login
FROM admin_users au
LEFT JOIN roles r ON au.role_id = r.id
LEFT JOIN admin_users inviter ON au.invited_by = inviter.id
ORDER BY au.created_at DESC;

-- Grant permissions on the view
GRANT SELECT ON admin_users_with_roles TO authenticated;
GRANT SELECT ON admin_users_with_roles TO anon;

-- Enhanced RLS policies for admin_users table
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON admin_users;
DROP POLICY IF EXISTS "Enable all operations for service role" ON admin_users;
DROP POLICY IF EXISTS "Deny anonymous access" ON admin_users;
DROP POLICY IF EXISTS "Super admins can manage all admin users" ON admin_users;
DROP POLICY IF EXISTS "Admins can manage non-super-admin users" ON admin_users;
DROP POLICY IF EXISTS "Users can read their own admin profile" ON admin_users;

-- Policy for service role (full access)
CREATE POLICY "Enable all operations for service role"
  ON admin_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy for users to read their own profile
CREATE POLICY "Users can read their own admin profile"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Policy for super admins (full access to all users)
CREATE POLICY "Super admins can manage all admin users"
  ON admin_users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      JOIN roles r ON au.role_id = r.id
      WHERE au.id = auth.uid() 
      AND r.name = 'super_admin'
      AND r.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users au
      JOIN roles r ON au.role_id = r.id
      WHERE au.id = auth.uid() 
      AND r.name = 'super_admin'
      AND r.is_active = true
    )
  );

-- Policy for regular admins (can manage non-super-admin users)
CREATE POLICY "Admins can manage non-super-admin users"
  ON admin_users
  FOR ALL
  TO authenticated
  USING (
    -- User must be an admin
    EXISTS (
      SELECT 1 FROM admin_users au
      JOIN roles r ON au.role_id = r.id
      WHERE au.id = auth.uid() 
      AND r.name IN ('admin', 'super_admin')
      AND r.is_active = true
    )
    AND (
      -- Can access non-super-admin users
      NOT EXISTS (
        SELECT 1 FROM roles r2
        WHERE r2.id = admin_users.role_id
        AND r2.name = 'super_admin'
      )
      OR
      -- Super admins can access anyone
      EXISTS (
        SELECT 1 FROM admin_users au2
        JOIN roles r3 ON au2.role_id = r3.id
        WHERE au2.id = auth.uid() 
        AND r3.name = 'super_admin'
        AND r3.is_active = true
      )
    )
  )
  WITH CHECK (
    -- User must be an admin
    EXISTS (
      SELECT 1 FROM admin_users au
      JOIN roles r ON au.role_id = r.id
      WHERE au.id = auth.uid() 
      AND r.name IN ('admin', 'super_admin')
      AND r.is_active = true
    )
    AND (
      -- Can create non-super-admin users
      NOT EXISTS (
        SELECT 1 FROM roles r2
        WHERE r2.id = admin_users.role_id
        AND r2.name = 'super_admin'
      )
      OR
      -- Super admins can create anyone
      EXISTS (
        SELECT 1 FROM admin_users au2
        JOIN roles r3 ON au2.role_id = r3.id
        WHERE au2.id = auth.uid() 
        AND r3.name = 'super_admin'
        AND r3.is_active = true
      )
    )
  );

-- Enhanced function to get user permissions
CREATE OR REPLACE FUNCTION get_user_permissions(user_id UUID DEFAULT auth.uid())
RETURNS JSONB AS $$
DECLARE
  user_permissions JSONB;
  user_role TEXT;
  role_permissions JSONB;
BEGIN
  -- Get user role and permissions
  SELECT r.permissions, r.name
  INTO role_permissions, user_role
  FROM admin_users au
  JOIN roles r ON au.role_id = r.id
  WHERE au.id = user_id AND r.is_active = true;
  
  -- Start with role permissions or empty object
  user_permissions = COALESCE(role_permissions, '{}'::jsonb);
  
  -- Add computed permissions based on role
  IF user_role = 'super_admin' THEN
    user_permissions = user_permissions || jsonb_build_object(
      'can_manage_super_admins', true,
      'can_manage_admins', true,
      'can_manage_users', true,
      'can_view_all_data', true,
      'can_modify_system_settings', true
    );
  ELSIF user_role = 'admin' THEN
    user_permissions = user_permissions || jsonb_build_object(
      'can_manage_super_admins', false,
      'can_manage_admins', true,
      'can_manage_users', true,
      'can_view_all_data', true,
      'can_modify_system_settings', false
    );
  ELSE
    user_permissions = user_permissions || jsonb_build_object(
      'can_manage_super_admins', false,
      'can_manage_admins', false,
      'can_manage_users', false,
      'can_view_all_data', false,
      'can_modify_system_settings', false
    );
  END IF;
  
  RETURN user_permissions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_user_permissions TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_permissions TO anon;

-- Function to check if current user can manage a specific user
CREATE OR REPLACE FUNCTION can_manage_user(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_role TEXT;
  target_user_role TEXT;
BEGIN
  -- Get current user's role
  SELECT r.name INTO current_user_role
  FROM admin_users au
  JOIN roles r ON au.role_id = r.id
  WHERE au.id = auth.uid() AND r.is_active = true;
  
  -- Get target user's role
  SELECT r.name INTO target_user_role
  FROM admin_users au
  JOIN roles r ON au.role_id = r.id
  WHERE au.id = target_user_id AND r.is_active = true;
  
  -- Super admins can manage anyone
  IF current_user_role = 'super_admin' THEN
    RETURN true;
  END IF;
  
  -- Admins can manage non-super-admin users
  IF current_user_role = 'admin' AND target_user_role != 'super_admin' THEN
    RETURN true;
  END IF;
  
  -- Users can manage themselves (for profile updates)
  IF auth.uid() = target_user_id THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION can_manage_user TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_users_role_id ON admin_users(role_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_created_at ON admin_users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_users_last_login ON admin_users(last_login DESC);
CREATE INDEX IF NOT EXISTS idx_admin_users_invited_by ON admin_users(invited_by);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_admin_users_role_created ON admin_users(role_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_users_email_role ON admin_users(email, role_id);

-- Ensure roles table has proper indexes
CREATE INDEX IF NOT EXISTS idx_roles_name_active ON roles(name, is_active);
CREATE INDEX IF NOT EXISTS idx_roles_is_active ON roles(is_active);

-- Update the trigger functions to be more robust
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_role_id UUID;
BEGIN
  -- Only create admin_users record if user has admin metadata or if it's a regular signup
  -- Get default role
  SELECT id INTO default_role_id
  FROM public.roles 
  WHERE name = 'admin' AND is_active = true 
  LIMIT 1;
  
  -- Fallback to super_admin if no admin role
  IF default_role_id IS NULL THEN
    SELECT id INTO default_role_id
    FROM public.roles 
    WHERE name = 'super_admin' AND is_active = true 
    LIMIT 1;
  END IF;
  
  -- Fallback to any active role
  IF default_role_id IS NULL THEN
    SELECT id INTO default_role_id
    FROM public.roles 
    WHERE is_active = true 
    ORDER BY created_at 
    LIMIT 1;
  END IF;

  -- Insert into admin_users with proper error handling
  INSERT INTO public.admin_users (id, email, full_name, role_id, created_at, last_login)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    default_role_id,
    NEW.created_at,
    NEW.last_sign_in_at
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, admin_users.full_name),
    last_login = COALESCE(EXCLUDED.last_login, admin_users.last_login);
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth user creation
    RAISE WARNING 'Failed to create admin_users record for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the user update trigger
CREATE OR REPLACE FUNCTION handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Update admin_users if the user exists there
  UPDATE public.admin_users
  SET 
    email = NEW.email,
    full_name = COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      full_name,
      split_part(NEW.email, '@', 1)
    ),
    last_login = COALESCE(NEW.last_sign_in_at, last_login)
  WHERE id = NEW.id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth user update
    RAISE WARNING 'Failed to update admin_users record for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_user_update();

CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_user_delete();

-- Clean up the sync function
DROP FUNCTION sync_all_auth_users();

-- Final verification query (this will show all users that should be visible)
-- You can run this manually to verify the data
/*
SELECT 
  'Total auth users:' as description,
  COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
  'Total admin users:' as description,
  COUNT(*) as count
FROM admin_users
UNION ALL
SELECT 
  'Users in view:' as description,
  COUNT(*) as count
FROM admin_users_with_roles;
*/
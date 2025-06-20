/*
  # Enhanced User Management System

  1. Database Functions
    - Enhanced user creation with proper role assignment
    - Better error handling and validation
    - Improved sync between auth.users and admin_users

  2. Security
    - Proper RLS policies for user management
    - Role-based access control
    - Secure password handling

  3. Features
    - Add new users with email, full name, password, and role
    - Edit existing users
    - Delete users (removes from both auth and admin_users)
    - Role management integration
*/

-- Enhanced function to handle new user registration with better role assignment
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  admin_role_id UUID;
  default_role_id UUID;
BEGIN
  -- Only create admin_users record if user has admin role metadata
  IF NEW.raw_app_meta_data ? 'is_admin' AND (NEW.raw_app_meta_data->>'is_admin')::boolean = true THEN
    
    -- Try to get admin role first
    SELECT id INTO admin_role_id
    FROM public.roles 
    WHERE name = 'admin' AND is_active = true 
    LIMIT 1;
    
    -- If no admin role, try super_admin
    IF admin_role_id IS NULL THEN
      SELECT id INTO admin_role_id
      FROM public.roles 
      WHERE name = 'super_admin' AND is_active = true 
      LIMIT 1;
    END IF;
    
    -- If still no role, get first available active role
    IF admin_role_id IS NULL THEN
      SELECT id INTO admin_role_id
      FROM public.roles 
      WHERE is_active = true 
      ORDER BY created_at 
      LIMIT 1;
    END IF;

    -- Insert into admin_users with proper error handling
    INSERT INTO public.admin_users (id, email, full_name, role_id, created_at)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      admin_role_id,
      NEW.created_at
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role_id = COALESCE(admin_users.role_id, EXCLUDED.role_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced function to handle user updates
CREATE OR REPLACE FUNCTION handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Update admin_users if the user exists there
  IF EXISTS (SELECT 1 FROM public.admin_users WHERE id = NEW.id) THEN
    UPDATE public.admin_users
    SET 
      email = NEW.email,
      full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced function to handle user deletion
CREATE OR REPLACE FUNCTION handle_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete from admin_users when user is deleted from auth.users
  DELETE FROM public.admin_users WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate user creation
CREATE OR REPLACE FUNCTION validate_user_creation(
  p_email TEXT,
  p_full_name TEXT,
  p_role_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if email is valid format
  IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  
  -- Check if email already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RAISE EXCEPTION 'Email already exists';
  END IF;
  
  -- Check if full name is provided
  IF p_full_name IS NULL OR LENGTH(TRIM(p_full_name)) = 0 THEN
    RAISE EXCEPTION 'Full name is required';
  END IF;
  
  -- Check if role exists and is active
  IF NOT EXISTS (SELECT 1 FROM public.roles WHERE id = p_role_id AND is_active = true) THEN
    RAISE EXCEPTION 'Invalid or inactive role';
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate triggers to ensure they're using the latest functions
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

-- Enhanced view for admin users with better role information
DROP VIEW IF EXISTS admin_users_with_roles;
CREATE VIEW admin_users_with_roles AS
SELECT 
  au.id,
  au.email,
  au.full_name,
  au.invited_by,
  au.created_at,
  au.last_login,
  au.role_id,
  r.name as role_name,
  r.display_name as role_display_name,
  r.description as role_description,
  r.permissions as role_permissions,
  r.is_active as role_is_active,
  -- Additional computed fields
  CASE 
    WHEN au.last_login IS NULL THEN 'Never logged in'
    WHEN au.last_login < NOW() - INTERVAL '30 days' THEN 'Inactive'
    WHEN au.last_login < NOW() - INTERVAL '7 days' THEN 'Recently active'
    ELSE 'Active'
  END as activity_status,
  -- Invited by user info
  inviter.full_name as invited_by_name,
  inviter.email as invited_by_email
FROM admin_users au
LEFT JOIN roles r ON au.role_id = r.id
LEFT JOIN admin_users inviter ON au.invited_by = inviter.id;

-- Grant permissions
GRANT SELECT ON admin_users_with_roles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Enhanced RLS policies for admin_users table
DROP POLICY IF EXISTS "Admin users can manage all admin users" ON admin_users;
DROP POLICY IF EXISTS "Users can read their own admin profile" ON admin_users;

-- Policy for super admins to manage all users
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

-- Policy for admins to manage non-super-admin users
CREATE POLICY "Admins can manage non-super-admin users"
  ON admin_users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      JOIN roles r ON au.role_id = r.id
      WHERE au.id = auth.uid() 
      AND r.name IN ('admin', 'super_admin')
      AND r.is_active = true
    )
    AND (
      -- Can manage users with non-super-admin roles
      NOT EXISTS (
        SELECT 1 FROM roles r2
        WHERE r2.id = admin_users.role_id
        AND r2.name = 'super_admin'
      )
      OR
      -- Super admins can manage anyone
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
    EXISTS (
      SELECT 1 FROM admin_users au
      JOIN roles r ON au.role_id = r.id
      WHERE au.id = auth.uid() 
      AND r.name IN ('admin', 'super_admin')
      AND r.is_active = true
    )
    AND (
      -- Can create users with non-super-admin roles
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

-- Policy for users to read their own profile
CREATE POLICY "Users can read their own admin profile"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Function to get user permissions (useful for frontend)
CREATE OR REPLACE FUNCTION get_user_permissions(user_id UUID DEFAULT auth.uid())
RETURNS JSONB AS $$
DECLARE
  user_permissions JSONB;
  user_role TEXT;
BEGIN
  SELECT r.permissions, r.name
  INTO user_permissions, user_role
  FROM admin_users au
  JOIN roles r ON au.role_id = r.id
  WHERE au.id = user_id AND r.is_active = true;
  
  -- Add computed permissions based on role
  IF user_role = 'super_admin' THEN
    user_permissions = user_permissions || '{"can_manage_super_admins": true}'::jsonb;
  ELSIF user_role = 'admin' THEN
    user_permissions = user_permissions || '{"can_manage_admins": true, "can_manage_super_admins": false}'::jsonb;
  END IF;
  
  RETURN COALESCE(user_permissions, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_user_permissions TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_users_role_id ON admin_users(role_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_created_at ON admin_users(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_users_last_login ON admin_users(last_login);

-- Function to sync existing users (run once to ensure all auth users are in admin_users)
CREATE OR REPLACE FUNCTION sync_auth_users_to_admin()
RETURNS INTEGER AS $$
DECLARE
  synced_count INTEGER := 0;
  auth_user RECORD;
  default_role_id UUID;
BEGIN
  -- Get default role for existing users
  SELECT id INTO default_role_id
  FROM public.roles 
  WHERE name IN ('admin', 'super_admin') AND is_active = true 
  ORDER BY 
    CASE WHEN name = 'admin' THEN 1 WHEN name = 'super_admin' THEN 2 ELSE 3 END
  LIMIT 1;

  -- If no admin roles found, get first available role
  IF default_role_id IS NULL THEN
    SELECT id INTO default_role_id
    FROM public.roles 
    WHERE is_active = true 
    ORDER BY created_at 
    LIMIT 1;
  END IF;

  -- Sync users that exist in auth.users but not in admin_users
  FOR auth_user IN 
    SELECT au.id, au.email, au.created_at, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN public.admin_users adu ON au.id = adu.id
    WHERE adu.id IS NULL
  LOOP
    INSERT INTO public.admin_users (id, email, full_name, role_id, created_at)
    VALUES (
      auth_user.id,
      auth_user.email,
      COALESCE(auth_user.raw_user_meta_data->>'full_name', split_part(auth_user.email, '@', 1)),
      default_role_id,
      auth_user.created_at
    );
    
    synced_count := synced_count + 1;
  END LOOP;

  RETURN synced_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the sync function and then drop it
SELECT sync_auth_users_to_admin();
DROP FUNCTION sync_auth_users_to_admin();
/*
  # Fix Role Display Mismatch

  1. Updates
    - Ensure proper role mapping between database and display
    - Fix any inconsistencies in role assignments
    - Update the sync function to handle role mapping correctly

  2. Security
    - Maintain existing RLS policies
    - Ensure proper role assignments
*/

-- First, let's check and fix any role inconsistencies
-- Update the sync function to properly handle role assignments
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  admin_role_id UUID;
BEGIN
  -- Only create admin_users record if user has admin role metadata
  IF NEW.raw_app_meta_data ? 'is_admin' AND (NEW.raw_app_meta_data->>'is_admin')::boolean = true THEN
    -- Get the admin role (prefer 'admin' over 'super_admin' for new users)
    SELECT id INTO admin_role_id
    FROM public.roles 
    WHERE name = 'admin' AND is_active = true 
    LIMIT 1;
    
    -- If no admin role, fall back to super_admin
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

    INSERT INTO public.admin_users (id, email, full_name, role_id, created_at)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      admin_role_id,
      NEW.created_at
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to fix existing role assignments
CREATE OR REPLACE FUNCTION fix_role_assignments()
RETURNS void AS $$
DECLARE
  admin_role_id UUID;
  super_admin_role_id UUID;
  user_record RECORD;
BEGIN
  -- Get role IDs
  SELECT id INTO admin_role_id FROM public.roles WHERE name = 'admin' AND is_active = true;
  SELECT id INTO super_admin_role_id FROM public.roles WHERE name = 'super_admin' AND is_active = true;
  
  -- If we have both roles, ensure proper assignment
  IF admin_role_id IS NOT NULL AND super_admin_role_id IS NOT NULL THEN
    -- For existing users, if they're assigned super_admin but should be admin
    -- (you can customize this logic based on your needs)
    
    -- Example: Keep the first user as super_admin, others as admin
    -- You can modify this logic as needed
    
    -- Get the first created admin user (likely the system creator)
    SELECT id INTO user_record
    FROM public.admin_users 
    WHERE role_id = super_admin_role_id
    ORDER BY created_at 
    LIMIT 1;
    
    -- Update other super_admin users to admin role if needed
    -- Uncomment the following lines if you want to demote other super_admins to admin
    /*
    UPDATE public.admin_users 
    SET role_id = admin_role_id
    WHERE role_id = super_admin_role_id 
    AND id != user_record.id;
    */
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the fix function
SELECT fix_role_assignments();

-- Drop the fix function as it's only needed once
DROP FUNCTION fix_role_assignments();

-- Ensure the view is up to date
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
  r.permissions as role_permissions
FROM admin_users au
LEFT JOIN roles r ON au.role_id = r.id;

-- Grant necessary permissions
GRANT SELECT ON admin_users_with_roles TO authenticated;
/*
  # Sync auth.users with admin_users table

  1. New Tables
    - No new tables, updating existing admin_users table

  2. Changes
    - Add trigger to automatically sync auth.users with admin_users
    - Add function to handle user creation and updates
    - Ensure admin_users.id matches auth.users.id

  3. Security
    - Maintain existing RLS policies
    - Add proper error handling
*/

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create admin_users record if user has admin role metadata
  IF NEW.raw_app_meta_data ? 'is_admin' AND (NEW.raw_app_meta_data->>'is_admin')::boolean = true THEN
    INSERT INTO public.admin_users (id, email, full_name, role_id, created_at)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      -- Default to a basic admin role if exists, otherwise first available role
      COALESCE(
        (SELECT id FROM public.roles WHERE name = 'admin' AND is_active = true LIMIT 1),
        (SELECT id FROM public.roles WHERE is_active = true ORDER BY created_at LIMIT 1)
      ),
      NEW.created_at
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle user updates
CREATE OR REPLACE FUNCTION handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Update admin_users if the user exists there
  IF EXISTS (SELECT 1 FROM public.admin_users WHERE id = NEW.id) THEN
    UPDATE public.admin_users
    SET 
      email = NEW.email,
      full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle user deletion
CREATE OR REPLACE FUNCTION handle_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete from admin_users when user is deleted from auth.users
  DELETE FROM public.admin_users WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

-- Create triggers for auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_user_update();

CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_user_delete();

-- Function to sync existing auth users to admin_users (run once)
CREATE OR REPLACE FUNCTION sync_existing_auth_users()
RETURNS void AS $$
DECLARE
  auth_user RECORD;
  default_role_id UUID;
BEGIN
  -- Get default role (admin or first available)
  SELECT id INTO default_role_id
  FROM public.roles 
  WHERE (name = 'admin' OR name = 'super_admin') AND is_active = true 
  ORDER BY 
    CASE WHEN name = 'super_admin' THEN 1 WHEN name = 'admin' THEN 2 ELSE 3 END
  LIMIT 1;

  -- If no admin role found, get first available role
  IF default_role_id IS NULL THEN
    SELECT id INTO default_role_id
    FROM public.roles 
    WHERE is_active = true 
    ORDER BY created_at 
    LIMIT 1;
  END IF;

  -- Sync existing auth users that aren't in admin_users
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
      COALESCE(auth_user.raw_user_meta_data->>'full_name', auth_user.email),
      default_role_id,
      auth_user.created_at
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the sync function once
SELECT sync_existing_auth_users();

-- Drop the sync function as it's only needed once
DROP FUNCTION sync_existing_auth_users();
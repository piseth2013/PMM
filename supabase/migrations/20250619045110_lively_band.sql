/*
  # Insert default logo.png into system

  1. Updates
    - Insert logo.png URL into settings table
    - Set the logo_url setting to point to the uploaded logo

  This migration sets up the default logo for the system.
*/

-- Update the logo_url setting to point to the logo.png file
UPDATE settings 
SET value = 'https://tzattbqdbdhieapvyhrw.supabase.co/storage/v1/object/public/system/system/logo.png',
    updated_at = now()
WHERE key = 'logo_url';

-- If the setting doesn't exist, insert it
INSERT INTO settings (key, value, description)
VALUES ('logo_url', 'https://tzattbqdbdhieapvyhrw.supabase.co/storage/v1/object/public/system/system/logo.png', 'URL of the system logo')
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = now();
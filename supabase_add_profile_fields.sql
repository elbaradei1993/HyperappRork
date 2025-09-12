-- Add new profile fields to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS occupation TEXT,
ADD COLUMN IF NOT EXISTS company TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS social_media JSONB DEFAULT '{"twitter": "", "instagram": "", "linkedin": ""}'::jsonb,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS zip_code TEXT,
ADD COLUMN IF NOT EXISTS country TEXT;

-- Update the public_users view to include first and last names for non-anonymous reports
DROP VIEW IF EXISTS public.public_users CASCADE;

CREATE VIEW public.public_users AS
SELECT 
    id,
    first_name,
    last_name,
    display_name,
    role,
    location,
    profile_image_url,
    created_at
FROM public.users
WHERE location_sharing_enabled = true;

-- Grant permissions on the updated view
GRANT SELECT ON public.public_users TO anon, authenticated;

-- Create a function to get user display name for reports
CREATE OR REPLACE FUNCTION get_user_display_name(user_id UUID)
RETURNS TEXT AS $$
DECLARE
    user_name TEXT;
BEGIN
    SELECT 
        COALESCE(
            NULLIF(CONCAT(first_name, ' ', last_name), ' '),
            display_name,
            split_part(email, '@', 1)
        ) INTO user_name
    FROM public.users
    WHERE id = user_id;
    
    RETURN user_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing users to have display_name if they don't have one
UPDATE public.users
SET display_name = COALESCE(
    display_name,
    NULLIF(CONCAT(first_name, ' ', last_name), ' '),
    split_part(email, '@', 1)
)
WHERE display_name IS NULL OR display_name = '';

-- Add index for better performance on new fields
CREATE INDEX IF NOT EXISTS idx_users_first_last_name ON public.users(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_users_social_media ON public.users USING GIN (social_media);

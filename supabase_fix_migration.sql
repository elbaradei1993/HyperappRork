-- Migration script to fix existing database issues
-- Run this after the main setup script if you have existing data

-- 1. Create public views if they don't exist
DO $$
BEGIN
    -- Check and create public_alerts view
    IF NOT EXISTS (SELECT 1 FROM information_schema.views 
                   WHERE table_schema = 'public' 
                   AND table_name = 'public_alerts') THEN
        CREATE VIEW public.public_alerts AS
        SELECT 
            id,
            type,
            description,
            tags,
            location,
            anonymous,
            report_type,
            CASE 
                WHEN anonymous = true THEN NULL
                ELSE user_id
            END as user_id,
            timestamp,
            created_at,
            updated_at
        FROM public.alerts;
        
        GRANT SELECT ON public.public_alerts TO anon, authenticated;
    END IF;
    
    -- Check and create public_users view
    IF NOT EXISTS (SELECT 1 FROM information_schema.views 
                   WHERE table_schema = 'public' 
                   AND table_name = 'public_users') THEN
        CREATE VIEW public.public_users AS
        SELECT 
            id,
            display_name,
            role,
            location,
            profile_image_url,
            created_at
        FROM public.users
        WHERE location_sharing_enabled = true;
        
        GRANT SELECT ON public.public_users TO anon, authenticated;
    END IF;
END $$;

-- 2. Fix any alerts with missing or invalid data
UPDATE public.alerts
SET description = 'No description provided'
WHERE description IS NULL OR description = '';

UPDATE public.alerts
SET type = 'safe'
WHERE type IS NULL OR type = '';

-- 3. Ensure all alerts have valid location data
DELETE FROM public.alerts
WHERE location IS NULL 
   OR location->>'latitude' IS NULL 
   OR location->>'longitude' IS NULL;

-- 4. Add validation trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger 
                   WHERE tgname = 'validate_alert_before_insert') THEN
        CREATE TRIGGER validate_alert_before_insert
            BEFORE INSERT ON public.alerts
            FOR EACH ROW EXECUTE FUNCTION validate_alert_data();
    END IF;
END $$;

-- 5. Add sample safe vibe if no alerts exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.alerts WHERE report_type = 'vibe' LIMIT 1) THEN
        INSERT INTO public.alerts (type, description, tags, location, anonymous, report_type)
        VALUES (
            'safe',
            'Initial safe zone marker',
            'safe,peaceful,default',
            '{"latitude": 37.7749, "longitude": -122.4194}'::jsonb,
            true,
            'vibe'
        );
    END IF;
END $$;

-- 6. Create missing indexes
CREATE INDEX IF NOT EXISTS idx_alerts_location ON public.alerts USING GIN (location);
CREATE INDEX IF NOT EXISTS idx_users_location_sharing ON public.users(location_sharing_enabled);

-- 7. Ensure RLS is properly configured
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 8. Fix view ownership
ALTER VIEW public.public_alerts OWNER TO postgres;
ALTER VIEW public.public_users OWNER TO postgres;

-- 9. Verify and enable realtime
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'alerts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
    END IF;
END $$;

-- 10. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Report successful completion
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Database is now properly configured.';
END $$;

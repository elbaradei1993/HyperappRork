-- Drop existing tables and views if they exist to ensure clean setup
DROP VIEW IF EXISTS public.public_alerts CASCADE;
DROP VIEW IF EXISTS public.public_users CASCADE;
DROP TABLE IF EXISTS public.feedback CASCADE;
DROP TABLE IF EXISTS public.alerts CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Ensure the public schema exists
CREATE SCHEMA IF NOT EXISTS public;

-- Create alerts table with all required columns
CREATE TABLE public.alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    alert_type TEXT NOT NULL, -- Changed from 'type' to 'alert_type' to avoid reserved word issues
    description TEXT NOT NULL,
    tags TEXT,
    location JSONB NOT NULL,
    anonymous BOOLEAN DEFAULT false NOT NULL,
    report_type TEXT CHECK (report_type IN ('vibe', 'event', 'sos')) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create users table
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    display_name TEXT,
    phone TEXT,
    bio TEXT,
    role TEXT DEFAULT 'Individual',
    interests TEXT,
    location TEXT,
    birth_date TEXT,
    emergency_contact TEXT,
    emergency_contact_name TEXT,
    blood_type TEXT,
    allergies TEXT,
    medications TEXT,
    notification_preferences JSONB,
    profile_image_url TEXT,
    notifications_enabled BOOLEAN DEFAULT true,
    location_sharing_enabled BOOLEAN DEFAULT true,
    dark_mode_enabled BOOLEAN DEFAULT false,
    language TEXT DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON public.alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_report_type ON public.alerts(report_type);
CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON public.alerts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON public.alerts(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies for alerts table
CREATE POLICY "Enable read access for all users" ON public.alerts
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON public.alerts
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for alert owners" ON public.alerts
    FOR UPDATE USING (
        auth.uid() = user_id OR anonymous = true
    );

CREATE POLICY "Enable delete for alert owners" ON public.alerts
    FOR DELETE USING (
        auth.uid() = user_id
    );

-- Create policies for users table
CREATE POLICY "Enable read access for all users" ON public.users
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.users
    FOR INSERT WITH CHECK (
        auth.uid() = id
    );

CREATE POLICY "Enable update for user themselves" ON public.users
    FOR UPDATE USING (
        auth.uid() = id
    );

CREATE POLICY "Enable delete for user themselves" ON public.users
    FOR DELETE USING (
        auth.uid() = id
    );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON public.alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create public views for anonymous access
CREATE VIEW public.public_alerts AS
SELECT 
    id,
    alert_type, -- Changed from 'type' to 'alert_type'
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

-- Grant permissions on views
GRANT SELECT ON public.public_alerts TO anon, authenticated;
GRANT SELECT ON public.public_users TO anon, authenticated;

-- Enable realtime for alerts table
DO $$ 
BEGIN
    -- First check if the publication exists
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        -- Check if the table is already in the publication
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND schemaname = 'public' 
            AND tablename = 'alerts'
        ) THEN
            -- Add the table to the publication
            ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
        END IF;
    END IF;
END $$;

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create feedback table for help and support
CREATE TABLE public.feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('bug', 'feature', 'general')) NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create storage bucket for profile images if it doesn't exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('profile-images', 'profile-images', true)
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- Create storage policies for profile images
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Enable read access for all users" ON storage.objects;
        DROP POLICY IF EXISTS "Enable upload for authenticated users" ON storage.objects;
        DROP POLICY IF EXISTS "Enable update for users own images" ON storage.objects;
        DROP POLICY IF EXISTS "Enable delete for users own images" ON storage.objects;
        
        -- Create new policies
        CREATE POLICY "Enable read access for all users" ON storage.objects
            FOR SELECT USING (bucket_id = 'profile-images');
        
        CREATE POLICY "Enable upload for authenticated users" ON storage.objects
            FOR INSERT WITH CHECK (
                bucket_id = 'profile-images' AND
                auth.uid() IS NOT NULL
            );
        
        CREATE POLICY "Enable update for users own images" ON storage.objects
            FOR UPDATE USING (
                bucket_id = 'profile-images' AND
                auth.uid()::text = (storage.foldername(name))[1]
            );
        
        CREATE POLICY "Enable delete for users own images" ON storage.objects
            FOR DELETE USING (
                bucket_id = 'profile-images' AND
                auth.uid()::text = (storage.foldername(name))[1]
            );
    END IF;
END $$;

-- Enable RLS for feedback table
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Create policies for feedback table
CREATE POLICY "Enable insert for authenticated users" ON public.feedback
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
    );

CREATE POLICY "Enable read for own feedback" ON public.feedback
    FOR SELECT USING (
        auth.uid() = user_id
    );

-- Create trigger for feedback updated_at
CREATE TRIGGER update_feedback_updated_at BEFORE UPDATE ON public.feedback
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert existing auth users into public.users if they don't exist
INSERT INTO public.users (id, email, display_name)
SELECT 
  id, 
  email,
  COALESCE(raw_user_meta_data->>'display_name', split_part(email, '@', 1))
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Create function to validate alert data
CREATE OR REPLACE FUNCTION validate_alert_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure location has required fields
    IF NEW.location IS NULL OR 
       NEW.location->>'latitude' IS NULL OR 
       NEW.location->>'longitude' IS NULL THEN
        RAISE EXCEPTION 'Location must include latitude and longitude';
    END IF;
    
    -- Ensure report_type is valid
    IF NEW.report_type NOT IN ('vibe', 'event', 'sos') THEN
        RAISE EXCEPTION 'Invalid report_type: %', NEW.report_type;
    END IF;
    
    -- Ensure alert_type is not empty (changed from 'type')
    IF NEW.alert_type IS NULL OR NEW.alert_type = '' THEN
        RAISE EXCEPTION 'Alert type cannot be empty';
    END IF;
    
    -- Ensure description is not empty
    IF NEW.description IS NULL OR NEW.description = '' THEN
        RAISE EXCEPTION 'Alert description cannot be empty';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate alert data
CREATE TRIGGER validate_alert_before_insert
    BEFORE INSERT ON public.alerts
    FOR EACH ROW EXECUTE FUNCTION validate_alert_data();

-- Insert sample safe vibe data to prevent "dangerous" default
DO $$
BEGIN
    -- Check if there are no alerts
    IF NOT EXISTS (SELECT 1 FROM public.alerts LIMIT 1) THEN
        -- Insert a default safe vibe
        INSERT INTO public.alerts (alert_type, description, tags, location, anonymous, report_type)
        VALUES (
            'safe',
            'Area is safe and peaceful',
            'safe,peaceful',
            '{"latitude": 0, "longitude": 0}'::jsonb,
            true,
            'vibe'
        );
    END IF;
END $$;

-- Create indexes for better query performance on views
CREATE INDEX IF NOT EXISTS idx_alerts_location ON public.alerts USING GIN (location);
CREATE INDEX IF NOT EXISTS idx_users_location_sharing ON public.users(location_sharing_enabled);

-- Ensure RLS policies work with views
ALTER VIEW public.public_alerts OWNER TO postgres;
ALTER VIEW public.public_users OWNER TO postgres;

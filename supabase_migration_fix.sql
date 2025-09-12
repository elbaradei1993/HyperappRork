-- Migration script to fix existing database schema issues
-- This script adds missing columns to existing tables without dropping them

-- Check and add missing columns to alerts table
DO $$ 
BEGIN
    -- Add anonymous column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'alerts' 
        AND column_name = 'anonymous'
    ) THEN
        ALTER TABLE public.alerts 
        ADD COLUMN anonymous BOOLEAN DEFAULT false NOT NULL;
    END IF;

    -- Add timestamp column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'alerts' 
        AND column_name = 'timestamp'
    ) THEN
        ALTER TABLE public.alerts 
        ADD COLUMN timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL;
    END IF;

    -- Add report_type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'alerts' 
        AND column_name = 'report_type'
    ) THEN
        ALTER TABLE public.alerts 
        ADD COLUMN report_type TEXT CHECK (report_type IN ('vibe', 'event', 'sos')) NOT NULL DEFAULT 'vibe';
        
        -- Remove the default after adding the column
        ALTER TABLE public.alerts 
        ALTER COLUMN report_type DROP DEFAULT;
    END IF;

    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'alerts' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.alerts 
        ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;
    END IF;

    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'alerts' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.alerts 
        ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON public.alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_report_type ON public.alerts(report_type);
CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON public.alerts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON public.alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_anonymous ON public.alerts(anonymous);

-- Ensure RLS is enabled
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies to ensure they're correct
DROP POLICY IF EXISTS "Enable read access for all users" ON public.alerts;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.alerts;
DROP POLICY IF EXISTS "Enable update for alert owners" ON public.alerts;
DROP POLICY IF EXISTS "Enable delete for alert owners" ON public.alerts;

-- Recreate policies with correct permissions
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

-- Ensure the update trigger exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create or replace the trigger
DROP TRIGGER IF EXISTS update_alerts_updated_at ON public.alerts;
CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON public.alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for alerts table
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

-- Verify the schema
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'alerts'
ORDER BY ordinal_position;

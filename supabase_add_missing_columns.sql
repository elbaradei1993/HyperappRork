-- Add missing columns to alerts table
ALTER TABLE public.alerts 
ADD COLUMN IF NOT EXISTS resolved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS responded_by TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS address TEXT;

-- Create index for resolved status
CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON public.alerts(resolved);

-- Update RLS policies to allow updating resolved and responded_by fields
DROP POLICY IF EXISTS "Enable update for alert owners" ON public.alerts;

CREATE POLICY "Enable update for alerts" ON public.alerts
    FOR UPDATE USING (true)
    WITH CHECK (true);

-- Add saved_places table
CREATE TABLE IF NOT EXISTS public.saved_places (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    type TEXT NOT NULL,
    location JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for saved_places
CREATE INDEX IF NOT EXISTS idx_saved_places_user_id ON public.saved_places(user_id);

-- Enable RLS for saved_places
ALTER TABLE public.saved_places ENABLE ROW LEVEL SECURITY;

-- Create policies for saved_places
CREATE POLICY "Enable read for owner" ON public.saved_places
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Enable insert for owner" ON public.saved_places
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for owner" ON public.saved_places
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Enable delete for owner" ON public.saved_places
    FOR DELETE USING (auth.uid() = user_id);

-- Add trusted_contacts table
CREATE TABLE IF NOT EXISTS public.trusted_contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    relationship TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for trusted_contacts
CREATE INDEX IF NOT EXISTS idx_trusted_contacts_user_id ON public.trusted_contacts(user_id);

-- Enable RLS for trusted_contacts
ALTER TABLE public.trusted_contacts ENABLE ROW LEVEL SECURITY;

-- Create policies for trusted_contacts
CREATE POLICY "Enable read for owner" ON public.trusted_contacts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Enable insert for owner" ON public.trusted_contacts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for owner" ON public.trusted_contacts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Enable delete for owner" ON public.trusted_contacts
    FOR DELETE USING (auth.uid() = user_id);

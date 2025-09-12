-- Guardian Angels Tables for Pulse App
-- This creates the necessary tables for the Guardian Angels feature

-- Create guardian_angels table
CREATE TABLE IF NOT EXISTS public.guardian_angels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    guardian_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    guardian_email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'declined', 'removed')),
    invitation_token UUID DEFAULT gen_random_uuid(),
    invitation_sent_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    permissions JSONB DEFAULT '{"view_location": true, "receive_sos": true, "view_vibe": true}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, guardian_email)
);

-- Create guardian_check_ins table
CREATE TABLE IF NOT EXISTS public.guardian_check_ins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    guardian_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT,
    location JSONB,
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'acknowledged')),
    acknowledged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create guardian_alerts table
CREATE TABLE IF NOT EXISTS public.guardian_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    guardian_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('sos', 'low_vibe', 'location_change', 'check_in_request')),
    message TEXT,
    location JSONB,
    vibe_score INTEGER,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_guardian_angels_user_id ON public.guardian_angels(user_id);
CREATE INDEX IF NOT EXISTS idx_guardian_angels_guardian_id ON public.guardian_angels(guardian_id);
CREATE INDEX IF NOT EXISTS idx_guardian_angels_status ON public.guardian_angels(status);
CREATE INDEX IF NOT EXISTS idx_guardian_check_ins_user_id ON public.guardian_check_ins(user_id);
CREATE INDEX IF NOT EXISTS idx_guardian_check_ins_guardian_id ON public.guardian_check_ins(guardian_id);
CREATE INDEX IF NOT EXISTS idx_guardian_alerts_guardian_id ON public.guardian_alerts(guardian_id);
CREATE INDEX IF NOT EXISTS idx_guardian_alerts_is_read ON public.guardian_alerts(is_read);

-- Enable RLS
ALTER TABLE public.guardian_angels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardian_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardian_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for guardian_angels
CREATE POLICY "Users can view their own guardians" ON public.guardian_angels
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = guardian_id);

CREATE POLICY "Users can add guardians" ON public.guardian_angels
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their guardian relationships" ON public.guardian_angels
    FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = guardian_id);

CREATE POLICY "Users can remove their guardians" ON public.guardian_angels
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for guardian_check_ins
CREATE POLICY "Users can view their check-ins" ON public.guardian_check_ins
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = guardian_id);

CREATE POLICY "Users can create check-ins" ON public.guardian_check_ins
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() = guardian_id);

CREATE POLICY "Guardians can acknowledge check-ins" ON public.guardian_check_ins
    FOR UPDATE USING (auth.uid() = guardian_id);

-- RLS Policies for guardian_alerts
CREATE POLICY "Users and guardians can view alerts" ON public.guardian_alerts
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = guardian_id);

CREATE POLICY "Users can create alerts for their guardians" ON public.guardian_alerts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Guardians can mark alerts as read" ON public.guardian_alerts
    FOR UPDATE USING (auth.uid() = guardian_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_guardian_angels_updated_at
    BEFORE UPDATE ON public.guardian_angels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to handle guardian invitation acceptance
CREATE OR REPLACE FUNCTION accept_guardian_invitation(p_invitation_token UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_guardian_email TEXT;
    v_user_email TEXT;
BEGIN
    -- Get the current user's email
    SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();
    
    -- Update the guardian relationship if the email matches
    UPDATE public.guardian_angels
    SET 
        guardian_id = auth.uid(),
        status = 'active',
        accepted_at = NOW()
    WHERE 
        invitation_token = p_invitation_token
        AND guardian_email = v_user_email
        AND status = 'pending';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT ALL ON public.guardian_angels TO authenticated;
GRANT ALL ON public.guardian_check_ins TO authenticated;
GRANT ALL ON public.guardian_alerts TO authenticated;
GRANT EXECUTE ON FUNCTION accept_guardian_invitation TO authenticated;

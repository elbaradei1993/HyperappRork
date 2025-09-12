-- Guardian Angels Complete Setup for HyperApp
-- Drop existing tables and functions if they exist
DROP TABLE IF EXISTS guardian_invitations CASCADE;
DROP TABLE IF EXISTS guardian_angels CASCADE;
DROP FUNCTION IF EXISTS send_guardian_invitation CASCADE;
DROP FUNCTION IF EXISTS accept_guardian_invitation CASCADE;
DROP FUNCTION IF EXISTS get_my_guardians CASCADE;
DROP FUNCTION IF EXISTS get_protected_users CASCADE;

-- Create guardian_angels table
CREATE TABLE guardian_angels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    guardian_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, guardian_id)
);

-- Create guardian_invitations table for email invitations
CREATE TABLE guardian_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    guardian_email TEXT NOT NULL,
    invitation_token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX idx_guardian_angels_user_id ON guardian_angels(user_id);
CREATE INDEX idx_guardian_angels_guardian_id ON guardian_angels(guardian_id);
CREATE INDEX idx_guardian_angels_status ON guardian_angels(status);
CREATE INDEX idx_guardian_invitations_inviter_id ON guardian_invitations(inviter_id);
CREATE INDEX idx_guardian_invitations_guardian_email ON guardian_invitations(guardian_email);
CREATE INDEX idx_guardian_invitations_token ON guardian_invitations(invitation_token);
CREATE INDEX idx_guardian_invitations_status ON guardian_invitations(status);

-- Enable RLS
ALTER TABLE guardian_angels ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardian_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for guardian_angels
CREATE POLICY "Users can view their own guardians" ON guardian_angels
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = guardian_id);

CREATE POLICY "Users can add guardians" ON guardian_angels
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their guardian relationships" ON guardian_angels
    FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = guardian_id);

CREATE POLICY "Users can remove their guardians" ON guardian_angels
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for guardian_invitations
CREATE POLICY "Users can view their own invitations" ON guardian_invitations
    FOR SELECT USING (
        auth.uid() = inviter_id OR 
        guardian_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

CREATE POLICY "Users can create invitations" ON guardian_invitations
    FOR INSERT WITH CHECK (auth.uid() = inviter_id);

CREATE POLICY "Users can update their invitations" ON guardian_invitations
    FOR UPDATE USING (
        auth.uid() = inviter_id OR 
        guardian_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- Function to send guardian invitation
CREATE OR REPLACE FUNCTION send_guardian_invitation(
    p_guardian_email TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_inviter_id UUID;
    v_guardian_id UUID;
    v_invitation_id UUID;
    v_invitation_token UUID;
BEGIN
    -- Get the inviter's ID
    v_inviter_id := auth.uid();
    
    IF v_inviter_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Check if the guardian email belongs to an existing user
    SELECT id INTO v_guardian_id FROM auth.users WHERE email = p_guardian_email;
    
    IF v_guardian_id IS NOT NULL THEN
        -- User exists, create direct guardian relationship
        INSERT INTO guardian_angels (user_id, guardian_id, status)
        VALUES (v_inviter_id, v_guardian_id, 'pending')
        ON CONFLICT (user_id, guardian_id) DO NOTHING;
        
        RETURN json_build_object(
            'success', true, 
            'message', 'Guardian request sent to existing user',
            'type', 'existing_user'
        );
    ELSE
        -- User doesn't exist, create invitation
        INSERT INTO guardian_invitations (inviter_id, guardian_email)
        VALUES (v_inviter_id, p_guardian_email)
        RETURNING id, invitation_token INTO v_invitation_id, v_invitation_token;
        
        RETURN json_build_object(
            'success', true, 
            'message', 'Invitation sent',
            'invitation_id', v_invitation_id,
            'invitation_token', v_invitation_token,
            'type', 'new_user'
        );
    END IF;
END;
$$;

-- Function to accept guardian invitation
CREATE OR REPLACE FUNCTION accept_guardian_invitation(
    p_invitation_token UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invitation RECORD;
    v_acceptor_id UUID;
BEGIN
    v_acceptor_id := auth.uid();
    
    IF v_acceptor_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Get invitation details
    SELECT * INTO v_invitation 
    FROM guardian_invitations 
    WHERE invitation_token = p_invitation_token 
        AND status = 'pending'
        AND expires_at > NOW();
    
    IF v_invitation IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
    END IF;
    
    -- Update invitation status
    UPDATE guardian_invitations 
    SET status = 'accepted', 
        accepted_at = NOW(),
        accepted_by = v_acceptor_id
    WHERE id = v_invitation.id;
    
    -- Create guardian relationship
    INSERT INTO guardian_angels (user_id, guardian_id, status)
    VALUES (v_invitation.inviter_id, v_acceptor_id, 'active')
    ON CONFLICT (user_id, guardian_id) 
    DO UPDATE SET status = 'active', updated_at = NOW();
    
    RETURN json_build_object('success', true, 'message', 'Invitation accepted');
END;
$$;

-- Function to get user's guardians
CREATE OR REPLACE FUNCTION get_my_guardians()
RETURNS TABLE (
    id UUID,
    guardian_id UUID,
    guardian_email TEXT,
    guardian_name TEXT,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ga.id,
        ga.guardian_id,
        u.email as guardian_email,
        COALESCE(u.raw_user_meta_data->>'full_name', u.email) as guardian_name,
        ga.status,
        ga.created_at
    FROM guardian_angels ga
    JOIN auth.users u ON u.id = ga.guardian_id
    WHERE ga.user_id = auth.uid()
    ORDER BY ga.created_at DESC;
END;
$$;

-- Function to get users protected by current guardian
CREATE OR REPLACE FUNCTION get_protected_users()
RETURNS TABLE (
    id UUID,
    user_id UUID,
    user_email TEXT,
    user_name TEXT,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ga.id,
        ga.user_id,
        u.email as user_email,
        COALESCE(u.raw_user_meta_data->>'full_name', u.email) as user_name,
        ga.status,
        ga.created_at
    FROM guardian_angels ga
    JOIN auth.users u ON u.id = ga.user_id
    WHERE ga.guardian_id = auth.uid() AND ga.status = 'active'
    ORDER BY ga.created_at DESC;
END;
$$;

-- Grant necessary permissions
GRANT ALL ON guardian_angels TO authenticated;
GRANT ALL ON guardian_invitations TO authenticated;
GRANT EXECUTE ON FUNCTION send_guardian_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION accept_guardian_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_guardians TO authenticated;
GRANT EXECUTE ON FUNCTION get_protected_users TO authenticated;

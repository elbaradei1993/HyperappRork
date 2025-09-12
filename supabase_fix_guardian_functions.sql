-- Fix Guardian Functions Type Mismatch
-- This fixes the type mismatch error where the function returns TEXT but app expects VARCHAR

-- Drop the existing functions
DROP FUNCTION IF EXISTS get_my_guardians CASCADE;
DROP FUNCTION IF EXISTS get_protected_users CASCADE;

-- Recreate get_my_guardians with proper types
CREATE OR REPLACE FUNCTION get_my_guardians()
RETURNS TABLE (
    id UUID,
    guardian_id UUID,
    guardian_email VARCHAR(255),
    guardian_name VARCHAR(255),
    status VARCHAR(50),
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
        u.email::VARCHAR(255) as guardian_email,
        COALESCE(u.raw_user_meta_data->>'full_name', u.email)::VARCHAR(255) as guardian_name,
        ga.status::VARCHAR(50),
        ga.created_at
    FROM guardian_angels ga
    JOIN auth.users u ON u.id = ga.guardian_id
    WHERE ga.user_id = auth.uid()
    ORDER BY ga.created_at DESC;
END;
$$;

-- Recreate get_protected_users with proper types
CREATE OR REPLACE FUNCTION get_protected_users()
RETURNS TABLE (
    id UUID,
    user_id UUID,
    user_email VARCHAR(255),
    user_name VARCHAR(255),
    status VARCHAR(50),
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
        u.email::VARCHAR(255) as user_email,
        COALESCE(u.raw_user_meta_data->>'full_name', u.email)::VARCHAR(255) as user_name,
        ga.status::VARCHAR(50),
        ga.created_at
    FROM guardian_angels ga
    JOIN auth.users u ON u.id = ga.user_id
    WHERE ga.guardian_id = auth.uid() AND ga.status = 'active'
    ORDER BY ga.created_at DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_my_guardians TO authenticated;
GRANT EXECUTE ON FUNCTION get_protected_users TO authenticated;

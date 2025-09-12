-- Fix RLS policies for sos_history table to allow system-level archiving

-- Drop existing insert policy
DROP POLICY IF EXISTS "Users can insert their own SOS history" ON sos_history;

-- Create a more permissive insert policy that allows:
-- 1. Users to insert their own history
-- 2. System to archive any SOS report (including anonymous ones)
CREATE POLICY "Allow SOS history inserts" ON sos_history
  FOR INSERT WITH CHECK (
    -- Allow if the user is inserting their own record
    (auth.uid() = user_id) 
    OR 
    -- Allow if user_id is null (anonymous reports)
    (user_id IS NULL)
    OR
    -- Allow authenticated users to archive any SOS report
    -- This is needed for the automatic archiving system
    (auth.uid() IS NOT NULL)
  );

-- Also update the vibe_history table with similar policy if it exists
DROP POLICY IF EXISTS "Users can insert their own vibe history" ON vibe_history;

CREATE POLICY "Allow vibe history inserts" ON vibe_history
  FOR INSERT WITH CHECK (
    -- Allow if the user is inserting their own record
    (auth.uid() = user_id) 
    OR 
    -- Allow if user_id is null (anonymous reports)
    (user_id IS NULL)
    OR
    -- Allow authenticated users to archive any vibe report
    -- This is needed for the automatic archiving system
    (auth.uid() IS NOT NULL)
  );

-- Add update policies for both tables to allow status updates
CREATE POLICY "Allow authenticated users to update history" ON sos_history
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to update vibe history" ON vibe_history
  FOR UPDATE USING (auth.uid() IS NOT NULL);

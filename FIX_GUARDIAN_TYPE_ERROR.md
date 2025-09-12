# Fix Guardian Functions Type Mismatch

## Problem
The error "Returned type character varying(255) does not match expected type text in column 3" occurs because the database functions return TEXT type but the application expects VARCHAR(255).

## Solution
Run the SQL script `supabase_fix_guardian_functions.sql` in your Supabase SQL Editor.

## Steps to Apply the Fix:

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to the SQL Editor

2. **Run the Fix Script**
   - Copy the entire contents of `supabase_fix_guardian_functions.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute

3. **What This Fix Does:**
   - Drops the existing `get_my_guardians` and `get_protected_users` functions
   - Recreates them with proper VARCHAR(255) types instead of TEXT
   - Ensures all return types match what the TypeScript application expects
   - Maintains all existing functionality

4. **Verify the Fix:**
   - After running the script, go back to your app
   - The Guardian Angels tab should now load without errors
   - You should be able to:
     - View your guardians list
     - Add new guardians by email
     - Accept guardian invitations
     - Remove guardians

## Important Notes:
- This fix only modifies the function return types
- No data is lost or modified
- The guardian_angels table structure remains unchanged
- All existing guardian relationships are preserved

## If You Still Get Errors:
If you continue to see errors after applying this fix, it might be because the tables don't exist yet. In that case:
1. First run `supabase_guardian_angels_complete.sql` to create the tables
2. Then run `supabase_fix_guardian_functions.sql` to fix the type issues

# Fix SOS History RLS Policy

## Problem
The error "new row violates row-level security policy for table 'sos_history'" occurs when the app tries to automatically archive expired SOS reports to the history table. This happens because the current RLS policy only allows users to insert their own records, but the archiving system needs to move reports from any user (including anonymous ones).

## Solution
Run the SQL migration file `supabase_fix_sos_history_rls.sql` in your Supabase SQL editor.

### Steps to Apply the Fix:

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to the SQL Editor

2. **Run the Migration**
   - Copy the entire contents of `supabase_fix_sos_history_rls.sql`
   - Paste it into the SQL editor
   - Click "Run" to execute the migration

3. **What This Fix Does:**
   - Updates the RLS policy for `sos_history` table to allow:
     - Users to insert their own history records
     - Anonymous reports to be archived (where user_id is NULL)
     - Any authenticated user to archive SOS reports (needed for automatic archiving)
   - Also applies the same fix to `vibe_history` table for consistency
   - Adds update policies to allow status updates on archived records

4. **Verify the Fix**
   - After running the migration, test the app
   - Create an SOS alert
   - Wait for it to be archived (or manually trigger archiving)
   - Check that no RLS errors occur

## Why This Works
The original policy was too restrictive - it only allowed users to insert records where they were the owner. But when the system automatically archives reports:
- The current user might not be the original reporter
- Some reports might be anonymous (user_id = NULL)
- The archiving happens on behalf of the system, not the original user

The new policy allows any authenticated user to archive reports, which enables the automatic archiving system to work properly while still maintaining security (only authenticated users can perform these operations).

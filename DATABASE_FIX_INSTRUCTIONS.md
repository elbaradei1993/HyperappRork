# Database Fix Instructions

## Issues Identified

1. **Missing `anonymous` column** in the `alerts` table
2. **Missing `timestamp` column** in the `alerts` table  
3. **Community Pulse showing incorrect "dangerous" vibe** when no reports exist

## How to Fix the Database

### Option 1: Complete Reset (Recommended if you haven't stored important data)

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the entire contents of `supabase_setup.sql`
4. Run the script

This will:
- Drop existing tables
- Recreate them with the correct schema
- Set up all necessary columns, indexes, and policies

### Option 2: Migration (If you want to keep existing data)

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the entire contents of `supabase_migration_fix.sql`
4. Run the script

This will:
- Add missing columns without dropping tables
- Preserve existing data
- Update policies and indexes

## Verification

After running either script, verify the fix by:

1. Go to Table Editor in Supabase
2. Check the `alerts` table structure
3. Confirm these columns exist:
   - `id` (UUID)
   - `type` (TEXT)
   - `description` (TEXT)
   - `tags` (TEXT)
   - `location` (JSONB)
   - `anonymous` (BOOLEAN) ✓
   - `report_type` (TEXT)
   - `user_id` (UUID)
   - `timestamp` (TIMESTAMPTZ) ✓
   - `created_at` (TIMESTAMPTZ)
   - `updated_at` (TIMESTAMPTZ)

## App Fixes Applied

1. **Community Pulse Logic**: Fixed the algorithm that determines the dominant vibe to properly default to "safe" when no reports exist

2. **Alert Submission**: The app now correctly handles the database schema with all required columns

## Testing the Fix

1. Open the app
2. Navigate to Community Pulse - should show "Safe" as the current vibe
3. Try submitting a report:
   - Go to Report tab
   - Select "Report Vibe" or "Report Event"
   - Fill in the details
   - Submit
4. Check that the report appears on the map and in Community Pulse

## Troubleshooting

If you still see errors:

1. **Clear app cache**: Force quit the app and restart
2. **Check Supabase connection**: Verify your `.env` file has correct credentials
3. **Check RLS policies**: Ensure Row Level Security policies are enabled
4. **Check authentication**: Make sure you're logged in when submitting reports

## Prevention

To prevent future schema issues:

1. Always use the migration approach when updating schema
2. Test schema changes in a development environment first
3. Keep `supabase_setup.sql` updated with any schema changes
4. Document all database changes

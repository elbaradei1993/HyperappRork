# Supabase Database Fix Instructions

## Issues Fixed

1. **Missing public_alerts and public_users views** - Created public views for anonymous access
2. **"Dangerous" vibe showing without reports** - Added default safe vibe and proper null handling
3. **Reports not being saved** - Added data validation and fixed schema issues
4. **Missing indexes** - Added GIN index for location queries
5. **RLS policies** - Properly configured Row Level Security

## How to Apply the Fixes

### Option 1: Complete Reset (Recommended if you don't have important data)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the entire contents of `supabase_setup.sql`
4. Paste and run the SQL
5. You should see success messages for each operation

### Option 2: Migration Only (If you have existing data to preserve)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the entire contents of `supabase_fix_migration.sql`
4. Paste and run the SQL
5. This will fix existing issues without dropping tables

## Verify the Fix

After running the SQL, verify everything works:

### 1. Check Tables Exist
Run this query in SQL Editor:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see:
- alerts
- feedback
- users

### 2. Check Views Exist
```sql
SELECT table_name FROM information_schema.views 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see:
- public_alerts
- public_users

### 3. Test Alert Insertion
```sql
INSERT INTO public.alerts (type, description, tags, location, anonymous, report_type)
VALUES (
    'safe',
    'Test alert',
    'test',
    '{"latitude": 40.7128, "longitude": -74.0060}'::jsonb,
    false,
    'vibe'
);
```

### 4. Check Realtime is Enabled
```sql
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

You should see 'alerts' in the results.

## Test in the App

1. **Open the app** and go to the Report tab
2. **Submit a vibe report** - Select a vibe type, add description, and send
3. **Check the Pulse tab** - You should see your report reflected
4. **Check the Map tab** - Your report should appear as a marker
5. **Submit an event report** - Should work the same way

## Troubleshooting

### If you get permission errors:
```sql
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
```

### If realtime isn't working:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
```

### If views are missing:
Run the view creation part from `supabase_fix_migration.sql`

### If you still see "dangerous" as default:
1. Check if there are any alerts in the database
2. The app now defaults to "safe" when no reports exist
3. Clear your app cache/storage and reload

## What Changed in the Code

The SQL fixes include:

1. **Public Views** - Created `public_alerts` and `public_users` views for anonymous access
2. **Data Validation** - Added trigger to validate alert data before insertion
3. **Default Safe Vibe** - Inserts a default safe vibe if no alerts exist
4. **Location Indexes** - Added GIN index for faster location-based queries
5. **Proper Permissions** - Granted necessary permissions to anon and authenticated roles

## Next Steps

After applying these fixes:
1. Test all report types (vibe, event, SOS)
2. Verify reports appear on the map with heat radius
3. Check that the Pulse screen shows correct vibe distribution
4. Ensure realtime updates work (new reports appear immediately)

## Support

If you continue to experience issues:
1. Check the Supabase logs for any SQL errors
2. Verify your Supabase URL and anon key are correct in the app
3. Ensure RLS policies are enabled but configured to allow access
4. Check browser console for any API errors

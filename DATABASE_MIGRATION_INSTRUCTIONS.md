# Database Migration Instructions

## Important: Run These SQL Commands in Supabase

To fix the current errors, you need to run the following SQL migration in your Supabase SQL Editor:

### Step 1: Open Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor (usually in the left sidebar)

### Step 2: Run the Migration
Copy and paste the entire contents of `supabase_add_missing_columns.sql` into the SQL editor and execute it.

This migration will:
- Add the `resolved` column to the alerts table (for marking SOS alerts as resolved)
- Add the `responded_by` column to the alerts table (for tracking who responded)
- Add the `address` column to the alerts table (for storing location addresses)
- Create the `saved_places` table (for saving favorite locations)
- Create the `trusted_contacts` table (for emergency contacts)
- Set up proper Row Level Security policies

### Step 3: Verify the Migration
After running the migration, you can verify it worked by running:

```sql
-- Check if columns were added to alerts table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'alerts' 
AND column_name IN ('resolved', 'responded_by', 'address');

-- Check if saved_places table was created
SELECT * FROM saved_places LIMIT 1;

-- Check if trusted_contacts table was created
SELECT * FROM trusted_contacts LIMIT 1;
```

### Step 4: Clear App Cache (if needed)
If you still see errors after the migration:
1. Force quit the app
2. Clear the app cache/data
3. Restart the app

## Troubleshooting

If you encounter any errors:

1. **Table already exists error**: This is fine, the migration handles this with `IF NOT EXISTS` clauses
2. **Permission denied**: Make sure you're running the SQL as an admin user
3. **Network errors**: The app is trying to fetch addresses from OpenStreetMap API. Make sure you have internet connectivity

## Features Now Working

After this migration, the following features will work:
- ✅ Marking SOS alerts as resolved (only by the person who created them)
- ✅ 10-minute reminder for unresolved SOS alerts
- ✅ Saving favorite places with address search
- ✅ Managing trusted contacts
- ✅ Sound notifications for alerts

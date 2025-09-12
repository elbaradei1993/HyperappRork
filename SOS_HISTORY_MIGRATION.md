# SOS History Migration Guide

## Overview
This migration adds automatic archiving of SOS reports after 12 hours or when they are resolved, similar to the vibe reports functionality.

## Database Migration

### Step 1: Run the SQL Migration
Execute the following SQL file in your Supabase SQL editor:
- `supabase_sos_history.sql`

This will create:
1. A new `sos_history` table to store archived SOS reports
2. Appropriate indexes for performance
3. Row Level Security (RLS) policies

### Step 2: Verify the Migration
After running the migration, verify that:
1. The `sos_history` table exists
2. The table has all required columns
3. RLS is enabled on the table

## Features Added

### Automatic SOS Report Archiving
- SOS reports are automatically moved to history after 12 hours
- Resolved SOS reports are immediately moved to history
- Response time is calculated and stored for resolved reports
- History includes resolution notes

### History Tracking
The system now tracks:
- Original creation time
- Resolution time (if resolved)
- Expiration time (when moved to history)
- Response time in minutes
- Users who responded to the SOS

### Cleanup Process
- Runs automatically every hour
- Checks for SOS reports older than 12 hours
- Checks for resolved SOS reports
- Moves them to history table
- Removes them from active alerts

## Testing

### Manual Testing
1. Create an SOS report
2. Wait for 12 hours (or manually update created_at in database for testing)
3. Verify the report is moved to sos_history table
4. Create another SOS report and mark it as resolved
5. Verify it's immediately moved to history

### Database Testing
```sql
-- Check SOS history records
SELECT * FROM sos_history ORDER BY expired_at DESC;

-- Check active SOS reports
SELECT * FROM alerts WHERE report_type = 'sos';

-- Manually expire an SOS for testing (set created_at to 13 hours ago)
UPDATE alerts 
SET created_at = NOW() - INTERVAL '13 hours' 
WHERE report_type = 'sos' 
LIMIT 1;
```

## Monitoring

The system logs the following:
- When checking for expired SOS reports
- Number of expired SOS reports found
- Success/failure of moving reports to history
- Any errors during the process

Check your application logs for messages like:
- "Checking for expired SOS reports..."
- "Found X expired SOS reports"
- "Successfully moved expired SOS reports to history"

## Rollback

If you need to rollback this migration:
```sql
-- Drop the sos_history table
DROP TABLE IF EXISTS sos_history CASCADE;
```

Note: This will permanently delete all archived SOS history data.

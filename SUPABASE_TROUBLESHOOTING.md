# Supabase Troubleshooting Guide

## Common Issues and Solutions

### 1. "Could not find the table in the schema cache" Error

**Cause**: Supabase hasn't refreshed its schema cache after creating tables.

**Solutions**:
1. **Refresh Schema Cache**:
   - Go to Supabase Dashboard → SQL Editor
   - Run: `NOTIFY pgrst, 'reload schema';`
   - Wait 30 seconds for cache to refresh

2. **Force Schema Reload**:
   - Go to Settings → API
   - Click "Reload Schema" button
   - Or restart your Supabase project

3. **Verify Tables Exist**:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```

### 2. "relation 'public.alerts' does not exist" Error

**Solution**: Run the complete setup SQL:
```sql
-- First, ensure clean slate
DROP TABLE IF EXISTS public.feedback CASCADE;
DROP TABLE IF EXISTS public.alerts CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Then run the full supabase_setup.sql file
```

### 3. Profile Picture Not Saving

**Solutions**:
1. **Create Storage Bucket**:
   - Go to Storage in Supabase Dashboard
   - Create bucket named "profile-images"
   - Set it to Public

2. **Check Storage Policies**:
   ```sql
   -- List existing policies
   SELECT * FROM pg_policies 
   WHERE schemaname = 'storage' 
   AND tablename = 'objects';
   ```

### 4. Real-time Updates Not Working

**Solution**:
1. **Enable Realtime**:
   ```sql
   -- Check if realtime is enabled
   SELECT * FROM pg_publication_tables 
   WHERE pubname = 'supabase_realtime';
   
   -- Enable for alerts table
   ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
   ```

2. **Check WebSocket Connection**:
   - Open browser console
   - Look for WebSocket connection errors
   - Ensure your Supabase URL and anon key are correct

### 5. Authentication Issues

**Solutions**:
1. **Check Auth Settings**:
   - Go to Authentication → Settings
   - Ensure Email Auth is enabled
   - Check redirect URLs

2. **Verify User Creation Trigger**:
   ```sql
   -- Check if trigger exists
   SELECT * FROM information_schema.triggers 
   WHERE trigger_name = 'on_auth_user_created';
   ```

### 6. Language Not Changing Throughout App

**Solution**: Clear AsyncStorage cache:
```javascript
// In app console or debug mode
AsyncStorage.clear();
```

## Step-by-Step Setup Verification

### 1. Verify Database Setup

Run these queries in order:

```sql
-- 1. Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Expected output:
-- alerts
-- feedback  
-- users

-- 2. Check columns in alerts table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'alerts'
ORDER BY ordinal_position;

-- 3. Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- 4. Check policies exist
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### 2. Test Data Flow

```sql
-- 1. Insert test alert (replace with your user_id)
INSERT INTO public.alerts (
    type, 
    description, 
    tags, 
    location, 
    anonymous, 
    report_type
) VALUES (
    'safe',
    'Test alert',
    'test',
    '{"latitude": 25.2048, "longitude": 55.2708}'::jsonb,
    false,
    'vibe'
);

-- 2. Verify it was inserted
SELECT * FROM public.alerts 
ORDER BY created_at DESC 
LIMIT 1;

-- 3. Clean up test data
DELETE FROM public.alerts 
WHERE description = 'Test alert';
```

### 3. Reset Everything (Nuclear Option)

If nothing else works, completely reset:

```sql
-- 1. Drop everything
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- 2. Run the complete supabase_setup.sql file

-- 3. Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- 4. Restart your Supabase project from Settings
```

## Monitoring and Debugging

### Check Logs
1. Go to Supabase Dashboard → Logs
2. Filter by:
   - API logs for request errors
   - Database logs for SQL errors
   - Auth logs for authentication issues

### Test Endpoints
Use the Supabase API playground or curl:

```bash
# Test alerts endpoint
curl -X GET \
  'https://YOUR_PROJECT.supabase.co/rest/v1/alerts?select=*' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "JWT expired" | Token expired | Re-authenticate user |
| "permission denied for schema public" | RLS policy issue | Check policies match user |
| "violates foreign key constraint" | Invalid user_id | Ensure user exists in auth.users |
| "null value in column" | Missing required field | Check all required fields are provided |

## Contact Support

If issues persist after trying these solutions:
1. Check Supabase Status: https://status.supabase.com
2. Join Discord: https://discord.supabase.com
3. Create GitHub Issue: https://github.com/supabase/supabase/issues

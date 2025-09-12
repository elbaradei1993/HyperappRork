# Supabase Setup Instructions

## Prerequisites
- A Supabase account (create one at https://supabase.com)
- Access to your Supabase project dashboard

## Setup Steps

### 1. Create a New Supabase Project (if not already created)
1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in:
   - Project name: "SafetyPulse" (or your preferred name)
   - Database Password: (choose a strong password)
   - Region: (select closest to your users)
4. Click "Create new project"

### 2. Run the Database Setup Script

**IMPORTANT:** This script will DROP and recreate tables to ensure a clean setup.

1. Go to the SQL Editor in your Supabase dashboard
2. Click "New query"
3. Copy the entire contents of `supabase_setup.sql`
4. Paste it into the SQL editor
5. Click "Run" to execute the script

The script will:
- Create the `alerts` table for storing vibes, events, and SOS reports
- Create the `users` table for storing user profiles
- Set up proper indexes for performance
- Enable Row Level Security (RLS) with appropriate policies
- Create triggers for automatic timestamp updates
- Enable realtime subscriptions for alerts
- Automatically create user profiles when new users sign up

### 3. Configure Authentication
1. Go to Authentication → Settings
2. Enable Email authentication
3. Configure email templates if desired
4. Set up OAuth providers (optional):
   - Google
   - Apple
   - Facebook

### 4. Update Your App Configuration

The app is already configured with the Supabase credentials:
- URL: `https://irbjqbmzohavhhdflsip.supabase.co`
- Anon Key: Already set in `lib/supabase.ts`

### 5. Verify Realtime is Enabled
1. Go to Database → Replication
2. Verify that the `alerts` table is enabled for realtime
3. This should already be configured by the setup script

### 6. Configure Storage for Profile Images (Optional)
1. Go to Storage
2. Create a bucket called "avatars" for profile images
3. Set the bucket to public if you want avatars to be publicly accessible
4. Configure policies:
   ```sql
   -- Allow users to upload their own avatar
   CREATE POLICY "Users can upload own avatar"
   ON storage.objects FOR INSERT
   WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
   
   -- Allow users to update their own avatar
   CREATE POLICY "Users can update own avatar"
   ON storage.objects FOR UPDATE
   WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
   
   -- Allow public to view avatars
   CREATE POLICY "Avatars are publicly accessible"
   ON storage.objects FOR SELECT
   USING (bucket_id = 'avatars');
   ```

## Database Schema

### Tables Created:

#### `public.alerts`
- **id**: UUID (Primary Key)
- **type**: Text (safe, calm, crowded, suspicious, dangerous, etc.)
- **description**: Text (required)
- **tags**: Text (optional, comma-separated)
- **location**: JSONB (required, {latitude, longitude})
- **anonymous**: Boolean (default false)
- **report_type**: Text (vibe, event, or sos)
- **user_id**: UUID (references auth.users)
- **timestamp**: Timestamptz (auto-generated)
- **created_at**: Timestamptz (auto-generated)
- **updated_at**: Timestamptz (auto-updated)

#### `public.users`
- **id**: UUID (Primary Key, references auth.users)
- **email**: Text (required)
- **display_name**: Text
- **phone**: Text
- **bio**: Text
- **role**: Text (default 'Individual')
- **interests**: Text
- **location**: Text (can store JSON string)
- **birth_date**: Text
- **emergency_contact**: Text
- **emergency_contact_name**: Text
- **blood_type**: Text
- **allergies**: Text
- **medications**: Text
- **notification_preferences**: JSONB
- **profile_image_url**: Text
- **notifications_enabled**: Boolean (default true)
- **location_sharing_enabled**: Boolean (default true)
- **dark_mode_enabled**: Boolean (default false)
- **language**: Text (default 'en')
- **created_at**: Timestamptz
- **updated_at**: Timestamptz

### Row Level Security Policies

#### Alerts Table:
- **Read**: All users can read all alerts (public safety)
- **Insert**: Authenticated users or anonymous reports
- **Update**: Only alert owners (or anonymous)
- **Delete**: Only alert owners

#### Users Table:
- **Read**: All users can read profiles (community feature)
- **Insert**: Users can create their own profile
- **Update**: Users can only update their own profile
- **Delete**: Users can only delete their own profile

## Testing the Setup

1. **Test Authentication:**
   - Sign up with a new email
   - Verify the user is created in auth.users
   - Check that a corresponding profile is created in public.users

2. **Test Alerts:**
   - Report a vibe through the app
   - Report an event through the app
   - Verify they appear in the database
   - Check that realtime updates work

3. **Test User Profiles:**
   - Update your profile information
   - Upload a profile picture
   - Verify changes are saved

## Troubleshooting

### Common Issues:

1. **"relation 'public.alerts' does not exist" error:**
   - Run the SQL setup script again
   - Make sure you're in the correct project
   - Check the SQL editor output for errors

2. **"Failed to fetch" or network errors:**
   - Verify your Supabase project is active
   - Check that the URL and anon key are correct
   - Ensure you have internet connectivity

3. **Reports not showing up:**
   - Check the browser console for errors
   - Verify the alerts table exists and has data
   - Check RLS policies are correctly set

4. **User profile not created:**
   - Check the trigger `on_auth_user_created` exists
   - Verify the `handle_new_user()` function is created
   - Look for errors in the Supabase logs

## Monitoring and Maintenance

1. **Monitor Usage:**
   - Check Database → Usage for storage and bandwidth
   - Monitor API requests in the dashboard

2. **Performance:**
   - Use the Query Performance tool to identify slow queries
   - Add indexes if needed for frequently queried columns

3. **Backups:**
   - Enable Point-in-Time Recovery for production
   - Regular manual backups before major changes

## Security Notes

1. The anon key is safe to use in client applications
2. Never expose the service_role key
3. RLS policies ensure data security
4. Anonymous reporting is supported while maintaining accountability

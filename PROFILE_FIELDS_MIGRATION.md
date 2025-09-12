# Profile Fields Migration Instructions

## Overview
This migration adds additional profile fields to the users table to support more detailed user information and proper name display in public reports.

## New Fields Added
- `first_name` - User's first name
- `last_name` - User's last name  
- `gender` - User's gender
- `occupation` - User's occupation/job title
- `company` - Company/organization name
- `website` - Personal or professional website
- `social_media` - JSON object for social media handles (Twitter, Instagram, LinkedIn)
- `address` - Street address
- `city` - City
- `state` - State/Province
- `zip_code` - ZIP/Postal code
- `country` - Country

## How to Apply the Migration

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `supabase_add_profile_fields.sql`
4. Paste it into the SQL editor
5. Click "Run" to execute the migration

### Option 2: Using Supabase CLI

```bash
supabase db push --db-url "your-database-url" < supabase_add_profile_fields.sql
```

## Features Enabled

### 1. Enhanced User Profiles
- Users can now add comprehensive personal and professional information
- Better user identification and community building

### 2. Public Report Attribution
When users report vibes, events, or SOS alerts publicly (not anonymously):
- Their first and last name will be displayed
- If no first/last name is set, the display name is used
- Falls back to email username if no names are provided

### 3. Professional Networking
- Users can add their occupation and company
- Social media links for better community connections

### 4. Emergency Information
- More detailed emergency contact information
- Address information for better location context

## Testing the Migration

After running the migration, test by:

1. **Edit Profile**: 
   - Go to Profile tab
   - Tap the edit button
   - Fill in the new fields (First Name, Last Name, etc.)
   - Save the profile

2. **Create a Public Report**:
   - Go to Report tab
   - Create a vibe or event report
   - Make sure "Report Anonymously" is unchecked
   - Submit the report
   - Check that your name appears correctly on the map

3. **Verify Data Storage**:
   - Check Supabase dashboard → Table Editor → users table
   - Verify new columns are populated with your data

## Rollback (if needed)

To rollback this migration:

```sql
-- Remove the added columns
ALTER TABLE public.users 
DROP COLUMN IF EXISTS first_name,
DROP COLUMN IF EXISTS last_name,
DROP COLUMN IF EXISTS gender,
DROP COLUMN IF EXISTS occupation,
DROP COLUMN IF EXISTS company,
DROP COLUMN IF EXISTS website,
DROP COLUMN IF EXISTS social_media,
DROP COLUMN IF EXISTS address,
DROP COLUMN IF EXISTS city,
DROP COLUMN IF EXISTS state,
DROP COLUMN IF EXISTS zip_code,
DROP COLUMN IF EXISTS country;

-- Restore original public_users view
DROP VIEW IF EXISTS public.public_users CASCADE;

CREATE VIEW public.public_users AS
SELECT 
    id,
    display_name,
    role,
    location,
    profile_image_url,
    created_at
FROM public.users
WHERE location_sharing_enabled = true;

GRANT SELECT ON public.public_users TO anon, authenticated;

-- Drop the helper function
DROP FUNCTION IF EXISTS get_user_display_name(UUID);
```

## Notes
- All new fields are optional
- Existing user data is preserved
- The migration is backward compatible
- First and last names are prioritized for display in public reports

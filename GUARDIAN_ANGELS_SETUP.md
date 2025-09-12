# Guardian Angels Network Setup Guide

## Overview
The Guardian Angels Network is a safety feature that allows users to designate trusted contacts who receive automatic alerts during emergencies.

## Database Setup

### Step 1: Run the SQL Migration
Execute the SQL script located at `/Users/jakezur/Desktop/Pulse/supabase_guardian_angels.sql` in your Supabase SQL editor.

This will create:
- `guardian_angels` table - Stores trusted contacts
- `guardian_angel_alerts` table - Tracks sent alerts
- RLS policies for secure access
- Database function for triggering alerts

### Step 2: Verify Installation
Run this query to verify the tables were created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('guardian_angels', 'guardian_angel_alerts');
```

You should see both tables listed.

### Step 3: Test the Function
Test the alert trigger function:

```sql
-- Replace with a valid user ID from your auth.users table
SELECT trigger_guardian_angel_alert(
    'YOUR_USER_ID'::uuid,
    'manual',
    'Test alert message',
    '{"latitude": 40.7128, "longitude": -74.0060}'::jsonb,
    50
);
```

## Features

### For Users
1. **Add Guardian Angels**: Add trusted contacts with email and phone
2. **Automatic SOS Alerts**: Guardians are notified when user triggers SOS
3. **Low Vibe Alerts**: Optional alerts when user's vibe drops below threshold
4. **Manual Alerts**: Send custom messages to all guardians
5. **Location Sharing**: Share current location with guardians
6. **Alert History**: View all sent alerts and their status

### Alert Types
- **SOS**: Automatic when user triggers emergency SOS
- **Low Vibe**: Automatic when vibe level drops (if enabled)
- **Manual**: User-initiated custom message
- **Location Share**: Share current location

### Guardian Settings
- **Auto Alert on SOS**: Enable/disable automatic SOS notifications
- **Auto Alert on Low Vibe**: Enable/disable low vibe notifications
- **Low Vibe Threshold**: Set the vibe level that triggers alerts (0-100)
- **Alert Delay**: Minimum time between alerts to prevent spam

## Integration Points

### SOS Modal
The SOS modal automatically triggers guardian alerts when an emergency is reported.

### Vibe Tracking
If enabled, the system can monitor vibe levels and alert guardians when it drops below the threshold.

### Location Services
Location data is included in alerts when available, helping guardians know where the user is.

## Security

- All data is protected by Row Level Security (RLS)
- Users can only see and manage their own guardians
- Alert history is private to each user
- Anonymous mode available for sensitive situations

## Future Enhancements

1. **SMS/Email Integration**: Send actual notifications to guardians
2. **Two-Way Communication**: Allow guardians to respond
3. **Geofencing**: Alert guardians when user enters/exits areas
4. **Emergency Services**: Direct connection to 911/emergency services
5. **Voice Activation**: Trigger alerts with voice commands

## Troubleshooting

### Common Issues

1. **Tables not created**: Ensure you're running the SQL as a superuser
2. **Function errors**: Check that all required extensions are enabled
3. **RLS blocking access**: Verify user is authenticated
4. **No alerts sending**: Check guardian settings and active status

### Debug Queries

Check guardian count:
```sql
SELECT COUNT(*) FROM guardian_angels WHERE user_id = 'YOUR_USER_ID';
```

View recent alerts:
```sql
SELECT * FROM guardian_angel_alerts 
WHERE user_id = 'YOUR_USER_ID' 
ORDER BY sent_at DESC 
LIMIT 10;
```

## Support

For issues or questions, check:
1. Database logs in Supabase dashboard
2. Browser console for frontend errors
3. Network tab for API failures

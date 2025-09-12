-- Community Groups Tables

-- Safety groups table
CREATE TABLE IF NOT EXISTS safety_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  code TEXT UNIQUE NOT NULL DEFAULT substr(md5(random()::text), 1, 8),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  max_members INTEGER DEFAULT 50,
  privacy_level TEXT DEFAULT 'private' CHECK (privacy_level IN ('public', 'private', 'invite_only')),
  emergency_contacts JSONB DEFAULT '[]'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb
);

-- Group members table
CREATE TABLE IF NOT EXISTS group_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES safety_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notifications_enabled BOOLEAN DEFAULT true,
  location_sharing_enabled BOOLEAN DEFAULT true,
  emergency_contact BOOLEAN DEFAULT false,
  UNIQUE(group_id, user_id)
);

-- Group messages table
CREATE TABLE IF NOT EXISTS group_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES safety_groups(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'alert', 'location', 'image', 'emergency')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  edited_at TIMESTAMP WITH TIME ZONE,
  is_deleted BOOLEAN DEFAULT false
);

-- Group locations table for real-time location sharing
CREATE TABLE IF NOT EXISTS group_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES safety_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  battery_level INTEGER,
  is_emergency BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Group check-ins table
CREATE TABLE IF NOT EXISTS group_checkins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES safety_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('safe', 'need_help', 'emergency', 'checking')),
  message TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Group events/meetups table
CREATE TABLE IF NOT EXISTS group_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES safety_groups(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  location_name TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  attendees JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Group routes for journey sharing
CREATE TABLE IF NOT EXISTS group_routes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES safety_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_location JSONB NOT NULL,
  end_location JSONB NOT NULL,
  waypoints JSONB DEFAULT '[]'::jsonb,
  estimated_arrival TIMESTAMP WITH TIME ZONE,
  actual_arrival TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Offline sync queue table
CREATE TABLE IF NOT EXISTS offline_sync_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE,
  retry_count INTEGER DEFAULT 0,
  error_message TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_created_at ON group_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_locations_group_id ON group_locations(group_id);
CREATE INDEX IF NOT EXISTS idx_group_checkins_group_id ON group_checkins(group_id);
CREATE INDEX IF NOT EXISTS idx_group_events_group_id ON group_events(group_id);
CREATE INDEX IF NOT EXISTS idx_group_routes_group_id ON group_routes(group_id);
CREATE INDEX IF NOT EXISTS idx_offline_sync_queue_user_id ON offline_sync_queue(user_id);

-- Enable RLS
ALTER TABLE safety_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_sync_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Safety groups policies
CREATE POLICY "Users can view groups they belong to" ON safety_groups
  FOR SELECT USING (
    id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
    OR privacy_level = 'public'
  );

CREATE POLICY "Users can create groups" ON safety_groups
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Group admins can update groups" ON safety_groups
  FOR UPDATE USING (
    id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Group admins can delete groups" ON safety_groups
  FOR DELETE USING (created_by = auth.uid());

-- Group members policies
CREATE POLICY "Members can view group members" ON group_members
  FOR SELECT USING (
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can join public groups" ON group_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    group_id IN (SELECT id FROM safety_groups WHERE privacy_level = 'public')
  );

CREATE POLICY "Admins can manage members" ON group_members
  FOR ALL USING (
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- Group messages policies
CREATE POLICY "Members can view group messages" ON group_messages
  FOR SELECT USING (
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can send messages" ON group_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can edit own messages" ON group_messages
  FOR UPDATE USING (sender_id = auth.uid());

-- Group locations policies
CREATE POLICY "Members can view group locations" ON group_locations
  FOR SELECT USING (
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid() AND location_sharing_enabled = true)
  );

CREATE POLICY "Users can update own location" ON group_locations
  FOR ALL USING (user_id = auth.uid());

-- Group check-ins policies
CREATE POLICY "Members can view check-ins" ON group_checkins
  FOR SELECT USING (
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create own check-ins" ON group_checkins
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

-- Group events policies
CREATE POLICY "Members can view events" ON group_events
  FOR SELECT USING (
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can create events" ON group_events
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Event creators can update events" ON group_events
  FOR UPDATE USING (created_by = auth.uid());

-- Group routes policies
CREATE POLICY "Members can view routes" ON group_routes
  FOR SELECT USING (
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage own routes" ON group_routes
  FOR ALL USING (user_id = auth.uid());

-- Offline sync queue policies
CREATE POLICY "Users can manage own sync queue" ON offline_sync_queue
  FOR ALL USING (user_id = auth.uid());

-- Functions for real-time updates
CREATE OR REPLACE FUNCTION notify_group_update()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('group_update', json_build_object(
    'group_id', NEW.group_id,
    'type', TG_TABLE_NAME,
    'action', TG_OP,
    'data', row_to_json(NEW)
  )::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for real-time updates
CREATE TRIGGER group_messages_notify
  AFTER INSERT OR UPDATE ON group_messages
  FOR EACH ROW EXECUTE FUNCTION notify_group_update();

CREATE TRIGGER group_locations_notify
  AFTER INSERT OR UPDATE ON group_locations
  FOR EACH ROW EXECUTE FUNCTION notify_group_update();

CREATE TRIGGER group_checkins_notify
  AFTER INSERT ON group_checkins
  FOR EACH ROW EXECUTE FUNCTION notify_group_update();

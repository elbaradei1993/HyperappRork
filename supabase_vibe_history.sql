-- Create vibe_history table to store historical vibe reports
CREATE TABLE IF NOT EXISTS vibe_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vibe_type TEXT NOT NULL,
  location JSONB,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  address TEXT,
  description TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expired_at TIMESTAMPTZ,
  radius_km DECIMAL(5, 2) DEFAULT 0.5
);

-- Create indexes for better query performance
CREATE INDEX idx_vibe_history_user_id ON vibe_history(user_id);
CREATE INDEX idx_vibe_history_timestamp ON vibe_history(timestamp);
CREATE INDEX idx_vibe_history_expired_at ON vibe_history(expired_at);
CREATE INDEX idx_vibe_history_location ON vibe_history(latitude, longitude);

-- Enable RLS
ALTER TABLE vibe_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all vibe history" ON vibe_history
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own vibe history" ON vibe_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add a column to alerts table to track when vibes expire
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Create a function to automatically move expired vibes to history
CREATE OR REPLACE FUNCTION move_expired_vibes_to_history()
RETURNS void AS $$
BEGIN
  -- Insert expired vibes into history
  INSERT INTO vibe_history (
    user_id,
    vibe_type,
    location,
    latitude,
    longitude,
    address,
    description,
    timestamp,
    created_at,
    expired_at,
    radius_km
  )
  SELECT 
    user_id,
    alert_type,
    location,
    (location->>'latitude')::DECIMAL,
    (location->>'longitude')::DECIMAL,
    address,
    description,
    COALESCE(timestamp, created_at),
    created_at,
    NOW(),
    0.5
  FROM alerts
  WHERE report_type = 'vibe'
    AND expires_at IS NOT NULL
    AND expires_at <= NOW();

  -- Delete expired vibes from alerts table
  DELETE FROM alerts
  WHERE report_type = 'vibe'
    AND expires_at IS NOT NULL
    AND expires_at <= NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run every hour (you'll need to set this up in Supabase dashboard)
-- Or call this function from your app periodically

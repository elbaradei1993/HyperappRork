-- Create SOS history table to store expired/resolved SOS reports
CREATE TABLE IF NOT EXISTS sos_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type VARCHAR(255),
  location JSONB,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  address TEXT,
  description TEXT,
  timestamp TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  expired_at TIMESTAMP WITH TIME ZONE,
  responded_by TEXT[],
  resolution_notes TEXT,
  response_time_minutes INTEGER
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sos_history_user_id ON sos_history(user_id);
CREATE INDEX IF NOT EXISTS idx_sos_history_created_at ON sos_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sos_history_resolved_at ON sos_history(resolved_at DESC);
CREATE INDEX IF NOT EXISTS idx_sos_history_expired_at ON sos_history(expired_at DESC);

-- Enable RLS
ALTER TABLE sos_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own SOS history" ON sos_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own SOS history" ON sos_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow anonymous viewing for emergency responders
CREATE POLICY "Allow anonymous viewing of SOS history" ON sos_history
  FOR SELECT USING (true);

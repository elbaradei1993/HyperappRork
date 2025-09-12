-- Create saved_places table
CREATE TABLE IF NOT EXISTS saved_places (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    type TEXT CHECK (type IN ('home', 'work', 'favorite')) DEFAULT 'favorite',
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_saved_places_user_id ON saved_places(user_id);

-- Enable RLS (Row Level Security)
ALTER TABLE saved_places ENABLE ROW LEVEL SECURITY;

-- Create policies for saved_places
CREATE POLICY "Users can view their own saved places" ON saved_places
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved places" ON saved_places
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved places" ON saved_places
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved places" ON saved_places
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_saved_places_updated_at
    BEFORE UPDATE ON saved_places
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

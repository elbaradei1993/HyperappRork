-- Add vibe column to geofences table
ALTER TABLE geofences 
ADD COLUMN IF NOT EXISTS vibe TEXT DEFAULT 'safe' CHECK (vibe IN ('safe', 'caution', 'danger'));

-- Add lastKnownState column to track geofence state
ALTER TABLE geofences 
ADD COLUMN IF NOT EXISTS last_known_state TEXT DEFAULT 'outside' CHECK (last_known_state IN ('inside', 'outside'));

-- Update existing geofences to have a default vibe
UPDATE geofences 
SET vibe = 'safe' 
WHERE vibe IS NULL;

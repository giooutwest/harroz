-- Add music columns to moods table
ALTER TABLE moods
ADD COLUMN IF NOT EXISTS song_title TEXT,
ADD COLUMN IF NOT EXISTS song_artist TEXT,
ADD COLUMN IF NOT EXISTS song_preview_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN moods.song_title IS 'Title of the song attached to this mood';
COMMENT ON COLUMN moods.song_artist IS 'Artist of the song attached to this mood';
COMMENT ON COLUMN moods.song_preview_url IS '30-second preview URL from Spotify';

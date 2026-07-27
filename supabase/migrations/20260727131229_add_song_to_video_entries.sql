-- Add optional song attachment columns to video_entries, mirroring the
-- song_title/song_artist/song_preview_url pattern used on the old moods table
-- (see 20240206_add_music_to_moods.sql).
ALTER TABLE video_entries
ADD COLUMN IF NOT EXISTS song_title TEXT,
ADD COLUMN IF NOT EXISTS song_artist TEXT,
ADD COLUMN IF NOT EXISTS song_preview_url TEXT;

COMMENT ON COLUMN video_entries.song_title IS 'Title of the song attached to this entry';
COMMENT ON COLUMN video_entries.song_artist IS 'Artist of the song attached to this entry';
COMMENT ON COLUMN video_entries.song_preview_url IS '30-second preview URL (iTunes Search API)';

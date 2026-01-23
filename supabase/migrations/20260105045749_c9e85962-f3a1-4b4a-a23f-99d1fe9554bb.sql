-- Add unique username column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;

-- Create unique index for usernames (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique ON public.profiles (LOWER(username));

-- Add constraint for username format (alphanumeric, underscore, 3-20 chars)
ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_format 
CHECK (username IS NULL OR (username ~ '^[a-zA-Z0-9_]{3,20}$'));
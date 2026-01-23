-- Add default_visibility column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS default_visibility text NOT NULL DEFAULT 'friends';

-- Update existing profiles to default to 'friends'
UPDATE public.profiles SET default_visibility = 'friends' WHERE default_visibility IS NULL OR default_visibility = '';
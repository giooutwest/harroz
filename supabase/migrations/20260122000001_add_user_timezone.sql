-- Add timezone column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Los_Angeles';

-- Add reminder_time column (hour in 24h format, default 21 = 9 PM)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS reminder_time INTEGER DEFAULT 21
CHECK (reminder_time >= 0 AND reminder_time <= 23);

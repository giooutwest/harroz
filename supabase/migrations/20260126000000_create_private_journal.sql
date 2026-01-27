-- Migration: Create Private Journal Feature
-- This adds a PIN-protected private journal system

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add journal PIN hash to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS journal_pin_hash TEXT DEFAULT NULL;

-- Create private journal entries table
CREATE TABLE IF NOT EXISTS public.private_journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  content TEXT,
  photos TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- One entry per user per day
  CONSTRAINT unique_user_journal_date UNIQUE (user_id, date)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS journal_entries_user_id_idx ON public.private_journal_entries(user_id);
CREATE INDEX IF NOT EXISTS journal_entries_date_idx ON public.private_journal_entries(date DESC);
CREATE INDEX IF NOT EXISTS journal_entries_user_date_idx ON public.private_journal_entries(user_id, date);

-- Enable Row Level Security
ALTER TABLE public.private_journal_entries ENABLE ROW LEVEL SECURITY;

-- Users can only view their own journal entries
CREATE POLICY "Users can view own journal entries"
ON public.private_journal_entries
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own journal entries
CREATE POLICY "Users can insert own journal entries"
ON public.private_journal_entries
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own entries only on the same day
CREATE POLICY "Users can update own journal entries same day"
ON public.private_journal_entries
FOR UPDATE
USING (
  auth.uid() = user_id
  AND date = CURRENT_DATE
);

-- Users can delete their own journal entries
CREATE POLICY "Users can delete own journal entries"
ON public.private_journal_entries
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at timestamp
CREATE TRIGGER update_journal_entries_updated_at
BEFORE UPDATE ON public.private_journal_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to verify PIN using bcrypt
CREATE OR REPLACE FUNCTION public.verify_journal_pin(
  p_user_id UUID,
  p_pin TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  stored_hash TEXT;
BEGIN
  SELECT journal_pin_hash INTO stored_hash
  FROM profiles
  WHERE user_id = p_user_id;

  IF stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN stored_hash = crypt(p_pin, stored_hash);
END;
$$;

-- Function to set/update PIN with bcrypt hash
CREATE OR REPLACE FUNCTION public.set_journal_pin(
  p_user_id UUID,
  p_pin TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE profiles
  SET journal_pin_hash = crypt(p_pin, gen_salt('bf'))
  WHERE user_id = p_user_id;

  RETURN FOUND;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.verify_journal_pin(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_journal_pin(UUID, TEXT) TO authenticated;

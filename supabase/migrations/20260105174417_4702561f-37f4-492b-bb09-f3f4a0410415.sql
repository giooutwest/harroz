-- Create app_updates table for storing feature updates
CREATE TABLE public.app_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  version TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_updates ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read updates
CREATE POLICY "Authenticated users can view updates"
ON public.app_updates
FOR SELECT
TO authenticated
USING (true);

-- Create user_update_reads table to track which updates users have seen
CREATE TABLE public.user_update_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  last_read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_update_reads ENABLE ROW LEVEL SECURITY;

-- Users can only see their own read status
CREATE POLICY "Users can view their own read status"
ON public.user_update_reads
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own read status
CREATE POLICY "Users can insert their own read status"
ON public.user_update_reads
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own read status
CREATE POLICY "Users can update their own read status"
ON public.user_update_reads
FOR UPDATE
USING (auth.uid() = user_id);

-- Add unique constraint on user_id
ALTER TABLE public.user_update_reads ADD CONSTRAINT user_update_reads_user_id_key UNIQUE (user_id);

-- Insert initial update
INSERT INTO public.app_updates (title, description, version) VALUES
  ('Time-Locked Journaling', 'Your mood entries are now available from 9 PM to midnight. This helps you reflect on your entire day before logging!', '1.1.0');
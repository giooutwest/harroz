-- Migration: Message Enhancements
-- Add voice memos, read/delivered timestamps, and reactions to messages

-- Add new columns to messages table
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS voice_url TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS voice_duration INTEGER DEFAULT NULL, -- duration in seconds
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'voice', 'image'));

-- Create message reactions table
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- One reaction per user per message
  CONSTRAINT unique_user_message_reaction UNIQUE (message_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS message_reactions_message_id_idx ON public.message_reactions(message_id);
CREATE INDEX IF NOT EXISTS message_reactions_user_id_idx ON public.message_reactions(user_id);

-- Enable RLS
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Users can view reactions on messages they can see
CREATE POLICY "Users can view message reactions"
ON public.message_reactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = message_id
    AND (m.sender_id = auth.uid() OR m.receiver_id = auth.uid())
  )
);

-- Users can add reactions to messages they can see
CREATE POLICY "Users can add reactions"
ON public.message_reactions
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = message_id
    AND (m.sender_id = auth.uid() OR m.receiver_id = auth.uid())
  )
);

-- Users can update their own reactions
CREATE POLICY "Users can update own reactions"
ON public.message_reactions
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own reactions
CREATE POLICY "Users can delete own reactions"
ON public.message_reactions
FOR DELETE
USING (auth.uid() = user_id);

-- Function to mark message as delivered
CREATE OR REPLACE FUNCTION public.mark_message_delivered(p_message_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.messages
  SET delivered_at = COALESCE(delivered_at, now())
  WHERE id = p_message_id
  AND receiver_id = auth.uid()
  AND delivered_at IS NULL;

  RETURN FOUND;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.mark_message_delivered(UUID) TO authenticated;

-- Create fit_checks table for the camera/fit check feature
CREATE TABLE IF NOT EXISTS public.fit_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  visibility TEXT NOT NULL DEFAULT 'friends' CHECK (visibility IN ('private', 'friends')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- One fit check per user per day
  CONSTRAINT unique_user_fit_check_date UNIQUE (user_id, date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS fit_checks_user_id_idx ON public.fit_checks(user_id);
CREATE INDEX IF NOT EXISTS fit_checks_date_idx ON public.fit_checks(date DESC);
CREATE INDEX IF NOT EXISTS fit_checks_created_at_idx ON public.fit_checks(created_at DESC);

-- Enable RLS
ALTER TABLE public.fit_checks ENABLE ROW LEVEL SECURITY;

-- Users can view their own fit checks
CREATE POLICY "Users can view own fit checks"
ON public.fit_checks
FOR SELECT
USING (auth.uid() = user_id);

-- Users can view friends' fit checks based on visibility
CREATE POLICY "Users can view friends fit checks"
ON public.fit_checks
FOR SELECT
USING (
  visibility = 'friends' AND
  EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
    AND (
      (f.requester_id = auth.uid() AND f.addressee_id = user_id) OR
      (f.addressee_id = auth.uid() AND f.requester_id = user_id)
    )
  )
);

-- Users can insert their own fit checks
CREATE POLICY "Users can insert own fit checks"
ON public.fit_checks
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own fit checks (same day only)
CREATE POLICY "Users can update own fit checks"
ON public.fit_checks
FOR UPDATE
USING (auth.uid() = user_id AND date = CURRENT_DATE);

-- Users can delete their own fit checks
CREATE POLICY "Users can delete own fit checks"
ON public.fit_checks
FOR DELETE
USING (auth.uid() = user_id);

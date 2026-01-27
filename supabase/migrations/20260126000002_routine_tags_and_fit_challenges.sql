-- Migration: Routine Tags and Fit Check Challenges
-- Add habit stacking toggles and timed fit check challenges

-- ============================================
-- ROUTINE TAGS (Habit Stacking)
-- ============================================

-- Default routine tags available to all users
CREATE TABLE IF NOT EXISTS public.default_routine_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL, -- emoji or icon name
  color TEXT DEFAULT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default tags
INSERT INTO public.default_routine_tags (name, icon, sort_order) VALUES
  ('Worked Out', '💪', 1),
  ('Skincare', '✨', 2),
  ('Reading', '📚', 3),
  ('Meditation', '🧘', 4),
  ('Journaling', '📝', 5),
  ('Hydrated', '💧', 6),
  ('Good Sleep', '😴', 7),
  ('Healthy Eating', '🥗', 8)
ON CONFLICT (name) DO NOTHING;

-- User's custom routine tags
CREATE TABLE IF NOT EXISTS public.user_routine_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT DEFAULT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- Each user can only have one tag with the same name
  CONSTRAINT unique_user_tag_name UNIQUE (user_id, name)
);

-- Tags logged for each mood entry
CREATE TABLE IF NOT EXISTS public.mood_routine_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mood_id UUID NOT NULL REFERENCES public.moods(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL, -- can be from default_routine_tags or user_routine_tags
  tag_type TEXT NOT NULL CHECK (tag_type IN ('default', 'custom')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- One tag per mood
  CONSTRAINT unique_mood_tag UNIQUE (mood_id, tag_id, tag_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS user_routine_tags_user_id_idx ON public.user_routine_tags(user_id);
CREATE INDEX IF NOT EXISTS mood_routine_tags_mood_id_idx ON public.mood_routine_tags(mood_id);
CREATE INDEX IF NOT EXISTS mood_routine_tags_tag_id_idx ON public.mood_routine_tags(tag_id);

-- Enable RLS
ALTER TABLE public.default_routine_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_routine_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mood_routine_tags ENABLE ROW LEVEL SECURITY;

-- Default tags are readable by everyone
CREATE POLICY "Anyone can view default tags"
ON public.default_routine_tags
FOR SELECT
USING (true);

-- Users can manage their own custom tags
CREATE POLICY "Users can view own tags"
ON public.user_routine_tags
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tags"
ON public.user_routine_tags
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tags"
ON public.user_routine_tags
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tags"
ON public.user_routine_tags
FOR DELETE
USING (auth.uid() = user_id);

-- Users can manage mood tags for their own moods
CREATE POLICY "Users can view own mood tags"
ON public.mood_routine_tags
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.moods m
    WHERE m.id = mood_id AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Users can add tags to own moods"
ON public.mood_routine_tags
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.moods m
    WHERE m.id = mood_id AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Users can remove tags from own moods"
ON public.mood_routine_tags
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.moods m
    WHERE m.id = mood_id AND m.user_id = auth.uid()
  )
);

-- ============================================
-- FIT CHECK CHALLENGES
-- ============================================

-- Daily challenge times (generated once per day)
CREATE TABLE IF NOT EXISTS public.fit_check_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_date DATE NOT NULL UNIQUE,
  challenge_time TIME NOT NULL, -- Random time during waking hours (9 AM - 9 PM)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Track who completed challenges
CREATE TABLE IF NOT EXISTS public.fit_check_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.fit_check_challenges(id) ON DELETE CASCADE,
  fit_check_id UUID REFERENCES public.fit_checks(id) ON DELETE SET NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  on_time BOOLEAN NOT NULL DEFAULT false, -- Completed within 20 min window

  CONSTRAINT unique_user_challenge UNIQUE (user_id, challenge_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS fit_check_challenges_date_idx ON public.fit_check_challenges(challenge_date DESC);
CREATE INDEX IF NOT EXISTS fit_check_completions_user_id_idx ON public.fit_check_completions(user_id);
CREATE INDEX IF NOT EXISTS fit_check_completions_challenge_id_idx ON public.fit_check_completions(challenge_id);

-- Enable RLS
ALTER TABLE public.fit_check_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fit_check_completions ENABLE ROW LEVEL SECURITY;

-- Everyone can view challenges
CREATE POLICY "Anyone can view challenges"
ON public.fit_check_challenges
FOR SELECT
USING (true);

-- Users can view their own completions
CREATE POLICY "Users can view own completions"
ON public.fit_check_completions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own completions
CREATE POLICY "Users can insert own completions"
ON public.fit_check_completions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Function to get or create today's challenge
CREATE OR REPLACE FUNCTION public.get_todays_challenge()
RETURNS TABLE (
  id UUID,
  challenge_date DATE,
  challenge_time TIME,
  challenge_timestamp TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_challenge_id UUID;
  v_challenge_time TIME;
BEGIN
  -- Try to get existing challenge
  SELECT c.id, c.challenge_time INTO v_challenge_id, v_challenge_time
  FROM public.fit_check_challenges c
  WHERE c.challenge_date = v_today;

  -- If no challenge exists, create one with random time between 9 AM and 9 PM
  IF v_challenge_id IS NULL THEN
    v_challenge_time := (TIME '09:00:00' + (random() * INTERVAL '12 hours'))::TIME;

    INSERT INTO public.fit_check_challenges (challenge_date, challenge_time)
    VALUES (v_today, v_challenge_time)
    RETURNING fit_check_challenges.id INTO v_challenge_id;
  END IF;

  RETURN QUERY
  SELECT
    v_challenge_id,
    v_today,
    v_challenge_time,
    (v_today + v_challenge_time)::TIMESTAMP WITH TIME ZONE;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_todays_challenge() TO authenticated;

-- Function to complete a challenge
CREATE OR REPLACE FUNCTION public.complete_fit_challenge(p_fit_check_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_challenge RECORD;
  v_now TIMESTAMP WITH TIME ZONE := now();
  v_challenge_start TIMESTAMP WITH TIME ZONE;
  v_challenge_end TIMESTAMP WITH TIME ZONE;
  v_on_time BOOLEAN;
BEGIN
  -- Get today's challenge
  SELECT * INTO v_challenge FROM public.get_todays_challenge();

  -- Calculate window
  v_challenge_start := v_challenge.challenge_timestamp;
  v_challenge_end := v_challenge_start + INTERVAL '20 minutes';

  -- Check if within time window
  v_on_time := v_now >= v_challenge_start AND v_now <= v_challenge_end;

  -- Insert completion
  INSERT INTO public.fit_check_completions (user_id, challenge_id, fit_check_id, on_time)
  VALUES (auth.uid(), v_challenge.id, p_fit_check_id, v_on_time)
  ON CONFLICT (user_id, challenge_id) DO UPDATE
  SET fit_check_id = p_fit_check_id, on_time = v_on_time, completed_at = now();

  RETURN v_on_time;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.complete_fit_challenge(UUID) TO authenticated;

-- Add fit_check_streak to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS fit_check_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS fit_check_best_streak INTEGER DEFAULT 0;

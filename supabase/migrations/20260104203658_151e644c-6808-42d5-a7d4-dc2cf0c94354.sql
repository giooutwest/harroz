-- Create moods table for storing daily mood entries
CREATE TABLE public.moods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 10),
  note TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(date)
);

-- Enable Row Level Security
ALTER TABLE public.moods ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (public app, no auth required initially)
CREATE POLICY "Allow all operations on moods" 
ON public.moods 
FOR ALL 
USING (true)
WITH CHECK (true);
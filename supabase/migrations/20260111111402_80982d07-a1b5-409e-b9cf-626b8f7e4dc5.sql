-- Add max_combo column to profiles table to track personal best combo
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS max_combo integer DEFAULT 0;

-- Create combo_records table for detailed combo history
CREATE TABLE public.combo_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  combo_count integer NOT NULL,
  mode text NOT NULL CHECK (mode IN ('learning', 'ranked', 'free_match')),
  level_name text,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.combo_records ENABLE ROW LEVEL SECURITY;

-- Everyone can view combo records (for leaderboard)
CREATE POLICY "Combo records are viewable by everyone" 
ON public.combo_records 
FOR SELECT 
USING (true);

-- Users can insert their own combo records
CREATE POLICY "Users can insert their own combo records" 
ON public.combo_records 
FOR INSERT 
WITH CHECK (auth.uid() = (SELECT user_id FROM profiles WHERE id = profile_id));

-- Create index for efficient leaderboard queries
CREATE INDEX idx_combo_records_combo_count ON public.combo_records(combo_count DESC);
CREATE INDEX idx_combo_records_profile ON public.combo_records(profile_id);
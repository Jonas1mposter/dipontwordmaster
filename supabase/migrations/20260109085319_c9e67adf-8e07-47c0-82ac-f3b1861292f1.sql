-- Add ELO rating columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS elo_rating integer NOT NULL DEFAULT 1000,
ADD COLUMN IF NOT EXISTS elo_free integer NOT NULL DEFAULT 1000;

-- Add ELO ratings to ranked_matches for historical tracking
ALTER TABLE public.ranked_matches
ADD COLUMN IF NOT EXISTS player1_elo integer,
ADD COLUMN IF NOT EXISTS player2_elo integer;

-- Create index for faster ELO-based matchmaking queries
CREATE INDEX IF NOT EXISTS idx_profiles_elo_rating ON public.profiles(elo_rating);
CREATE INDEX IF NOT EXISTS idx_profiles_elo_free ON public.profiles(elo_free);
CREATE INDEX IF NOT EXISTS idx_profiles_grade_elo ON public.profiles(grade, elo_rating);
CREATE INDEX IF NOT EXISTS idx_profiles_elo_free_grade ON public.profiles(elo_free);
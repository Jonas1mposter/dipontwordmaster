-- Add free match stats columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS free_match_wins integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS free_match_losses integer NOT NULL DEFAULT 0;
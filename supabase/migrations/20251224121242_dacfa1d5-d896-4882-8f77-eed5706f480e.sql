-- Add total_xp column to profiles to track cumulative XP earned
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS total_xp bigint NOT NULL DEFAULT 0;
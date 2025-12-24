-- Create season pass items table
CREATE TABLE IF NOT EXISTS public.season_pass_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  level integer NOT NULL,
  is_premium boolean NOT NULL DEFAULT false,
  reward_type text NOT NULL,
  reward_value integer NOT NULL DEFAULT 0,
  reward_item_id uuid,
  icon text NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create user season pass progress table
CREATE TABLE IF NOT EXISTS public.user_season_pass (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL,
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  is_premium boolean NOT NULL DEFAULT false,
  current_level integer NOT NULL DEFAULT 1,
  current_xp integer NOT NULL DEFAULT 0,
  xp_to_next_level integer NOT NULL DEFAULT 100,
  purchased_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(profile_id, season_id)
);

-- Create claimed rewards tracking
CREATE TABLE IF NOT EXISTS public.user_pass_rewards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL,
  season_pass_item_id uuid NOT NULL REFERENCES public.season_pass_items(id) ON DELETE CASCADE,
  claimed_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(profile_id, season_pass_item_id)
);

-- Enable RLS
ALTER TABLE public.season_pass_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_season_pass ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_pass_rewards ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Anyone can view season pass items" ON public.season_pass_items;
DROP POLICY IF EXISTS "Users can view their own season pass" ON public.user_season_pass;
DROP POLICY IF EXISTS "Users can insert their own season pass" ON public.user_season_pass;
DROP POLICY IF EXISTS "Users can update their own season pass" ON public.user_season_pass;
DROP POLICY IF EXISTS "Users can view their own pass rewards" ON public.user_pass_rewards;
DROP POLICY IF EXISTS "Users can claim their own pass rewards" ON public.user_pass_rewards;

-- RLS policies
CREATE POLICY "Anyone can view season pass items"
ON public.season_pass_items FOR SELECT USING (true);

CREATE POLICY "Users can view their own season pass"
ON public.user_season_pass FOR SELECT
USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their own season pass"
ON public.user_season_pass FOR INSERT
WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own season pass"
ON public.user_season_pass FOR UPDATE
USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view their own pass rewards"
ON public.user_pass_rewards FOR SELECT
USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can claim their own pass rewards"
ON public.user_pass_rewards FOR INSERT
WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
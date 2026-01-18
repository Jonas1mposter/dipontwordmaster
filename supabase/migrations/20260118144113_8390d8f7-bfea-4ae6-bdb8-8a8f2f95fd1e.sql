-- Add more seasonal features to the seasons table
ALTER TABLE public.seasons
ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'default',
ADD COLUMN IF NOT EXISTS bonus_multiplier DECIMAL(3,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'Calendar',
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT 'hsl(262, 83%, 58%)',
ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT 'hsl(217, 91%, 60%)';

-- Create season_milestones table for special seasonal achievements
CREATE TABLE IF NOT EXISTS public.season_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'Target',
  target_type TEXT NOT NULL, -- 'xp', 'levels', 'accuracy', 'words', 'battles'
  target_value INTEGER NOT NULL,
  reward_type TEXT NOT NULL, -- 'coins', 'badge', 'name_card', 'energy'
  reward_value INTEGER DEFAULT 0,
  reward_item_id UUID, -- Optional reference to badge/name_card
  is_global BOOLEAN DEFAULT false, -- True = all users must contribute, False = individual
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_season_milestones to track user progress
CREATE TABLE IF NOT EXISTS public.user_season_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  milestone_id UUID NOT NULL REFERENCES public.season_milestones(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  claimed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  claimed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(profile_id, milestone_id)
);

-- Create season_events for special time-limited events within seasons
CREATE TABLE IF NOT EXISTS public.season_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'Zap',
  event_type TEXT NOT NULL, -- 'double_xp', 'bonus_coins', 'special_battle', 'flash_sale'
  bonus_value DECIMAL(3,2) DEFAULT 1.5, -- Multiplier or flat bonus
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.season_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_season_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for season_milestones (read-only for users)
CREATE POLICY "Anyone can view season milestones"
ON public.season_milestones FOR SELECT
USING (true);

-- RLS Policies for user_season_milestones
CREATE POLICY "Users can view their own milestone progress"
ON public.user_season_milestones FOR SELECT
USING (auth.uid() IN (SELECT user_id FROM profiles WHERE id = profile_id));

CREATE POLICY "Users can insert their own milestone progress"
ON public.user_season_milestones FOR INSERT
WITH CHECK (auth.uid() IN (SELECT user_id FROM profiles WHERE id = profile_id));

CREATE POLICY "Users can update their own milestone progress"
ON public.user_season_milestones FOR UPDATE
USING (auth.uid() IN (SELECT user_id FROM profiles WHERE id = profile_id));

-- RLS Policies for season_events (read-only for users)
CREATE POLICY "Anyone can view season events"
ON public.season_events FOR SELECT
USING (true);

-- Insert sample milestones for current active seasons
INSERT INTO public.season_milestones (season_id, name, description, icon, target_type, target_value, reward_type, reward_value, is_global, order_index)
SELECT 
  s.id,
  '词汇新星',
  '累计学习100个新单词',
  'Star',
  'words',
  100,
  'coins',
  50,
  false,
  1
FROM public.seasons s WHERE s.is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO public.season_milestones (season_id, name, description, icon, target_type, target_value, reward_type, reward_value, is_global, order_index)
SELECT 
  s.id,
  '闯关达人',
  '完成20个关卡挑战',
  'Trophy',
  'levels',
  20,
  'coins',
  100,
  false,
  2
FROM public.seasons s WHERE s.is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO public.season_milestones (season_id, name, description, icon, target_type, target_value, reward_type, reward_value, is_global, order_index)
SELECT 
  s.id,
  '排位勇士',
  '赢得10场排位赛',
  'Swords',
  'battles',
  10,
  'coins',
  150,
  false,
  3
FROM public.seasons s WHERE s.is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO public.season_milestones (season_id, name, description, icon, target_type, target_value, reward_type, reward_value, is_global, order_index)
SELECT 
  s.id,
  '经验大师',
  '累积获得5000经验值',
  'Sparkles',
  'xp',
  5000,
  'coins',
  200,
  false,
  4
FROM public.seasons s WHERE s.is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO public.season_milestones (season_id, name, description, icon, target_type, target_value, reward_type, reward_value, is_global, order_index)
SELECT 
  s.id,
  '精准射手',
  '答题正确率达到90%（至少100题）',
  'Target',
  'accuracy',
  90,
  'coins',
  250,
  false,
  5
FROM public.seasons s WHERE s.is_active = true
ON CONFLICT DO NOTHING;
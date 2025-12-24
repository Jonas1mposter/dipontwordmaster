-- 班级挑战统计表
CREATE TABLE public.class_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  grade integer NOT NULL,
  class_name text NOT NULL,
  total_xp bigint NOT NULL DEFAULT 0,
  total_correct integer NOT NULL DEFAULT 0,
  total_answered integer NOT NULL DEFAULT 0,
  total_levels_completed integer NOT NULL DEFAULT 0,
  member_count integer NOT NULL DEFAULT 0,
  composite_score numeric NOT NULL DEFAULT 0,
  rank_position integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(season_id, grade, class_name)
);

-- 年级挑战统计表
CREATE TABLE public.grade_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  grade integer NOT NULL,
  total_xp bigint NOT NULL DEFAULT 0,
  total_correct integer NOT NULL DEFAULT 0,
  total_answered integer NOT NULL DEFAULT 0,
  total_levels_completed integer NOT NULL DEFAULT 0,
  member_count integer NOT NULL DEFAULT 0,
  composite_score numeric NOT NULL DEFAULT 0,
  rank_position integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(season_id, grade)
);

-- 挑战赛奖励记录表
CREATE TABLE public.challenge_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_type text NOT NULL, -- 'coins', 'badge', 'xp_boost'
  reward_value integer NOT NULL DEFAULT 0,
  challenge_type text NOT NULL, -- 'class', 'grade'
  rank_achieved integer,
  claimed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(season_id, profile_id, challenge_type, reward_type)
);

-- 启用RLS
ALTER TABLE public.class_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_rewards ENABLE ROW LEVEL SECURITY;

-- class_challenges 策略
CREATE POLICY "Anyone can view class challenges"
ON public.class_challenges
FOR SELECT
USING (true);

-- grade_challenges 策略
CREATE POLICY "Anyone can view grade challenges"
ON public.grade_challenges
FOR SELECT
USING (true);

-- challenge_rewards 策略
CREATE POLICY "Users can view their own challenge rewards"
ON public.challenge_rewards
FOR SELECT
USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can claim their own challenge rewards"
ON public.challenge_rewards
FOR UPDATE
USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- 添加挑战赛专属徽章
INSERT INTO public.badges (name, description, icon, rarity, category) VALUES
('班级冠军', '在班级挑战赛中获得第一名', '🏆', 'legendary', 'challenge'),
('班级亚军', '在班级挑战赛中获得第二名', '🥈', 'epic', 'challenge'),
('班级季军', '在班级挑战赛中获得第三名', '🥉', 'rare', 'challenge'),
('年级之星', '在年级挑战赛中获得第一名', '⭐', 'legendary', 'challenge'),
('年级先锋', '在年级挑战赛中获得前三名', '🌟', 'epic', 'challenge');

-- 更新触发器
CREATE TRIGGER update_class_challenges_updated_at
BEFORE UPDATE ON public.class_challenges
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_grade_challenges_updated_at
BEFORE UPDATE ON public.grade_challenges
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
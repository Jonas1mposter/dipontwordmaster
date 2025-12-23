-- 勋章表
CREATE TABLE public.badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'achievement',
  rarity TEXT NOT NULL DEFAULT 'common',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 名片表
CREATE TABLE public.name_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  background_gradient TEXT NOT NULL,
  icon TEXT,
  category TEXT NOT NULL DEFAULT 'leaderboard',
  rarity TEXT NOT NULL DEFAULT 'legendary',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 用户勋章关联表
CREATE TABLE public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  equipped_slot INTEGER,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(profile_id, badge_id)
);

-- 用户名片关联表
CREATE TABLE public.user_name_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name_card_id UUID NOT NULL REFERENCES public.name_cards(id) ON DELETE CASCADE,
  is_equipped BOOLEAN NOT NULL DEFAULT false,
  rank_position INTEGER,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(profile_id, name_card_id)
);

-- 启用RLS
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.name_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_name_cards ENABLE ROW LEVEL SECURITY;

-- 勋章和名片任何人可查看
CREATE POLICY "Anyone can view badges" ON public.badges FOR SELECT USING (true);
CREATE POLICY "Anyone can view name_cards" ON public.name_cards FOR SELECT USING (true);

-- 用户勋章权限
CREATE POLICY "Users can view all user badges" ON public.user_badges FOR SELECT USING (true);
CREATE POLICY "Users can insert own badges" ON public.user_badges FOR INSERT 
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own badges" ON public.user_badges FOR UPDATE 
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- 用户名片权限
CREATE POLICY "Users can view all user name_cards" ON public.user_name_cards FOR SELECT USING (true);
CREATE POLICY "Users can insert own name_cards" ON public.user_name_cards FOR INSERT 
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own name_cards" ON public.user_name_cards FOR UPDATE 
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- 插入默认排行榜名片
INSERT INTO public.name_cards (name, description, background_gradient, icon, category, rarity) VALUES
('狄邦财富大亨', '狄邦豆排行榜前十专属名片', 'from-amber-500 via-yellow-400 to-amber-600', 'Coins', 'leaderboard_coins', 'legendary'),
('狄邦排位大师', '排位胜利场次排行榜前十专属名片', 'from-purple-600 via-pink-500 to-purple-600', 'Swords', 'leaderboard_wins', 'legendary'),
('狄邦至高巅峰', '经验值排行榜前十专属名片', 'from-cyan-500 via-blue-500 to-indigo-600', 'TrendingUp', 'leaderboard_xp', 'legendary');

-- 插入默认勋章
INSERT INTO public.badges (name, description, icon, category, rarity) VALUES
('初入江湖', '完成注册', 'User', 'achievement', 'common'),
('学海无涯', '学习100个单词', 'BookOpen', 'learning', 'rare'),
('连胜新星', '排位赛连胜3场', 'Flame', 'ranked', 'rare'),
('财富新贵', '拥有1000狄邦豆', 'Coins', 'wealth', 'epic'),
('王者荣耀', '达到钻石段位', 'Crown', 'ranked', 'legendary');
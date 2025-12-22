-- Create learning progress table to track word mastery
CREATE TABLE public.learning_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  word_id UUID REFERENCES public.words(id) ON DELETE CASCADE NOT NULL,
  correct_count INTEGER NOT NULL DEFAULT 0,
  incorrect_count INTEGER NOT NULL DEFAULT 0,
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  next_review_at TIMESTAMP WITH TIME ZONE,
  mastery_level INTEGER NOT NULL DEFAULT 0 CHECK (mastery_level >= 0 AND mastery_level <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(profile_id, word_id)
);

-- Create levels table
CREATE TABLE public.levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade INTEGER NOT NULL CHECK (grade IN (7, 8)),
  unit INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  word_count INTEGER NOT NULL DEFAULT 0,
  energy_cost INTEGER NOT NULL DEFAULT 1,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create level progress table
CREATE TABLE public.level_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  level_id UUID REFERENCES public.levels(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'locked' CHECK (status IN ('locked', 'available', 'completed')),
  stars INTEGER NOT NULL DEFAULT 0 CHECK (stars >= 0 AND stars <= 3),
  best_score INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(profile_id, level_id)
);

-- Create daily quests table
CREATE TABLE public.daily_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  quest_type TEXT NOT NULL CHECK (quest_type IN ('learn', 'battle', 'streak', 'words')),
  target INTEGER NOT NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('xp', 'coins', 'energy')),
  reward_amount INTEGER NOT NULL,
  grade INTEGER CHECK (grade IN (7, 8)),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user daily quest progress
CREATE TABLE public.user_quest_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  quest_id UUID REFERENCES public.daily_quests(id) ON DELETE CASCADE NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  claimed BOOLEAN NOT NULL DEFAULT false,
  quest_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(profile_id, quest_id, quest_date)
);

-- Enable RLS
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.level_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quest_progress ENABLE ROW LEVEL SECURITY;

-- Learning progress policies
CREATE POLICY "Users can view own learning progress"
ON public.learning_progress FOR SELECT
USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own learning progress"
ON public.learning_progress FOR INSERT
WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own learning progress"
ON public.learning_progress FOR UPDATE
USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Levels policies (public read)
CREATE POLICY "Anyone can view levels"
ON public.levels FOR SELECT
USING (true);

-- Level progress policies
CREATE POLICY "Users can view own level progress"
ON public.level_progress FOR SELECT
USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own level progress"
ON public.level_progress FOR INSERT
WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own level progress"
ON public.level_progress FOR UPDATE
USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Daily quests policies (public read)
CREATE POLICY "Anyone can view daily quests"
ON public.daily_quests FOR SELECT
USING (true);

-- User quest progress policies
CREATE POLICY "Users can view own quest progress"
ON public.user_quest_progress FOR SELECT
USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own quest progress"
ON public.user_quest_progress FOR INSERT
WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own quest progress"
ON public.user_quest_progress FOR UPDATE
USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Add triggers for updated_at
CREATE TRIGGER update_learning_progress_updated_at
BEFORE UPDATE ON public.learning_progress
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_level_progress_updated_at
BEFORE UPDATE ON public.level_progress
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_quest_progress_updated_at
BEFORE UPDATE ON public.user_quest_progress
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample levels for grade 7
INSERT INTO public.levels (grade, unit, name, description, word_count, energy_cost, order_index) VALUES
(7, 1, 'Unit 1 - 基础词汇', '学习日常基础词汇', 8, 1, 1),
(7, 1, 'Unit 1 - 进阶词汇', '掌握更多进阶表达', 8, 1, 2),
(7, 2, 'Unit 2 - 日常用语', '日常交流常用词汇', 8, 2, 3),
(7, 2, 'Unit 2 - 学术词汇', '学术场景词汇积累', 8, 2, 4),
(7, 3, 'Unit 3 - 动词短语', '常用动词短语搭配', 8, 3, 5);

-- Insert sample levels for grade 8
INSERT INTO public.levels (grade, unit, name, description, word_count, energy_cost, order_index) VALUES
(8, 1, 'Unit 1 - 基础词汇', '八年级基础词汇', 8, 1, 1),
(8, 1, 'Unit 1 - 进阶词汇', '八年级进阶表达', 8, 1, 2),
(8, 2, 'Unit 2 - 日常用语', '高阶日常交流词汇', 8, 2, 3),
(8, 2, 'Unit 2 - 学术词汇', '高阶学术词汇', 8, 2, 4),
(8, 3, 'Unit 3 - 动词短语', '复杂动词短语', 8, 3, 5);

-- Insert daily quests
INSERT INTO public.daily_quests (title, description, quest_type, target, reward_type, reward_amount, grade) VALUES
('每日学习', '完成3个关卡', 'learn', 3, 'xp', 100, NULL),
('单词挑战', '正确回答20个单词', 'words', 20, 'coins', 50, NULL),
('排位胜利', '在排位赛中获胜1次', 'battle', 1, 'energy', 5, NULL),
('连续学习', '保持学习记录', 'streak', 1, 'xp', 50, NULL);

-- Add more words to the database
INSERT INTO public.words (word, meaning, phonetic, example, grade, unit, difficulty) VALUES
-- Grade 7 Unit 1
('adventure', '冒险，奇遇', '/ədˈventʃər/', 'Life is an adventure.', 7, 1, 2),
('brilliant', '杰出的，灿烂的', '/ˈbrɪliənt/', 'She had a brilliant idea.', 7, 1, 3),
('curious', '好奇的', '/ˈkjʊəriəs/', 'The curious cat explored everywhere.', 7, 1, 2),
-- Grade 7 Unit 2
('destination', '目的地', '/ˌdestɪˈneɪʃn/', 'We finally reached our destination.', 7, 2, 3),
('explore', '探索', '/ɪkˈsplɔːr/', 'Let us explore the forest.', 7, 2, 2),
('flexible', '灵活的', '/ˈfleksəbl/', 'We need a flexible schedule.', 7, 2, 3),
-- Grade 8 Unit 1
('analysis', '分析', '/əˈnæləsɪs/', 'The analysis revealed new insights.', 8, 1, 4),
('beneficial', '有益的', '/ˌbenɪˈfɪʃl/', 'Exercise is beneficial for health.', 8, 1, 3),
('comprehensive', '全面的', '/ˌkɒmprɪˈhensɪv/', 'We need a comprehensive plan.', 8, 1, 4),
-- Grade 8 Unit 2
('diligent', '勤奋的', '/ˈdɪlɪdʒənt/', 'She is a diligent student.', 8, 2, 3),
('elaborate', '详尽的，精心制作的', '/ɪˈlæbərət/', 'They made elaborate preparations.', 8, 2, 4),
('fundamental', '基本的，根本的', '/ˌfʌndəˈmentl/', 'This is a fundamental principle.', 8, 2, 4);

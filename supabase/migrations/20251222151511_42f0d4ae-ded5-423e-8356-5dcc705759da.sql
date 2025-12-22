-- Create enum for rank tiers
CREATE TYPE public.rank_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum', 'diamond', 'champion');

-- Create profiles table for player data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  username TEXT NOT NULL,
  grade INTEGER NOT NULL CHECK (grade IN (7, 8)),
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  xp_to_next_level INTEGER NOT NULL DEFAULT 100,
  coins INTEGER NOT NULL DEFAULT 100,
  energy INTEGER NOT NULL DEFAULT 10,
  max_energy INTEGER NOT NULL DEFAULT 10,
  streak INTEGER NOT NULL DEFAULT 0,
  rank_tier rank_tier NOT NULL DEFAULT 'bronze',
  rank_stars INTEGER NOT NULL DEFAULT 0 CHECK (rank_stars >= 0 AND rank_stars <= 5),
  rank_points INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ranked matches table
CREATE TABLE public.ranked_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade INTEGER NOT NULL CHECK (grade IN (7, 8)),
  player1_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  player2_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  player1_score INTEGER NOT NULL DEFAULT 0,
  player2_score INTEGER NOT NULL DEFAULT 0,
  winner_id UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'matching', 'in_progress', 'completed', 'cancelled')),
  words JSONB NOT NULL DEFAULT '[]',
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create seasons table
CREATE TABLE public.seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  grade INTEGER NOT NULL CHECK (grade IN (7, 8)),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create words table for vocabulary
CREATE TABLE public.words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL,
  meaning TEXT NOT NULL,
  phonetic TEXT,
  example TEXT,
  grade INTEGER NOT NULL CHECK (grade IN (7, 8)),
  unit INTEGER NOT NULL DEFAULT 1,
  difficulty INTEGER NOT NULL DEFAULT 1 CHECK (difficulty >= 1 AND difficulty <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranked_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.words ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles in same grade"
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Ranked matches policies
CREATE POLICY "Users can view matches they participate in or waiting matches"
ON public.ranked_matches FOR SELECT
USING (
  player1_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR player2_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR status = 'waiting'
);

CREATE POLICY "Authenticated users can create matches"
ON public.ranked_matches FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Participants can update matches"
ON public.ranked_matches FOR UPDATE
USING (
  player1_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR player2_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- Seasons policies (public read)
CREATE POLICY "Anyone can view seasons"
ON public.seasons FOR SELECT
USING (true);

-- Words policies (public read)
CREATE POLICY "Anyone can view words"
ON public.words FOR SELECT
USING (true);

-- Enable realtime for ranked matches
ALTER PUBLICATION supabase_realtime ADD TABLE public.ranked_matches;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample words for testing
INSERT INTO public.words (word, meaning, phonetic, example, grade, unit, difficulty) VALUES
('magnificent', '壮丽的，宏伟的', '/mæɡˈnɪfɪsənt/', 'The view from the mountain was magnificent.', 7, 1, 3),
('perseverance', '坚持不懈，毅力', '/ˌpɜːsɪˈvɪərəns/', 'Success requires perseverance and hard work.', 7, 1, 4),
('phenomenon', '现象，奇迹', '/fəˈnɒmɪnən/', 'The Northern Lights are a natural phenomenon.', 7, 1, 4),
('enthusiasm', '热情，热忱', '/ɪnˈθjuːziæzəm/', 'She showed great enthusiasm for the project.', 7, 1, 3),
('consequence', '结果，后果', '/ˈkɒnsɪkwəns/', 'Every action has a consequence.', 7, 1, 3),
('accomplish', '完成，实现', '/əˈkʌmplɪʃ/', 'She accomplished her goal of running a marathon.', 7, 2, 2),
('demonstrate', '展示，证明', '/ˈdemənstreɪt/', 'The teacher will demonstrate the experiment.', 7, 2, 2),
('significant', '重要的，有意义的', '/sɪɡˈnɪfɪkənt/', 'This is a significant achievement.', 7, 2, 3),
('atmosphere', '气氛，大气层', '/ˈætməsfɪər/', 'The restaurant had a romantic atmosphere.', 8, 1, 3),
('controversial', '有争议的', '/ˌkɒntrəˈvɜːʃəl/', 'The decision was highly controversial.', 8, 1, 4),
('sustainable', '可持续的', '/səˈsteɪnəbl/', 'We need sustainable energy solutions.', 8, 1, 4),
('innovation', '创新', '/ˌɪnəˈveɪʃn/', 'Technology innovation drives progress.', 8, 1, 3),
('perspective', '观点，视角', '/pəˈspektɪv/', 'Try to see things from a different perspective.', 8, 2, 3),
('sophisticated', '复杂的，精密的', '/səˈfɪstɪkeɪtɪd/', 'This is a sophisticated piece of equipment.', 8, 2, 4),
('acknowledge', '承认，认可', '/əkˈnɒlɪdʒ/', 'You must acknowledge your mistakes.', 8, 2, 3),
('determination', '决心', '/dɪˌtɜːmɪˈneɪʃn/', 'Her determination led to success.', 8, 2, 3);

-- Insert active seasons
INSERT INTO public.seasons (name, grade, start_date, end_date, is_active) VALUES
('赛季一 · 词汇之战', 7, now(), now() + interval '30 days', true),
('赛季一 · 词汇之战', 8, now(), now() + interval '30 days', true);

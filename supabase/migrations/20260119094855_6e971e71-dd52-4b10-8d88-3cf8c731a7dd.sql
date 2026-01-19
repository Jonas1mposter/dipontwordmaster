-- Create teams table
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  leader_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  member_count INTEGER NOT NULL DEFAULT 1,
  total_xp BIGINT NOT NULL DEFAULT 0,
  total_wins INTEGER NOT NULL DEFAULT 0,
  rank_position INTEGER
);

-- Create team_members table
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'officer', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  contributed_xp BIGINT NOT NULL DEFAULT 0,
  contributed_wins INTEGER NOT NULL DEFAULT 0,
  UNIQUE(profile_id)
);

-- Create team_season_stats for tracking team performance per season
CREATE TABLE public.team_season_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  total_xp BIGINT NOT NULL DEFAULT 0,
  total_wins INTEGER NOT NULL DEFAULT 0,
  total_battles INTEGER NOT NULL DEFAULT 0,
  accuracy_rate NUMERIC(5,2) DEFAULT 0,
  rank_position INTEGER,
  milestone_progress JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id, season_id)
);

-- Create team_milestones for defining season goals
CREATE TABLE public.team_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  target_type TEXT NOT NULL CHECK (target_type IN ('xp', 'wins', 'battles', 'accuracy')),
  target_value INTEGER NOT NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('coins', 'xp', 'badge', 'namecard')),
  reward_value INTEGER NOT NULL DEFAULT 0,
  reward_item_id UUID,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create team_milestone_claims for tracking claimed rewards
CREATE TABLE public.team_milestone_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  milestone_id UUID NOT NULL REFERENCES public.team_milestones(id) ON DELETE CASCADE,
  claimed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  claimed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id, milestone_id)
);

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_season_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_milestone_claims ENABLE ROW LEVEL SECURITY;

-- Teams policies
CREATE POLICY "Anyone can view teams" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Leaders can update their team" ON public.teams FOR UPDATE USING (leader_id = auth.uid());
CREATE POLICY "Authenticated users can create teams" ON public.teams FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Team members policies
CREATE POLICY "Anyone can view team members" ON public.team_members FOR SELECT USING (true);
CREATE POLICY "Users can join teams" ON public.team_members FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can leave teams" ON public.team_members FOR DELETE USING (auth.uid() = profile_id);
CREATE POLICY "Leaders can manage members" ON public.team_members FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND leader_id = auth.uid())
);

-- Team season stats policies
CREATE POLICY "Anyone can view team season stats" ON public.team_season_stats FOR SELECT USING (true);
CREATE POLICY "System can manage team season stats" ON public.team_season_stats FOR ALL USING (true);

-- Team milestones policies
CREATE POLICY "Anyone can view team milestones" ON public.team_milestones FOR SELECT USING (true);

-- Team milestone claims policies
CREATE POLICY "Anyone can view milestone claims" ON public.team_milestone_claims FOR SELECT USING (true);
CREATE POLICY "Team members can claim milestones" ON public.team_milestone_claims FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.team_members WHERE team_id = team_milestone_claims.team_id AND profile_id = auth.uid())
);

-- Create indexes
CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX idx_team_members_profile_id ON public.team_members(profile_id);
CREATE INDEX idx_team_season_stats_team_id ON public.team_season_stats(team_id);
CREATE INDEX idx_team_season_stats_season_id ON public.team_season_stats(season_id);
CREATE INDEX idx_teams_rank_position ON public.teams(rank_position);

-- Add trigger for updated_at
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_team_season_stats_updated_at BEFORE UPDATE ON public.team_season_stats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update team member count
CREATE OR REPLACE FUNCTION public.update_team_member_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE teams SET member_count = member_count + 1 WHERE id = NEW.team_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE teams SET member_count = member_count - 1 WHERE id = OLD.team_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trigger_update_team_member_count
AFTER INSERT OR DELETE ON public.team_members
FOR EACH ROW EXECUTE FUNCTION public.update_team_member_count();

-- Add team_id to profiles for quick lookup
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

-- Function to sync profile team_id
CREATE OR REPLACE FUNCTION public.sync_profile_team_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET team_id = NEW.team_id WHERE id = NEW.profile_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET team_id = NULL WHERE id = OLD.profile_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trigger_sync_profile_team_id
AFTER INSERT OR DELETE ON public.team_members
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_team_id();

-- Insert default milestones for current active season
INSERT INTO public.team_milestones (season_id, name, description, target_type, target_value, reward_type, reward_value, display_order)
SELECT 
  s.id,
  milestone.name,
  milestone.description,
  milestone.target_type,
  milestone.target_value,
  milestone.reward_type,
  milestone.reward_value,
  milestone.display_order
FROM public.seasons s
CROSS JOIN (
  VALUES 
    ('团队初心', '战队累计获得1000经验值', 'xp', 1000, 'coins', 100, 1),
    ('团结力量', '战队累计获得5000经验值', 'xp', 5000, 'coins', 300, 2),
    ('精英战队', '战队累计获得20000经验值', 'xp', 20000, 'coins', 500, 3),
    ('常胜将军', '战队累计获得50场胜利', 'wins', 50, 'coins', 200, 4),
    ('百战百胜', '战队累计获得200场胜利', 'wins', 200, 'coins', 600, 5),
    ('战斗狂人', '战队累计完成100场对战', 'battles', 100, 'xp', 500, 6),
    ('精准射手', '战队平均正确率达到80%', 'accuracy', 80, 'coins', 400, 7)
) AS milestone(name, description, target_type, target_value, reward_type, reward_value, display_order)
WHERE s.is_active = true;
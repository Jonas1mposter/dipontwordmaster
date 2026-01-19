
-- 1. Team announcements table
CREATE TABLE public.team_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_announcements ENABLE ROW LEVEL SECURITY;

-- RLS policies for announcements
CREATE POLICY "Team members can view announcements" ON public.team_announcements
  FOR SELECT USING (
    team_id IN (
      SELECT tm.team_id FROM team_members tm
      JOIN profiles p ON p.id = tm.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Leaders and officers can create announcements" ON public.team_announcements
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN profiles p ON p.id = tm.profile_id
      WHERE p.user_id = auth.uid()
        AND tm.team_id = team_announcements.team_id
        AND tm.role IN ('leader', 'officer')
    )
  );

CREATE POLICY "Leaders and officers can update announcements" ON public.team_announcements
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN profiles p ON p.id = tm.profile_id
      WHERE p.user_id = auth.uid()
        AND tm.team_id = team_announcements.team_id
        AND tm.role IN ('leader', 'officer')
    )
  );

CREATE POLICY "Leaders and officers can delete announcements" ON public.team_announcements
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN profiles p ON p.id = tm.profile_id
      WHERE p.user_id = auth.uid()
        AND tm.team_id = team_announcements.team_id
        AND tm.role IN ('leader', 'officer')
    )
  );

-- 2. Team join applications table
CREATE TABLE public.team_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id, applicant_id, status)
);

-- Enable RLS
ALTER TABLE public.team_applications ENABLE ROW LEVEL SECURITY;

-- RLS policies for applications
CREATE POLICY "Anyone can view their own applications" ON public.team_applications
  FOR SELECT USING (
    applicant_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Team leaders and officers can view applications" ON public.team_applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN profiles p ON p.id = tm.profile_id
      WHERE p.user_id = auth.uid()
        AND tm.team_id = team_applications.team_id
        AND tm.role IN ('leader', 'officer')
    )
  );

CREATE POLICY "Users can apply to teams" ON public.team_applications
  FOR INSERT WITH CHECK (
    applicant_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    AND NOT EXISTS (
      SELECT 1 FROM team_members tm
      JOIN profiles p ON p.id = tm.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Leaders and officers can update applications" ON public.team_applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN profiles p ON p.id = tm.profile_id
      WHERE p.user_id = auth.uid()
        AND tm.team_id = team_applications.team_id
        AND tm.role IN ('leader', 'officer')
    )
  );

-- 3. Weekly contribution rewards table
CREATE TABLE public.team_weekly_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  weekly_xp INTEGER NOT NULL DEFAULT 0,
  weekly_wins INTEGER NOT NULL DEFAULT 0,
  reward_coins INTEGER NOT NULL DEFAULT 0,
  reward_xp INTEGER NOT NULL DEFAULT 0,
  claimed BOOLEAN NOT NULL DEFAULT false,
  claimed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id, profile_id, week_start)
);

-- Enable RLS
ALTER TABLE public.team_weekly_rewards ENABLE ROW LEVEL SECURITY;

-- RLS policies for weekly rewards
CREATE POLICY "Users can view their own rewards" ON public.team_weekly_rewards
  FOR SELECT USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can claim their own rewards" ON public.team_weekly_rewards
  FOR UPDATE USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Leaders can view all team rewards
CREATE POLICY "Leaders can view team rewards" ON public.team_weekly_rewards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN profiles p ON p.id = tm.profile_id
      WHERE p.user_id = auth.uid()
        AND tm.team_id = team_weekly_rewards.team_id
        AND tm.role IN ('leader', 'officer')
    )
  );

-- Add indexes
CREATE INDEX idx_team_announcements_team_id ON public.team_announcements(team_id);
CREATE INDEX idx_team_applications_team_id ON public.team_applications(team_id);
CREATE INDEX idx_team_applications_applicant_id ON public.team_applications(applicant_id);
CREATE INDEX idx_team_weekly_rewards_team_profile ON public.team_weekly_rewards(team_id, profile_id);
CREATE INDEX idx_team_weekly_rewards_week ON public.team_weekly_rewards(week_start);

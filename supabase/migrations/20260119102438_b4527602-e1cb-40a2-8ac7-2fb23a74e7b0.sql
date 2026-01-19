-- Fix RLS policy for team_members to use profile lookup
DROP POLICY IF EXISTS "Users can join teams" ON team_members;
CREATE POLICY "Users can join teams" ON team_members
  FOR INSERT WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Also fix the leave policy
DROP POLICY IF EXISTS "Users can leave teams" ON team_members;
CREATE POLICY "Users can leave teams" ON team_members
  FOR DELETE USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Fix leaders can manage members
DROP POLICY IF EXISTS "Leaders can manage members" ON team_members;
CREATE POLICY "Leaders can manage members" ON team_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM teams 
      WHERE teams.id = team_members.team_id 
      AND teams.leader_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

-- Create "First Team" exclusive name card for rank #1 team
INSERT INTO name_cards (name, description, background_gradient, rarity, category, icon)
VALUES (
  '冠军战队',
  '赛季战队排名第一专属名片',
  'linear-gradient(135deg, #FFD700 0%, #FFA500 25%, #FF8C00 50%, #FFD700 75%, #FFA500 100%)',
  'legendary',
  'team',
  'Crown'
)
ON CONFLICT DO NOTHING;

-- Create team battle related tables
CREATE TABLE IF NOT EXISTS team_battles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  season_id UUID NOT NULL REFERENCES seasons(id),
  team1_id UUID NOT NULL REFERENCES teams(id),
  team2_id UUID NOT NULL REFERENCES teams(id),
  team1_score INTEGER DEFAULT 0,
  team2_score INTEGER DEFAULT 0,
  team1_wins INTEGER DEFAULT 0,
  team2_wins INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed
  winner_team_id UUID REFERENCES teams(id),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create team battle participants table (tracks individual contributions)
CREATE TABLE IF NOT EXISTS team_battle_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_battle_id UUID NOT NULL REFERENCES team_battles(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id),
  team_id UUID NOT NULL REFERENCES teams(id),
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE team_battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_battle_participants ENABLE ROW LEVEL SECURITY;

-- RLS policies for team_battles
CREATE POLICY "Anyone can view team battles" ON team_battles
  FOR SELECT USING (true);

CREATE POLICY "Team leaders can create battles" ON team_battles
  FOR INSERT WITH CHECK (
    team1_id IN (
      SELECT id FROM teams WHERE leader_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Involved teams can update battles" ON team_battles
  FOR UPDATE USING (
    team1_id IN (SELECT team_id FROM team_members WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
    OR team2_id IN (SELECT team_id FROM team_members WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
  );

-- RLS policies for team_battle_participants
CREATE POLICY "Anyone can view battle participants" ON team_battle_participants
  FOR SELECT USING (true);

CREATE POLICY "Users can join their team battles" ON team_battle_participants
  FOR INSERT WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    AND team_id IN (SELECT team_id FROM team_members WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can update own participation" ON team_battle_participants
  FOR UPDATE USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_team_battles_status ON team_battles(status);
CREATE INDEX IF NOT EXISTS idx_team_battles_season ON team_battles(season_id);
CREATE INDEX IF NOT EXISTS idx_team_battle_participants_battle ON team_battle_participants(team_battle_id);
CREATE INDEX IF NOT EXISTS idx_team_battle_participants_profile ON team_battle_participants(profile_id);
-- Fix the permissive RLS policy for team_season_stats
DROP POLICY IF EXISTS "System can manage team season stats" ON public.team_season_stats;

-- Only allow inserts and updates through authenticated users who are team members
CREATE POLICY "Team members can insert season stats" ON public.team_season_stats 
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.team_members WHERE team_id = team_season_stats.team_id AND profile_id = auth.uid())
);

CREATE POLICY "Team members can update season stats" ON public.team_season_stats 
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.team_members WHERE team_id = team_season_stats.team_id AND profile_id = auth.uid())
);
-- Drop old restrictive UPDATE policy
DROP POLICY IF EXISTS "Participants can update matches" ON public.ranked_matches;

-- Create new policy that allows:
-- 1. Participants to update their own matches
-- 2. Any authenticated user to join a waiting match (become player2)
CREATE POLICY "Users can update or join matches"
ON public.ranked_matches
FOR UPDATE
USING (
  -- Allow if user is already a participant
  (player1_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()))
  OR 
  (player2_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()))
  OR
  -- Allow if match is waiting and user is authenticated (to join as player2)
  (status = 'waiting' AND auth.uid() IS NOT NULL)
)
WITH CHECK (
  -- After update, user must be a participant
  (player1_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()))
  OR 
  (player2_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()))
);
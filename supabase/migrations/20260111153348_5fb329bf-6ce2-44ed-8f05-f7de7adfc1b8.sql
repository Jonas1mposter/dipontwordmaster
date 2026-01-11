-- First, clean up any duplicate waiting entries
DELETE FROM match_queue 
WHERE id NOT IN (
  SELECT DISTINCT ON (profile_id, match_type) id
  FROM match_queue
  WHERE status = 'waiting'
  ORDER BY profile_id, match_type, created_at DESC
)
AND status = 'waiting';

-- Add unique constraint for active queue entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_match_queue_active_entry 
ON match_queue (profile_id, match_type) 
WHERE status = 'waiting';

-- Update the find_match_in_queue function to handle the constraint properly
CREATE OR REPLACE FUNCTION public.find_match_in_queue(
  p_profile_id uuid, 
  p_grade integer, 
  p_match_type text, 
  p_elo_rating integer
)
RETURNS TABLE(matched_profile_id uuid, matched_queue_id uuid, new_match_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_opponent_queue_id uuid;
  v_opponent_profile_id uuid;
  v_new_match_id uuid;
  v_my_queue_id uuid;
BEGIN
  -- Cancel any existing waiting entries for this player first
  UPDATE match_queue 
  SET status = 'cancelled'
  WHERE profile_id = p_profile_id 
    AND match_type = p_match_type 
    AND status = 'waiting';

  -- Insert new queue entry
  INSERT INTO match_queue (profile_id, grade, match_type, elo_rating, status)
  VALUES (p_profile_id, p_grade, p_match_type, p_elo_rating, 'waiting')
  RETURNING id INTO v_my_queue_id;

  -- Lock and find an opponent (FIFO, same grade, closest ELO)
  SELECT mq.id, mq.profile_id
  INTO v_opponent_queue_id, v_opponent_profile_id
  FROM match_queue mq
  WHERE mq.status = 'waiting'
    AND mq.grade = p_grade
    AND mq.match_type = p_match_type
    AND mq.profile_id != p_profile_id
  ORDER BY ABS(mq.elo_rating - p_elo_rating), mq.created_at
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- If no opponent found, return empty (player stays in queue)
  IF v_opponent_profile_id IS NULL THEN
    RETURN;
  END IF;

  -- Create the match - opponent is player1 (they were waiting first)
  INSERT INTO ranked_matches (
    grade, 
    player1_id, 
    player2_id, 
    status,
    player1_elo,
    player2_elo
  )
  VALUES (
    p_grade,
    v_opponent_profile_id,
    p_profile_id,
    'in_progress',
    (SELECT CASE WHEN p_match_type = 'ranked' THEN elo_rating ELSE elo_free END FROM profiles WHERE id = v_opponent_profile_id),
    p_elo_rating
  )
  RETURNING id INTO v_new_match_id;

  -- Update OPPONENT's queue entry as matched
  UPDATE match_queue 
  SET status = 'matched', 
      matched_at = now(), 
      matched_with = p_profile_id,
      match_id = v_new_match_id
  WHERE id = v_opponent_queue_id;

  -- Update MY queue entry as matched  
  UPDATE match_queue 
  SET status = 'matched', 
      matched_at = now(), 
      matched_with = v_opponent_profile_id,
      match_id = v_new_match_id
  WHERE id = v_my_queue_id;

  -- Return the match info
  RETURN QUERY SELECT v_opponent_profile_id, v_opponent_queue_id, v_new_match_id;
END;
$function$;
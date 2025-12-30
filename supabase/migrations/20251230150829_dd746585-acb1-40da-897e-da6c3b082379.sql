-- Create a function to check if a player is already in an active match
CREATE OR REPLACE FUNCTION public.check_single_active_match()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_match_id uuid;
  player_to_check uuid;
BEGIN
  -- For INSERT, check player1_id
  IF TG_OP = 'INSERT' THEN
    player_to_check := NEW.player1_id;
    
    -- Check if player1 is already in an active match
    SELECT id INTO existing_match_id
    FROM ranked_matches
    WHERE (player1_id = player_to_check OR player2_id = player_to_check)
      AND status IN ('waiting', 'in_progress', 'playing')
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    LIMIT 1;
    
    IF existing_match_id IS NOT NULL THEN
      RAISE EXCEPTION 'Player is already in an active match: %', existing_match_id;
    END IF;
  END IF;
  
  -- For UPDATE (when player2 joins), check player2_id
  IF TG_OP = 'UPDATE' AND NEW.player2_id IS NOT NULL AND OLD.player2_id IS NULL THEN
    player_to_check := NEW.player2_id;
    
    -- Check if player2 is already in an active match
    SELECT id INTO existing_match_id
    FROM ranked_matches
    WHERE (player1_id = player_to_check OR player2_id = player_to_check)
      AND status IN ('waiting', 'in_progress', 'playing')
      AND id != NEW.id
    LIMIT 1;
    
    IF existing_match_id IS NOT NULL THEN
      RAISE EXCEPTION 'Player is already in an active match: %', existing_match_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to enforce single active match per player
DROP TRIGGER IF EXISTS enforce_single_active_match ON ranked_matches;
CREATE TRIGGER enforce_single_active_match
  BEFORE INSERT OR UPDATE ON ranked_matches
  FOR EACH ROW
  EXECUTE FUNCTION public.check_single_active_match();

-- Add index to improve performance of the constraint check
CREATE INDEX IF NOT EXISTS idx_ranked_matches_active_players 
  ON ranked_matches (player1_id, player2_id) 
  WHERE status IN ('waiting', 'in_progress', 'playing');
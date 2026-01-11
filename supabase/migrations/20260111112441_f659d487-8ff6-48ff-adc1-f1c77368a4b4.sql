-- Create trigger to enforce single active match constraint
-- This ensures a player cannot be in multiple active matches at the database level

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS enforce_single_active_match ON ranked_matches;

-- Create the trigger
CREATE TRIGGER enforce_single_active_match
  BEFORE INSERT OR UPDATE ON ranked_matches
  FOR EACH ROW
  EXECUTE FUNCTION check_single_active_match();

-- Also add a partial unique index as an additional safety measure
-- This prevents the same player from being player1 in multiple waiting matches
DROP INDEX IF EXISTS idx_unique_player1_waiting;
CREATE UNIQUE INDEX idx_unique_player1_waiting 
  ON ranked_matches (player1_id) 
  WHERE status = 'waiting';

-- Add index to speed up the active match lookup
DROP INDEX IF EXISTS idx_active_matches_players;
CREATE INDEX idx_active_matches_players 
  ON ranked_matches (player1_id, player2_id) 
  WHERE status IN ('waiting', 'in_progress', 'playing');
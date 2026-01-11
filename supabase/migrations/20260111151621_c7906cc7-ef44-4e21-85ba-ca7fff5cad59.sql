
-- Create match queue table for server-side matchmaking
CREATE TABLE public.match_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL,
  grade integer NOT NULL,
  match_type text NOT NULL DEFAULT 'ranked', -- 'ranked' or 'free'
  elo_rating integer NOT NULL DEFAULT 1000,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  matched_at timestamp with time zone,
  matched_with uuid,
  match_id uuid,
  status text NOT NULL DEFAULT 'waiting', -- 'waiting', 'matched', 'cancelled', 'expired'
  CONSTRAINT unique_active_queue_entry UNIQUE (profile_id, match_type, status)
);

-- Enable RLS
ALTER TABLE public.match_queue ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own queue entries"
ON public.match_queue
FOR SELECT
USING (profile_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()));

CREATE POLICY "Users can insert their own queue entries"
ON public.match_queue
FOR INSERT
WITH CHECK (profile_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()));

CREATE POLICY "Users can update their own queue entries"
ON public.match_queue
FOR UPDATE
USING (profile_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()));

CREATE POLICY "Users can view waiting queue entries for matching"
ON public.match_queue
FOR SELECT
USING (status = 'waiting');

-- Create function to find and match players
CREATE OR REPLACE FUNCTION public.find_match_in_queue(
  p_profile_id uuid,
  p_grade integer,
  p_match_type text,
  p_elo_rating integer
)
RETURNS TABLE(
  matched_profile_id uuid,
  matched_queue_id uuid,
  new_match_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_opponent_queue_id uuid;
  v_opponent_profile_id uuid;
  v_new_match_id uuid;
  v_my_queue_id uuid;
BEGIN
  -- First, insert or update my queue entry
  INSERT INTO match_queue (profile_id, grade, match_type, elo_rating, status)
  VALUES (p_profile_id, p_grade, p_match_type, p_elo_rating, 'waiting')
  ON CONFLICT (profile_id, match_type, status) 
  DO UPDATE SET 
    created_at = now(),
    elo_rating = p_elo_rating
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

  -- If no opponent found, return empty
  IF v_opponent_profile_id IS NULL THEN
    RETURN;
  END IF;

  -- Create the match
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

  -- Update both queue entries as matched
  UPDATE match_queue 
  SET status = 'matched', 
      matched_at = now(), 
      matched_with = p_profile_id,
      match_id = v_new_match_id
  WHERE id = v_opponent_queue_id;

  UPDATE match_queue 
  SET status = 'matched', 
      matched_at = now(), 
      matched_with = v_opponent_profile_id,
      match_id = v_new_match_id
  WHERE id = v_my_queue_id;

  -- Return the match info
  RETURN QUERY SELECT v_opponent_profile_id, v_opponent_queue_id, v_new_match_id;
END;
$$;

-- Create function to cancel queue entry
CREATE OR REPLACE FUNCTION public.cancel_queue_entry(p_profile_id uuid, p_match_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE match_queue 
  SET status = 'cancelled'
  WHERE profile_id = p_profile_id 
    AND match_type = p_match_type 
    AND status = 'waiting';
END;
$$;

-- Create function to check queue status
CREATE OR REPLACE FUNCTION public.check_queue_status(p_profile_id uuid, p_match_type text)
RETURNS TABLE(
  queue_status text,
  match_id uuid,
  matched_with uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT mq.status, mq.match_id, mq.matched_with
  FROM match_queue mq
  WHERE mq.profile_id = p_profile_id
    AND mq.match_type = p_match_type
    AND mq.status IN ('waiting', 'matched')
  ORDER BY mq.created_at DESC
  LIMIT 1;
END;
$$;

-- Enable realtime for match_queue
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_queue;

-- Create index for faster matching
CREATE INDEX idx_match_queue_waiting ON match_queue (grade, match_type, status, elo_rating, created_at) 
WHERE status = 'waiting';

-- Create cleanup function for expired entries (older than 10 minutes)
CREATE OR REPLACE FUNCTION public.cleanup_expired_queue_entries()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE match_queue 
  SET status = 'expired'
  WHERE status = 'waiting' 
    AND created_at < now() - interval '10 minutes';
END;
$$;

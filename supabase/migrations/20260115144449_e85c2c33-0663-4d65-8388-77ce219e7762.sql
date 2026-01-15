-- Fix check_queue_status to prioritize matched entries over waiting entries
CREATE OR REPLACE FUNCTION public.check_queue_status(p_profile_id uuid, p_match_type text)
 RETURNS TABLE(queue_status text, match_id uuid, matched_with uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT mq.status, mq.match_id, mq.matched_with
  FROM match_queue mq
  WHERE mq.profile_id = p_profile_id
    AND mq.match_type = p_match_type
    AND mq.status IN ('waiting', 'matched')
  ORDER BY 
    -- Prioritize matched status over waiting status
    CASE WHEN mq.status = 'matched' THEN 0 ELSE 1 END,
    mq.created_at DESC
  LIMIT 1;
END;
$function$;
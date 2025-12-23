-- Create function to award welcome badge when profile is created
CREATE OR REPLACE FUNCTION public.award_welcome_badge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  welcome_badge_id uuid;
BEGIN
  -- Get the Bonjour! badge id
  SELECT id INTO welcome_badge_id FROM badges WHERE name = 'Bonjour!' LIMIT 1;
  
  -- If badge exists, award it to the new user
  IF welcome_badge_id IS NOT NULL THEN
    INSERT INTO user_badges (profile_id, badge_id)
    VALUES (NEW.id, welcome_badge_id)
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to award badge after profile is created
DROP TRIGGER IF EXISTS on_profile_created_award_badge ON profiles;
CREATE TRIGGER on_profile_created_award_badge
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.award_welcome_badge();
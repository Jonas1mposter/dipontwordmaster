-- Drop the old constraint and add a new one that allows grade 0 (free server)
ALTER TABLE public.ranked_matches DROP CONSTRAINT IF EXISTS ranked_matches_grade_check;
ALTER TABLE public.ranked_matches ADD CONSTRAINT ranked_matches_grade_check CHECK (grade >= 0 AND grade <= 12);
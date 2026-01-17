-- Create science_words table for IGCSE science vocabulary
CREATE TABLE public.science_words (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  word TEXT NOT NULL,
  meaning TEXT NOT NULL,
  definition TEXT,
  phonetic TEXT,
  subject TEXT NOT NULL DEFAULT 'Biology', -- Biology, Chemistry, Physics
  topic TEXT, -- optional topic grouping
  tier INTEGER DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_science_words_subject ON public.science_words(subject);

-- Enable Row Level Security
ALTER TABLE public.science_words ENABLE ROW LEVEL SECURITY;

-- Create policy for anyone to read science words
CREATE POLICY "Anyone can read science words" 
ON public.science_words 
FOR SELECT 
USING (true);

-- Create science_learning_progress table for tracking user progress
CREATE TABLE public.science_learning_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES public.science_words(id) ON DELETE CASCADE,
  mastery_level INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  incorrect_count INTEGER DEFAULT 0,
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(profile_id, word_id)
);

-- Enable Row Level Security
ALTER TABLE public.science_learning_progress ENABLE ROW LEVEL SECURITY;

-- Create policies for science_learning_progress
CREATE POLICY "Users can view their own science progress" 
ON public.science_learning_progress 
FOR SELECT 
USING (auth.uid() IN (SELECT user_id FROM profiles WHERE id = profile_id));

CREATE POLICY "Users can insert their own science progress" 
ON public.science_learning_progress 
FOR INSERT 
WITH CHECK (auth.uid() IN (SELECT user_id FROM profiles WHERE id = profile_id));

CREATE POLICY "Users can update their own science progress" 
ON public.science_learning_progress 
FOR UPDATE 
USING (auth.uid() IN (SELECT user_id FROM profiles WHERE id = profile_id));
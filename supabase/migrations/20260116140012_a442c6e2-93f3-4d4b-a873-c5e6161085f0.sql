-- Create a separate table for 0580 Math vocabulary
CREATE TABLE public.math_words (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  word TEXT NOT NULL,
  meaning TEXT NOT NULL,
  phonetic TEXT,
  definition TEXT,
  topic INTEGER NOT NULL,
  topic_name TEXT NOT NULL,
  tier INTEGER DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.math_words ENABLE ROW LEVEL SECURITY;

-- Create policy for everyone to read
CREATE POLICY "Anyone can read math words" 
ON public.math_words 
FOR SELECT 
USING (true);

-- Create learning progress table for math words
CREATE TABLE public.math_learning_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES public.math_words(id) ON DELETE CASCADE,
  mastery_level INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  incorrect_count INTEGER DEFAULT 0,
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(profile_id, word_id)
);

-- Enable RLS
ALTER TABLE public.math_learning_progress ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own math progress" 
ON public.math_learning_progress 
FOR SELECT 
USING (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = profile_id));

CREATE POLICY "Users can insert their own math progress" 
ON public.math_learning_progress 
FOR INSERT 
WITH CHECK (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = profile_id));

CREATE POLICY "Users can update their own math progress" 
ON public.math_learning_progress 
FOR UPDATE 
USING (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = profile_id));
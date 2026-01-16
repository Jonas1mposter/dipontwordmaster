-- Add column to track last energy restore date
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_energy_restore DATE DEFAULT CURRENT_DATE;

-- Update existing profiles to have today's date
UPDATE public.profiles SET last_energy_restore = CURRENT_DATE WHERE last_energy_restore IS NULL;
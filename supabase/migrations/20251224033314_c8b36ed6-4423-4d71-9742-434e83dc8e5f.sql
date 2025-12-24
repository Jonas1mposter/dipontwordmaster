-- Add class column to profiles table
ALTER TABLE public.profiles ADD COLUMN class TEXT DEFAULT NULL;

-- Update RLS policy to allow users to update their own class
-- (existing policy already covers this since users can update their own profile)
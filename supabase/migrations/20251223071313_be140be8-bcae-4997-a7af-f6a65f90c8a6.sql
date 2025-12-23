-- Create storage bucket for profile backgrounds
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-backgrounds', 'profile-backgrounds', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for profile backgrounds
CREATE POLICY "Anyone can view profile backgrounds"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-backgrounds');

CREATE POLICY "Users can upload their own background"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'profile-backgrounds' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own background"
ON storage.objects FOR UPDATE
USING (bucket_id = 'profile-backgrounds' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own background"
ON storage.objects FOR DELETE
USING (bucket_id = 'profile-backgrounds' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add background preference columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS background_type text DEFAULT 'gradient',
ADD COLUMN IF NOT EXISTS background_value text DEFAULT 'default';
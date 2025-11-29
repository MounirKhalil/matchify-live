-- Add profile_image_url column to candidate_profiles
ALTER TABLE public.candidate_profiles 
ADD COLUMN profile_image_url text;

-- Create profile_images storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile_images',
  'profile_images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- RLS Policy: Anyone can view profile images (public bucket)
CREATE POLICY "Profile images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile_images');

-- RLS Policy: Users can upload their own profile image
CREATE POLICY "Users can upload their own profile image"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile_images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS Policy: Users can update their own profile image
CREATE POLICY "Users can update their own profile image"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile_images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS Policy: Users can delete their own profile image
CREATE POLICY "Users can delete their own profile image"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile_images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
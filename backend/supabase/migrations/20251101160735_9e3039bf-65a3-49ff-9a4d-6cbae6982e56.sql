-- Add bookmarked_by column to candidate_profiles table
ALTER TABLE public.candidate_profiles 
ADD COLUMN IF NOT EXISTS bookmarked_by uuid[] DEFAULT '{}';

-- Create an index for faster lookups of bookmarked candidates
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_bookmarked_by 
ON public.candidate_profiles USING GIN (bookmarked_by);

-- Add a policy to allow recruiters to update bookmarked_by
CREATE POLICY "Recruiters can update bookmarks" 
ON public.candidate_profiles 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM recruiter_profiles 
  WHERE recruiter_profiles.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM recruiter_profiles 
  WHERE recruiter_profiles.user_id = auth.uid()
));
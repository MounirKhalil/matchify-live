-- Add other_sections field to candidate_profiles table
ALTER TABLE public.candidate_profiles
ADD COLUMN other_sections jsonb DEFAULT '[]'::jsonb;
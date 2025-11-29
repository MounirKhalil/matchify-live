-- Add social links columns to candidate_profiles table
ALTER TABLE candidate_profiles
ADD COLUMN github_url text,
ADD COLUMN huggingface_url text,
ADD COLUMN linkedin_url text;
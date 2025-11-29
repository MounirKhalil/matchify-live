-- Add preferred_categories column to candidate_profiles table
ALTER TABLE candidate_profiles 
ADD COLUMN preferred_categories text[] DEFAULT '{}';
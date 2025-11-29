-- Add autofill_from_cv column to candidate_profiles
ALTER TABLE candidate_profiles 
ADD COLUMN autofill_from_cv boolean DEFAULT true;
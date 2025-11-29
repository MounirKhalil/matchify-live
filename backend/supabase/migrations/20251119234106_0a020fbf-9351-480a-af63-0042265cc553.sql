-- Make country and date_of_birth nullable in candidate_profiles
-- This allows users to sign up and complete their profile later

ALTER TABLE public.candidate_profiles 
ALTER COLUMN country DROP NOT NULL,
ALTER COLUMN date_of_birth DROP NOT NULL;
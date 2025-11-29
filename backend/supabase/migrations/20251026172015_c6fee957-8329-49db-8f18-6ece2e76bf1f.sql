-- Add preferred_job_types column to candidate_profiles
ALTER TABLE public.candidate_profiles 
ADD COLUMN preferred_job_types TEXT[] DEFAULT '{}';

-- Add education column to candidate_profiles (stores array of education entries)
ALTER TABLE public.candidate_profiles 
ADD COLUMN education JSONB DEFAULT '[]'::jsonb;

-- Add work_experience column to candidate_profiles (stores array of work experience entries)
ALTER TABLE public.candidate_profiles 
ADD COLUMN work_experience JSONB DEFAULT '[]'::jsonb;

-- Add certificates column to candidate_profiles (stores array of certificate entries)
ALTER TABLE public.candidate_profiles 
ADD COLUMN certificates JSONB DEFAULT '[]'::jsonb;

-- Add papers column to candidate_profiles (stores array of papers/publications)
ALTER TABLE public.candidate_profiles 
ADD COLUMN papers JSONB DEFAULT '[]'::jsonb;
-- Drop the unique constraint temporarily to allow inserting data
ALTER TABLE public.applications 
DROP CONSTRAINT IF EXISTS applications_candidate_id_job_posting_id_key;
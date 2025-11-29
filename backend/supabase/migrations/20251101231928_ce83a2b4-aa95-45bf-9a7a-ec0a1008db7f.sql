-- Add public_information column for job description
ALTER TABLE public.job_postings
ADD COLUMN public_information TEXT;

-- Add public_job_description_file toggle column
ALTER TABLE public.job_postings
ADD COLUMN public_job_description_file BOOLEAN DEFAULT false;
-- Create enum for hiring status
CREATE TYPE public.hiring_status AS ENUM ('accepted', 'rejected', 'potential_fit');

-- Create applications table
CREATE TABLE public.applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  job_posting_id UUID NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  education_score NUMERIC(5,2),
  experience_score NUMERIC(5,2),
  skills_score NUMERIC(5,2),
  final_score NUMERIC(5,2),
  hiring_status public.hiring_status NOT NULL DEFAULT 'potential_fit',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(candidate_id, job_posting_id)
);

-- Enable RLS
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for applications
-- Candidates can view their own applications
CREATE POLICY "Candidates can view their own applications"
ON public.applications
FOR SELECT
USING (
  candidate_id IN (
    SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
  )
);

-- Recruiters can view applications for their job postings
CREATE POLICY "Recruiters can view applications for their job postings"
ON public.applications
FOR SELECT
USING (
  job_posting_id IN (
    SELECT id FROM public.job_postings 
    WHERE recruiter_id IN (
      SELECT id FROM public.recruiter_profiles WHERE user_id = auth.uid()
    )
  )
);

-- Recruiters can create applications for their job postings
CREATE POLICY "Recruiters can create applications for their job postings"
ON public.applications
FOR INSERT
WITH CHECK (
  job_posting_id IN (
    SELECT id FROM public.job_postings 
    WHERE recruiter_id IN (
      SELECT id FROM public.recruiter_profiles WHERE user_id = auth.uid()
    )
  )
);

-- Recruiters can update applications for their job postings
CREATE POLICY "Recruiters can update applications for their job postings"
ON public.applications
FOR UPDATE
USING (
  job_posting_id IN (
    SELECT id FROM public.job_postings 
    WHERE recruiter_id IN (
      SELECT id FROM public.recruiter_profiles WHERE user_id = auth.uid()
    )
  )
);

-- Recruiters can delete applications for their job postings
CREATE POLICY "Recruiters can delete applications for their job postings"
ON public.applications
FOR DELETE
USING (
  job_posting_id IN (
    SELECT id FROM public.job_postings 
    WHERE recruiter_id IN (
      SELECT id FROM public.recruiter_profiles WHERE user_id = auth.uid()
    )
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_applications_updated_at
BEFORE UPDATE ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Update existing NULL values in candidate_profiles before making columns NOT NULL
UPDATE public.candidate_profiles
SET country = 'Not specified'
WHERE country IS NULL;

UPDATE public.candidate_profiles
SET date_of_birth = '2000-01-01'
WHERE date_of_birth IS NULL;

-- Make country and date_of_birth mandatory in candidate_profiles
ALTER TABLE public.candidate_profiles
ALTER COLUMN country SET NOT NULL,
ALTER COLUMN date_of_birth SET NOT NULL;
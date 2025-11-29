-- Create enum for job status
CREATE TYPE public.job_status AS ENUM ('open', 'closed');

-- Create enum for requirement priority
CREATE TYPE public.requirement_priority AS ENUM ('must_have', 'nice_to_have', 'preferable');

-- Create job_postings table
CREATE TABLE public.job_postings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_title TEXT NOT NULL,
  requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  description_url TEXT,
  status public.job_status NOT NULL DEFAULT 'open',
  recruiter_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_recruiter FOREIGN KEY (recruiter_id) REFERENCES public.recruiter_profiles(id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;

-- Create policies for job_postings
CREATE POLICY "Recruiters can view their own job postings"
ON public.job_postings
FOR SELECT
USING (recruiter_id IN (SELECT id FROM public.recruiter_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Recruiters can create their own job postings"
ON public.job_postings
FOR INSERT
WITH CHECK (recruiter_id IN (SELECT id FROM public.recruiter_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Recruiters can update their own job postings"
ON public.job_postings
FOR UPDATE
USING (recruiter_id IN (SELECT id FROM public.recruiter_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Recruiters can delete their own job postings"
ON public.job_postings
FOR DELETE
USING (recruiter_id IN (SELECT id FROM public.recruiter_profiles WHERE user_id = auth.uid()));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_job_postings_updated_at
BEFORE UPDATE ON public.job_postings
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create index for faster queries
CREATE INDEX idx_job_postings_recruiter_id ON public.job_postings(recruiter_id);
CREATE INDEX idx_job_postings_status ON public.job_postings(status);
CREATE INDEX idx_job_postings_created_at ON public.job_postings(created_at DESC);

-- Create storage policies for job postings bucket
CREATE POLICY "Recruiters can upload job descriptions"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'jobpostings' 
  AND auth.uid() IN (SELECT user_id FROM public.recruiter_profiles)
);

CREATE POLICY "Recruiters can view their own job descriptions"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'jobpostings'
  AND auth.uid() IN (SELECT user_id FROM public.recruiter_profiles)
);

CREATE POLICY "Recruiters can update their own job descriptions"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'jobpostings'
  AND auth.uid() IN (SELECT user_id FROM public.recruiter_profiles)
);

CREATE POLICY "Recruiters can delete their own job descriptions"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'jobpostings'
  AND auth.uid() IN (SELECT user_id FROM public.recruiter_profiles)
);
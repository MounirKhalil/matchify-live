-- Create job_posting_embeddings table
CREATE TABLE IF NOT EXISTS public.job_posting_embeddings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_posting_id UUID NOT NULL UNIQUE REFERENCES public.job_postings(id) ON DELETE CASCADE,
  embeddings vector(1536) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create candidate_preferences table
CREATE TABLE IF NOT EXISTS public.candidate_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL UNIQUE REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  auto_apply_enabled BOOLEAN NOT NULL DEFAULT false,
  min_match_threshold NUMERIC NOT NULL DEFAULT 70,
  max_applications_per_day INTEGER NOT NULL DEFAULT 5,
  preferred_job_titles TEXT[] DEFAULT '{}',
  excluded_companies TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create candidate_job_matches table
CREATE TABLE IF NOT EXISTS public.candidate_job_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  job_posting_id UUID NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  match_score NUMERIC NOT NULL,
  match_reasons TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(candidate_id, job_posting_id)
);

-- Create auto_application_runs table
CREATE TABLE IF NOT EXISTS public.auto_application_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  total_candidates_evaluated INTEGER DEFAULT 0,
  total_matches_found INTEGER DEFAULT 0,
  total_applications_submitted INTEGER DEFAULT 0,
  total_applications_skipped INTEGER DEFAULT 0,
  error_message TEXT
);

-- Add columns to applications table for auto-apply tracking
ALTER TABLE public.applications 
ADD COLUMN IF NOT EXISTS auto_applied BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS match_score NUMERIC,
ADD COLUMN IF NOT EXISTS match_reasons TEXT[] DEFAULT '{}';

-- Enable RLS on new tables
ALTER TABLE public.job_posting_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_job_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_application_runs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job_posting_embeddings
CREATE POLICY "Recruiters can view embeddings for their jobs"
ON public.job_posting_embeddings FOR SELECT
USING (
  job_posting_id IN (
    SELECT id FROM public.job_postings 
    WHERE recruiter_id IN (
      SELECT id FROM public.recruiter_profiles WHERE user_id = auth.uid()
    )
  )
);

-- RLS Policies for candidate_preferences
CREATE POLICY "Users can manage their own preferences"
ON public.candidate_preferences FOR ALL
USING (
  candidate_id IN (
    SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
  )
);

-- RLS Policies for candidate_job_matches
CREATE POLICY "Candidates can view their own matches"
ON public.candidate_job_matches FOR SELECT
USING (
  candidate_id IN (
    SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Recruiters can view matches for their jobs"
ON public.candidate_job_matches FOR SELECT
USING (
  job_posting_id IN (
    SELECT id FROM public.job_postings 
    WHERE recruiter_id IN (
      SELECT id FROM public.recruiter_profiles WHERE user_id = auth.uid()
    )
  )
);

-- RLS Policies for auto_application_runs (admin only - no policies for now)

-- Create function to search jobs by embedding
CREATE OR REPLACE FUNCTION public.search_jobs_by_embedding(
  query_embedding vector(1536),
  similarity_threshold DOUBLE PRECISION DEFAULT 0.7,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE(
  job_posting_id UUID,
  similarity DOUBLE PRECISION,
  metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    jpe.job_posting_id,
    1 - (jpe.embeddings <=> query_embedding) AS similarity,
    jpe.metadata
  FROM public.job_posting_embeddings jpe
  INNER JOIN public.job_postings jp ON jp.id = jpe.job_posting_id
  WHERE jp.status = 'open'
    AND 1 - (jpe.embeddings <=> query_embedding) > similarity_threshold
  ORDER BY jpe.embeddings <=> query_embedding
  LIMIT limit_count;
END;
$$;

-- Create trigger to update updated_at on job_posting_embeddings
CREATE TRIGGER update_job_posting_embeddings_updated_at
BEFORE UPDATE ON public.job_posting_embeddings
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create trigger to update updated_at on candidate_preferences
CREATE TRIGGER update_candidate_preferences_updated_at
BEFORE UPDATE ON public.candidate_preferences
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create index on embeddings for faster similarity search
CREATE INDEX IF NOT EXISTS idx_job_posting_embeddings_vector 
ON public.job_posting_embeddings 
USING ivfflat (embeddings vector_cosine_ops)
WITH (lists = 100);
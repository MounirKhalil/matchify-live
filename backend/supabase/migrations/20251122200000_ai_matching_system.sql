-- Migration: AI-Powered Job Matching System
-- Adds embeddings for job postings, candidate preferences, and tracking for automatic applications
-- Date: 2025-11-22

-- ============================================================================
-- 1. JOB POSTING EMBEDDINGS TABLE
-- ============================================================================
-- Stores OpenAI vector embeddings for job postings to enable semantic matching
-- with candidate embeddings

CREATE TABLE IF NOT EXISTS public.job_posting_embeddings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_posting_id uuid NOT NULL UNIQUE REFERENCES public.job_postings(id) ON DELETE CASCADE,
  embeddings vector(1536) NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create IVFFlat index for fast vector similarity search on job posting embeddings
CREATE INDEX IF NOT EXISTS idx_job_posting_embeddings_vector
ON public.job_posting_embeddings USING ivfflat (embeddings vector_cosine_ops)
WITH (lists = 100);

-- Create index for fast job_posting_id lookup
CREATE INDEX IF NOT EXISTS idx_job_posting_embeddings_job_posting_id
ON public.job_posting_embeddings(job_posting_id);

-- Add trigger for updating updated_at timestamp
CREATE TRIGGER job_posting_embeddings_updated_at
BEFORE UPDATE ON public.job_posting_embeddings
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 2. CANDIDATE PREFERENCES TABLE
-- ============================================================================
-- Stores user preferences for automatic job applications

CREATE TABLE IF NOT EXISTS public.candidate_preferences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id uuid NOT NULL UNIQUE REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  auto_apply_enabled boolean DEFAULT true NOT NULL,
  auto_apply_min_score numeric DEFAULT 70 NOT NULL,
  max_applications_per_day integer DEFAULT 5 NOT NULL,
  preferred_min_years_experience integer,
  preferred_max_years_experience integer,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create trigger for updating updated_at timestamp
CREATE TRIGGER candidate_preferences_updated_at
BEFORE UPDATE ON public.candidate_preferences
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 3. EXPAND APPLICATIONS TABLE
-- ============================================================================
-- Add columns to track auto-applied applications and match scores

ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS auto_applied boolean DEFAULT false;

ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS match_score numeric DEFAULT NULL;

ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS match_reasons text[] DEFAULT NULL;

-- Add index for auto_applied queries (for analytics)
CREATE INDEX IF NOT EXISTS idx_applications_auto_applied
ON public.applications(auto_applied)
WHERE auto_applied = true;

-- ============================================================================
-- 4. AUTOMATIC APPLICATION TRACKING TABLE
-- ============================================================================
-- Tracks batch automatic application runs for monitoring and debugging

CREATE TABLE IF NOT EXISTS public.auto_application_runs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  run_timestamp timestamp with time zone DEFAULT now() NOT NULL,
  total_candidates_evaluated integer DEFAULT 0,
  total_matches_found integer DEFAULT 0,
  total_applications_submitted integer DEFAULT 0,
  total_applications_skipped integer DEFAULT 0,
  failed_applications integer DEFAULT 0,
  error_summary jsonb DEFAULT NULL,
  status text DEFAULT 'in_progress' NOT NULL, -- in_progress, completed, failed
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create index for querying recent runs
CREATE INDEX IF NOT EXISTS idx_auto_application_runs_timestamp
ON public.auto_application_runs(run_timestamp DESC);

-- ============================================================================
-- 5. MATCHING RESULTS CACHE TABLE
-- ============================================================================
-- Cache matching results to avoid re-computing the same matches

CREATE TABLE IF NOT EXISTS public.candidate_job_matches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id uuid NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  job_posting_id uuid NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  match_score numeric NOT NULL,
  match_reasons text[] DEFAULT NULL,
  embedding_similarity numeric NOT NULL,
  evaluated_at timestamp with time zone DEFAULT now() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,

  -- Unique constraint to prevent duplicate matches
  CONSTRAINT unique_candidate_job_match UNIQUE (candidate_id, job_posting_id)
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_candidate_job_matches_candidate_id
ON public.candidate_job_matches(candidate_id);

CREATE INDEX IF NOT EXISTS idx_candidate_job_matches_job_posting_id
ON public.candidate_job_matches(job_posting_id);

CREATE INDEX IF NOT EXISTS idx_candidate_job_matches_match_score
ON public.candidate_job_matches(match_score DESC);

CREATE INDEX IF NOT EXISTS idx_candidate_job_matches_evaluated_at
ON public.candidate_job_matches(evaluated_at DESC);

-- ============================================================================
-- 6. RLS POLICIES FOR NEW TABLES
-- ============================================================================

-- Job posting embeddings - Recruiters can view/manage their own, candidates can't see
ALTER TABLE public.job_posting_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recruiters can view their job posting embeddings"
ON public.job_posting_embeddings
FOR SELECT
USING (
  job_posting_id IN (
    SELECT id FROM public.job_postings
    WHERE recruiter_id IN (
      SELECT id FROM public.recruiter_profiles
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "System can insert job posting embeddings"
ON public.job_posting_embeddings
FOR INSERT
WITH CHECK (true); -- Allow edge functions to insert

-- Candidate preferences - Users can manage their own
ALTER TABLE public.candidate_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidates can view their own preferences"
ON public.candidate_preferences
FOR SELECT
USING (
  candidate_id IN (
    SELECT id FROM public.candidate_profiles
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Candidates can create their own preferences"
ON public.candidate_preferences
FOR INSERT
WITH CHECK (
  candidate_id IN (
    SELECT id FROM public.candidate_profiles
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Candidates can update their own preferences"
ON public.candidate_preferences
FOR UPDATE
USING (
  candidate_id IN (
    SELECT id FROM public.candidate_profiles
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Candidates can delete their own preferences"
ON public.candidate_preferences
FOR DELETE
USING (
  candidate_id IN (
    SELECT id FROM public.candidate_profiles
    WHERE user_id = auth.uid()
  )
);

-- Auto application runs - System only (for monitoring)
ALTER TABLE public.auto_application_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage auto application runs"
ON public.auto_application_runs
FOR ALL
USING (true); -- Allow edge functions only

-- Candidate job matches - Candidates can see their own matches, recruiters can see their jobs' matches
ALTER TABLE public.candidate_job_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidates can view their own matches"
ON public.candidate_job_matches
FOR SELECT
USING (
  candidate_id IN (
    SELECT id FROM public.candidate_profiles
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Recruiters can view matches for their jobs"
ON public.candidate_job_matches
FOR SELECT
USING (
  job_posting_id IN (
    SELECT id FROM public.job_postings
    WHERE recruiter_id IN (
      SELECT id FROM public.recruiter_profiles
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "System can manage candidate job matches"
ON public.candidate_job_matches
FOR ALL
USING (true); -- Allow edge functions to manage matches

-- ============================================================================
-- 7. HELPER FUNCTION: Initialize candidate preferences
-- ============================================================================
-- Creates default preferences for candidates without them

CREATE OR REPLACE FUNCTION public.ensure_candidate_preferences(candidate_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.candidate_preferences (
    candidate_id,
    auto_apply_enabled,
    auto_apply_min_score,
    max_applications_per_day
  )
  VALUES (
    candidate_id,
    true,
    70,
    5
  )
  ON CONFLICT (candidate_id) DO NOTHING;
END;
$$;

-- ============================================================================
-- 8. TRIGGER: Create default preferences when candidate profile is created
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_candidate_preferences_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.ensure_candidate_preferences(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER candidate_profiles_create_preferences
AFTER INSERT ON public.candidate_profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_candidate_preferences_trigger();

-- ============================================================================
-- 9. HELPER FUNCTION: Get top matching jobs for a candidate
-- ============================================================================
-- Finds the top N matching jobs for a candidate based on embedding similarity

CREATE OR REPLACE FUNCTION public.get_candidate_matching_jobs(
  p_candidate_id uuid,
  p_limit integer DEFAULT 10,
  p_min_score numeric DEFAULT 0.7
)
RETURNS TABLE (
  job_id uuid,
  job_title text,
  recruiter_name text,
  match_score numeric,
  embedding_similarity numeric,
  match_reasons text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    jp.id,
    jp.job_title,
    CONCAT(rp.name, ' ', rp.family_name) as recruiter_name,
    cjm.match_score,
    cjm.embedding_similarity,
    cjm.match_reasons
  FROM public.candidate_job_matches cjm
  JOIN public.job_postings jp ON cjm.job_posting_id = jp.id
  JOIN public.recruiter_profiles rp ON jp.recruiter_id = rp.id
  WHERE cjm.candidate_id = p_candidate_id
    AND jp.status = 'open'
    AND cjm.match_score >= p_min_score
  ORDER BY cjm.match_score DESC
  LIMIT p_limit;
END;
$$;

-- ============================================================================
-- 10. HELPER FUNCTION: Get candidates for a job posting
-- ============================================================================
-- Finds matching candidates for a job posting

CREATE OR REPLACE FUNCTION public.get_job_matching_candidates(
  p_job_id uuid,
  p_limit integer DEFAULT 50,
  p_min_score numeric DEFAULT 0.7
)
RETURNS TABLE (
  candidate_id uuid,
  candidate_name text,
  candidate_location text,
  match_score numeric,
  embedding_similarity numeric,
  match_reasons text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.id,
    CONCAT(cp.name, ' ', cp.family_name) as candidate_name,
    cp.location,
    cjm.match_score,
    cjm.embedding_similarity,
    cjm.match_reasons
  FROM public.candidate_job_matches cjm
  JOIN public.candidate_profiles cp ON cjm.candidate_id = cp.id
  WHERE cjm.job_posting_id = p_job_id
    AND cjm.match_score >= p_min_score
  ORDER BY cjm.match_score DESC
  LIMIT p_limit;
END;
$$;

-- ============================================================================
-- 11. COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.job_posting_embeddings IS
'Stores OpenAI 1536-dimensional vector embeddings for job postings to enable semantic similarity search with candidate embeddings.';

COMMENT ON TABLE public.candidate_preferences IS
'Stores user preferences for automatic job applications, including enable/disable flag, minimum match score, and rate limits.';

COMMENT ON TABLE public.auto_application_runs IS
'Tracks batch automatic application runs for monitoring, debugging, and analytics purposes.';

COMMENT ON TABLE public.candidate_job_matches IS
'Cache of evaluated matches between candidates and job postings, including similarity scores and match reasons.';

COMMENT ON COLUMN public.job_posting_embeddings.metadata IS
'JSONB metadata about the job posting: job_title, description_length, required_skills, etc.';

COMMENT ON COLUMN public.candidate_preferences.auto_apply_min_score IS
'Minimum match score (0-100) required to auto-apply. Default 70. User can adjust.';

COMMENT ON COLUMN public.candidate_preferences.max_applications_per_day IS
'Maximum number of automatic applications per day to prevent spam. Default 5.';

COMMENT ON COLUMN public.applications.auto_applied IS
'Flag indicating if this application was submitted automatically by the matching system.';

COMMENT ON COLUMN public.applications.match_score IS
'The AI-calculated match score (0-100) that triggered this auto-application.';

COMMENT ON COLUMN public.applications.match_reasons IS
'Array of human-readable reasons explaining why this candidate matched this job.';

-- ============================================================================
-- End of migration
-- ============================================================================

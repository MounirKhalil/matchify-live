-- Migration: Add Candidate Job Evaluation Tracking System
-- Description: Tracks which candidates have been evaluated for which jobs to prevent duplicate processing

-- Table: candidate_job_evaluations
-- Purpose: Track evaluation status for candidate-job pairs
CREATE TABLE IF NOT EXISTS public.candidate_job_evaluations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  job_posting_id UUID NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  match_found BOOLEAN DEFAULT false,
  match_score INTEGER,
  embedding_similarity DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(candidate_id, job_posting_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_candidate_job_evaluations_candidate 
  ON public.candidate_job_evaluations(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_job_evaluations_job 
  ON public.candidate_job_evaluations(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_candidate_job_evaluations_evaluated_at 
  ON public.candidate_job_evaluations(evaluated_at);

-- Table: candidate_profile_updates
-- Purpose: Track when candidate profiles are updated to invalidate evaluations
CREATE TABLE IF NOT EXISTS public.candidate_profile_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  fields_updated TEXT[]
);

-- Index for tracking updates
CREATE INDEX IF NOT EXISTS idx_candidate_profile_updates_candidate 
  ON public.candidate_profile_updates(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_profile_updates_updated_at 
  ON public.candidate_profile_updates(updated_at);

-- Function: get_candidates_needing_evaluation
-- Purpose: Find candidates that need evaluation for a specific job
CREATE OR REPLACE FUNCTION public.get_candidates_needing_evaluation(
  p_job_posting_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  candidate_id UUID,
  candidate_name TEXT,
  has_embedding BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.id AS candidate_id,
    cp.name AS candidate_name,
    EXISTS(
      SELECT 1 FROM candidate_embeddings ce 
      WHERE ce.candidate_id = cp.id
    ) AS has_embedding
  FROM candidate_profiles cp
  WHERE NOT EXISTS (
    SELECT 1 
    FROM candidate_job_evaluations cje
    WHERE cje.candidate_id = cp.id
      AND cje.job_posting_id = p_job_posting_id
  )
  LIMIT p_limit;
END;
$$;

-- Function: mark_candidate_evaluated
-- Purpose: Mark a candidate as evaluated for a specific job
CREATE OR REPLACE FUNCTION public.mark_candidate_evaluated(
  p_candidate_id UUID,
  p_job_posting_id UUID,
  p_match_found BOOLEAN,
  p_match_score INTEGER DEFAULT NULL,
  p_embedding_similarity DOUBLE PRECISION DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO candidate_job_evaluations (
    candidate_id,
    job_posting_id,
    match_found,
    match_score,
    embedding_similarity,
    evaluated_at
  ) VALUES (
    p_candidate_id,
    p_job_posting_id,
    p_match_found,
    p_match_score,
    p_embedding_similarity,
    now()
  )
  ON CONFLICT (candidate_id, job_posting_id) 
  DO UPDATE SET
    evaluated_at = now(),
    match_found = EXCLUDED.match_found,
    match_score = EXCLUDED.match_score,
    embedding_similarity = EXCLUDED.embedding_similarity;
END;
$$;

-- Trigger: Track candidate profile updates
CREATE OR REPLACE FUNCTION public.track_candidate_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert update record
  INSERT INTO candidate_profile_updates (candidate_id, updated_at)
  VALUES (NEW.id, now());
  
  RETURN NEW;
END;
$$;

-- Create trigger on candidate_profiles
DROP TRIGGER IF EXISTS trigger_track_candidate_profile_update ON public.candidate_profiles;
CREATE TRIGGER trigger_track_candidate_profile_update
  AFTER UPDATE ON public.candidate_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.track_candidate_profile_update();

-- Enable RLS on new tables
ALTER TABLE public.candidate_job_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_profile_updates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for candidate_job_evaluations
CREATE POLICY "Service role can manage evaluations"
  ON public.candidate_job_evaluations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view their own evaluations"
  ON public.candidate_job_evaluations
  FOR SELECT
  TO authenticated
  USING (
    candidate_id IN (
      SELECT id FROM candidate_profiles WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for candidate_profile_updates
CREATE POLICY "Service role can manage updates"
  ON public.candidate_profile_updates
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view their own updates"
  ON public.candidate_profile_updates
  FOR SELECT
  TO authenticated
  USING (
    candidate_id IN (
      SELECT id FROM candidate_profiles WHERE user_id = auth.uid()
    )
  );

-- Grant permissions
GRANT ALL ON public.candidate_job_evaluations TO service_role;
GRANT ALL ON public.candidate_profile_updates TO service_role;
GRANT SELECT ON public.candidate_job_evaluations TO authenticated;
GRANT SELECT ON public.candidate_profile_updates TO authenticated;
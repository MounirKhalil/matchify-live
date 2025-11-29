-- Candidate-Job Evaluation Tracking
-- Tracks which candidates have been evaluated for which jobs
-- Allows smart re-evaluation logic and invalidation on profile updates

-- Table: Candidate-Job evaluation tracking
-- Prevents re-evaluation of same candidate-job pair unless profile is updated
CREATE TABLE IF NOT EXISTS public.candidate_job_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  job_posting_id UUID NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  evaluated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  match_found BOOLEAN NOT NULL DEFAULT FALSE,
  match_score NUMERIC(5,2),
  embedding_similarity NUMERIC(3,4),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Ensure each candidate-job pair is tracked only once
  UNIQUE(candidate_id, job_posting_id),

  -- Indexes for quick lookup
  CONSTRAINT fk_candidate FOREIGN KEY (candidate_id) REFERENCES public.candidate_profiles(id),
  CONSTRAINT fk_job FOREIGN KEY (job_posting_id) REFERENCES public.job_postings(id)
);

CREATE INDEX idx_candidate_job_evaluations_candidate_id
ON public.candidate_job_evaluations(candidate_id);

CREATE INDEX idx_candidate_job_evaluations_job_id
ON public.candidate_job_evaluations(job_posting_id);

CREATE INDEX idx_candidate_job_evaluations_evaluated_at
ON public.candidate_job_evaluations(evaluated_at DESC);

-- Table: Candidate profile update tracking
-- Tracks when candidate profiles are updated to invalidate evaluations
CREATE TABLE IF NOT EXISTS public.candidate_profile_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  field_changed TEXT NOT NULL,
  previous_value JSONB,
  new_value JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_candidate_profile_updates_candidate_id
ON public.candidate_profile_updates(candidate_id);

CREATE INDEX idx_candidate_profile_updates_created_at
ON public.candidate_profile_updates(created_at DESC);

-- Function: Invalidate candidate evaluations when profile is updated
-- Removes all evaluation marks for this candidate so they can be re-evaluated for all jobs
CREATE OR REPLACE FUNCTION public.invalidate_candidate_evaluations()
RETURNS TRIGGER AS $$
BEGIN
  -- Only invalidate if significant fields changed
  IF (
    OLD.bio IS DISTINCT FROM NEW.bio OR
    OLD.skills IS DISTINCT FROM NEW.skills OR
    OLD.work_experience IS DISTINCT FROM NEW.work_experience OR
    OLD.education IS DISTINCT FROM NEW.education OR
    OLD.preferred_categories IS DISTINCT FROM NEW.preferred_categories OR
    OLD.interests IS DISTINCT FROM NEW.interests
  ) THEN
    -- Remove all evaluations for this candidate
    DELETE FROM public.candidate_job_evaluations
    WHERE candidate_id = NEW.id;

    -- Log the profile update
    INSERT INTO public.candidate_profile_updates (
      candidate_id,
      field_changed,
      previous_value,
      new_value
    ) VALUES (
      NEW.id,
      'profile_update',
      row_to_json(OLD),
      row_to_json(NEW)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Invalidate evaluations on candidate profile update
DROP TRIGGER IF EXISTS candidate_evaluations_invalidation_trigger ON public.candidate_profiles;
CREATE TRIGGER candidate_evaluations_invalidation_trigger
AFTER UPDATE ON public.candidate_profiles
FOR EACH ROW
EXECUTE FUNCTION public.invalidate_candidate_evaluations();

-- Function: Get candidates that need evaluation for a job
-- Returns candidates that have NOT been evaluated for this job yet
CREATE OR REPLACE FUNCTION public.get_candidates_needing_evaluation(
  p_job_posting_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  candidate_id UUID,
  candidate_name TEXT,
  candidate_bio TEXT,
  has_embedding BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.id as candidate_id,
    cp.name as candidate_name,
    cp.bio as candidate_bio,
    CASE WHEN ce.id IS NOT NULL THEN TRUE ELSE FALSE END as has_embedding
  FROM public.candidate_profiles cp
  LEFT JOIN public.candidate_embeddings ce ON cp.id = ce.candidate_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.candidate_job_evaluations cje
    WHERE cje.candidate_id = cp.id AND cje.job_posting_id = p_job_posting_id
  )
  AND cp.created_at IS NOT NULL
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Mark candidates as evaluated for a job
-- Records that a candidate has been evaluated for a job with results
CREATE OR REPLACE FUNCTION public.mark_candidate_evaluated(
  p_candidate_id UUID,
  p_job_posting_id UUID,
  p_match_found BOOLEAN,
  p_match_score NUMERIC DEFAULT NULL,
  p_embedding_similarity NUMERIC DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_evaluation_id UUID;
BEGIN
  INSERT INTO public.candidate_job_evaluations (
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
    NOW()
  )
  ON CONFLICT (candidate_id, job_posting_id) DO UPDATE SET
    match_found = p_match_found,
    match_score = p_match_score,
    embedding_similarity = p_embedding_similarity,
    evaluated_at = NOW(),
    updated_at = NOW()
  RETURNING id INTO v_evaluation_id;

  RETURN v_evaluation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get evaluation statistics for monitoring
-- Returns counts of evaluations by candidate
CREATE OR REPLACE FUNCTION public.get_evaluation_stats()
RETURNS TABLE (
  total_evaluations BIGINT,
  total_matches BIGINT,
  avg_match_score NUMERIC,
  candidates_with_matches BIGINT,
  jobs_with_evaluations BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_evaluations,
    COUNT(*) FILTER (WHERE match_found = TRUE) as total_matches,
    AVG(match_score) as avg_match_score,
    COUNT(DISTINCT candidate_id) FILTER (WHERE match_found = TRUE) as candidates_with_matches,
    COUNT(DISTINCT job_posting_id) as jobs_with_evaluations
  FROM public.candidate_job_evaluations;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for evaluation tracking
ALTER TABLE public.candidate_job_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "candidates_can_view_their_evaluations" ON public.candidate_job_evaluations
  FOR SELECT
  USING (candidate_id = auth.uid());

CREATE POLICY "service_role_can_manage_evaluations" ON public.candidate_job_evaluations
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

ALTER TABLE public.candidate_profile_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "candidates_can_view_their_update_history" ON public.candidate_profile_updates
  FOR SELECT
  USING (candidate_id = auth.uid());

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_candidates_needing_evaluation TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.mark_candidate_evaluated TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_evaluation_stats TO authenticated, anon;

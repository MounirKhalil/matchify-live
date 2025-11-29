-- Migration: Auto-Generate Embeddings for New Candidates and Job Postings
-- Purpose: Automatically trigger embedding generation when new candidates sign up or new jobs are posted

-- ============================================================================
-- 1. Create a table to queue embedding generation jobs
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.embedding_generation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('candidate', 'job_posting')),
  entity_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INT DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_embedding_queue_status ON public.embedding_generation_queue(status, created_at);
CREATE INDEX idx_embedding_queue_entity ON public.embedding_generation_queue(entity_type, entity_id);

COMMENT ON TABLE public.embedding_generation_queue IS 'Queue for asynchronous embedding generation';

-- ============================================================================
-- 2. Enable Row Level Security
-- ============================================================================

ALTER TABLE public.embedding_generation_queue ENABLE ROW LEVEL SECURITY;

-- Only service role can access the queue
CREATE POLICY "Service role only for embedding queue"
ON public.embedding_generation_queue
FOR ALL
USING (false);

-- ============================================================================
-- 3. Create function to queue embedding generation
-- ============================================================================

CREATE OR REPLACE FUNCTION public.queue_embedding_generation(
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS VOID AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.embedding_generation_queue
    WHERE entity_type = p_entity_type
    AND entity_id = p_entity_id
    AND status IN ('pending', 'processing', 'completed')
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.embedding_generation_queue (entity_type, entity_id, status)
  VALUES (p_entity_type, p_entity_id, 'pending');

  PERFORM pg_notify(
    'embedding_generation',
    json_build_object(
      'entity_type', p_entity_type,
      'entity_id', p_entity_id
    )::text
  );

  RAISE NOTICE 'Queued % embedding generation for ID: %', p_entity_type, p_entity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.queue_embedding_generation IS 'Queue an entity for embedding generation';

-- ============================================================================
-- 4. Trigger function for new candidates
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_candidate_embedding()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    NEW.name IS NOT NULL OR
    NEW.work_experience IS NOT NULL OR
    NEW.interests IS NOT NULL
  ) THEN
    PERFORM public.queue_embedding_generation('candidate', NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. Trigger function for updated candidates
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_candidate_embedding_update()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    NEW.name IS DISTINCT FROM OLD.name OR
    NEW.family_name IS DISTINCT FROM OLD.family_name OR
    NEW.work_experience IS DISTINCT FROM OLD.work_experience OR
    NEW.education IS DISTINCT FROM OLD.education OR
    NEW.interests IS DISTINCT FROM OLD.interests OR
    NEW.location IS DISTINCT FROM OLD.location
  ) THEN
    DELETE FROM public.candidate_embeddings WHERE candidate_id = NEW.id;
    PERFORM public.queue_embedding_generation('candidate', NEW.id);
    RAISE NOTICE 'Queued embedding regeneration for candidate: %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. Trigger function for new job postings
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_job_embedding()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    NEW.status = 'open' AND
    (NEW.job_title IS NOT NULL OR NEW.requirements IS NOT NULL)
  ) THEN
    PERFORM public.queue_embedding_generation('job_posting', NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. Trigger function for updated job postings (FIXED - removed job_location)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_job_embedding_update()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    (OLD.status != 'open' AND NEW.status = 'open') OR
    (NEW.status = 'open' AND (
      NEW.job_title IS DISTINCT FROM OLD.job_title OR
      NEW.requirements IS DISTINCT FROM OLD.requirements OR
      NEW.categories IS DISTINCT FROM OLD.categories
    ))
  ) THEN
    DELETE FROM public.job_posting_embeddings WHERE job_posting_id = NEW.id;
    PERFORM public.queue_embedding_generation('job_posting', NEW.id);
    RAISE NOTICE 'Queued embedding regeneration for job: %', NEW.id;
  END IF;

  IF (OLD.status = 'open' AND NEW.status = 'closed') THEN
    DELETE FROM public.job_posting_embeddings WHERE job_posting_id = NEW.id;
    RAISE NOTICE 'Deleted embedding for closed job: %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. Create triggers on candidate_profiles
-- ============================================================================

DROP TRIGGER IF EXISTS on_candidate_profile_insert ON public.candidate_profiles;
DROP TRIGGER IF EXISTS on_candidate_profile_update ON public.candidate_profiles;

CREATE TRIGGER on_candidate_profile_insert
AFTER INSERT ON public.candidate_profiles
FOR EACH ROW
EXECUTE FUNCTION public.trigger_candidate_embedding();

CREATE TRIGGER on_candidate_profile_update
AFTER UPDATE ON public.candidate_profiles
FOR EACH ROW
EXECUTE FUNCTION public.trigger_candidate_embedding_update();

COMMENT ON TRIGGER on_candidate_profile_insert ON public.candidate_profiles IS 'Auto-queue embedding generation for new candidates';
COMMENT ON TRIGGER on_candidate_profile_update ON public.candidate_profiles IS 'Auto-queue embedding regeneration for updated candidates';

-- ============================================================================
-- 9. Create triggers on job_postings
-- ============================================================================

DROP TRIGGER IF EXISTS on_job_posting_insert ON public.job_postings;
DROP TRIGGER IF EXISTS on_job_posting_update ON public.job_postings;

CREATE TRIGGER on_job_posting_insert
AFTER INSERT ON public.job_postings
FOR EACH ROW
EXECUTE FUNCTION public.trigger_job_embedding();

CREATE TRIGGER on_job_posting_update
AFTER UPDATE ON public.job_postings
FOR EACH ROW
EXECUTE FUNCTION public.trigger_job_embedding_update();

COMMENT ON TRIGGER on_job_posting_insert ON public.job_postings IS 'Auto-queue embedding generation for new job postings';
COMMENT ON TRIGGER on_job_posting_update ON public.job_postings IS 'Auto-queue embedding regeneration for updated job postings';

-- ============================================================================
-- 10. Create function to process embedding queue
-- ============================================================================

CREATE OR REPLACE FUNCTION public.process_embedding_queue(
  batch_size INT DEFAULT 10
)
RETURNS TABLE (
  processed INT,
  succeeded INT,
  failed INT
) AS $$
DECLARE
  v_processed INT := 0;
  v_succeeded INT := 0;
  v_failed INT := 0;
  queue_item RECORD;
BEGIN
  FOR queue_item IN
    SELECT id, entity_type, entity_id
    FROM public.embedding_generation_queue
    WHERE status = 'pending'
    ORDER BY created_at ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.embedding_generation_queue
    SET status = 'processing', updated_at = now()
    WHERE id = queue_item.id;

    v_processed := v_processed + 1;
    RAISE NOTICE 'Queued for processing: % %', queue_item.entity_type, queue_item.entity_id;
  END LOOP;

  processed := v_processed;
  succeeded := v_succeeded;
  failed := v_failed;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.process_embedding_queue IS 'Process pending embedding generation jobs';

-- ============================================================================
-- 11. Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.queue_embedding_generation TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_embedding_queue TO service_role;
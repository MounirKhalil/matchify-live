-- Migration: Auto-Generate Embeddings for New Candidates and Job Postings
-- Purpose: Automatically trigger embedding generation when new candidates sign up or new jobs are posted
-- Date: 2025-11-24

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
USING (false); -- No RLS access, only service role

-- ============================================================================
-- 3. Create function to queue embedding generation
-- ============================================================================

CREATE OR REPLACE FUNCTION public.queue_embedding_generation(
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Check if already queued or completed
  IF EXISTS (
    SELECT 1 FROM public.embedding_generation_queue
    WHERE entity_type = p_entity_type
    AND entity_id = p_entity_id
    AND status IN ('pending', 'processing', 'completed')
  ) THEN
    -- Already queued or processed, skip
    RETURN;
  END IF;

  -- Insert new queue item
  INSERT INTO public.embedding_generation_queue (entity_type, entity_id, status)
  VALUES (p_entity_type, p_entity_id, 'pending');

  -- Optionally: Use pg_notify to trigger immediate processing
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
  -- Only queue if the candidate profile has sufficient data
  IF (
    NEW.name IS NOT NULL OR
    NEW.work_experience IS NOT NULL OR
    NEW.interests IS NOT NULL
  ) THEN
    -- Queue embedding generation
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
  -- Only regenerate if significant fields changed
  IF (
    NEW.name IS DISTINCT FROM OLD.name OR
    NEW.family_name IS DISTINCT FROM OLD.family_name OR
    NEW.work_experience IS DISTINCT FROM OLD.work_experience OR
    NEW.education IS DISTINCT FROM OLD.education OR
    NEW.interests IS DISTINCT FROM OLD.interests OR
    NEW.location IS DISTINCT FROM OLD.location
  ) THEN
    -- Delete existing embedding (will be regenerated)
    DELETE FROM public.candidate_embeddings WHERE candidate_id = NEW.id;

    -- Queue new embedding generation
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
  -- Only queue if job posting has sufficient data and is open
  IF (
    NEW.status = 'open' AND
    (NEW.job_title IS NOT NULL OR NEW.requirements IS NOT NULL)
  ) THEN
    -- Queue embedding generation
    PERFORM public.queue_embedding_generation('job_posting', NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. Trigger function for updated job postings
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_job_embedding_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Regenerate if significant fields changed or status changed to open
  IF (
    (OLD.status != 'open' AND NEW.status = 'open') OR
    (NEW.status = 'open' AND (
      NEW.job_title IS DISTINCT FROM OLD.job_title OR
      NEW.requirements IS DISTINCT FROM OLD.requirements OR
      NEW.categories IS DISTINCT FROM OLD.categories OR
      NEW.job_location IS DISTINCT FROM OLD.job_location
    ))
  ) THEN
    -- Delete existing embedding
    DELETE FROM public.job_posting_embeddings WHERE job_posting_id = NEW.id;

    -- Queue new embedding generation
    PERFORM public.queue_embedding_generation('job_posting', NEW.id);

    RAISE NOTICE 'Queued embedding regeneration for job: %', NEW.id;
  END IF;

  -- Delete embedding if job is closed
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

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_candidate_profile_insert ON public.candidate_profiles;
DROP TRIGGER IF EXISTS on_candidate_profile_update ON public.candidate_profiles;

-- Trigger for new candidates (INSERT)
CREATE TRIGGER on_candidate_profile_insert
AFTER INSERT ON public.candidate_profiles
FOR EACH ROW
EXECUTE FUNCTION public.trigger_candidate_embedding();

-- Trigger for updated candidates (UPDATE)
CREATE TRIGGER on_candidate_profile_update
AFTER UPDATE ON public.candidate_profiles
FOR EACH ROW
EXECUTE FUNCTION public.trigger_candidate_embedding_update();

COMMENT ON TRIGGER on_candidate_profile_insert ON public.candidate_profiles IS 'Auto-queue embedding generation for new candidates';
COMMENT ON TRIGGER on_candidate_profile_update ON public.candidate_profiles IS 'Auto-queue embedding regeneration for updated candidates';

-- ============================================================================
-- 9. Create triggers on job_postings
-- ============================================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_job_posting_insert ON public.job_postings;
DROP TRIGGER IF EXISTS on_job_posting_update ON public.job_postings;

-- Trigger for new job postings (INSERT)
CREATE TRIGGER on_job_posting_insert
AFTER INSERT ON public.job_postings
FOR EACH ROW
EXECUTE FUNCTION public.trigger_job_embedding();

-- Trigger for updated job postings (UPDATE)
CREATE TRIGGER on_job_posting_update
AFTER UPDATE ON public.job_postings
FOR EACH ROW
EXECUTE FUNCTION public.trigger_job_embedding_update();

COMMENT ON TRIGGER on_job_posting_insert ON public.job_postings IS 'Auto-queue embedding generation for new job postings';
COMMENT ON TRIGGER on_job_posting_update ON public.job_postings IS 'Auto-queue embedding regeneration for updated job postings';

-- ============================================================================
-- 10. Create function to process embedding queue (to be called by cron/worker)
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
  -- Get pending items
  FOR queue_item IN
    SELECT id, entity_type, entity_id
    FROM public.embedding_generation_queue
    WHERE status = 'pending'
    ORDER BY created_at ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Mark as processing
    UPDATE public.embedding_generation_queue
    SET status = 'processing', updated_at = now()
    WHERE id = queue_item.id;

    v_processed := v_processed + 1;

    -- Here you would call the edge function to generate embeddings
    -- For now, we just mark it as completed
    -- In production, this would be handled by a worker process

    -- Note: Actual embedding generation should be done by calling edge functions
    -- from a worker process that monitors this queue

    RAISE NOTICE 'Queued for processing: % %', queue_item.entity_type, queue_item.entity_id;
  END LOOP;

  processed := v_processed;
  succeeded := v_succeeded;
  failed := v_failed;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.process_embedding_queue IS 'Process pending embedding generation jobs (to be called by worker)';

-- ============================================================================
-- 11. Grant permissions
-- ============================================================================

-- Grant execute permissions to authenticated users (for queueing)
GRANT EXECUTE ON FUNCTION public.queue_embedding_generation TO authenticated;

-- Only service role should process the queue
GRANT EXECUTE ON FUNCTION public.process_embedding_queue TO service_role;

-- ============================================================================
-- USAGE INSTRUCTIONS
-- ============================================================================

-- After running this migration, you need to set up a worker process to:
-- 1. Listen for 'embedding_generation' notifications (pg_notify)
-- 2. Or periodically poll the embedding_generation_queue table
-- 3. Call the generate-embeddings edge function for each queued item
-- 4. Update the queue status to 'completed' or 'failed'

-- Example worker pseudo-code:
--
-- setInterval(async () => {
--   const { data } = await supabase
--     .from('embedding_generation_queue')
--     .select('*')
--     .eq('status', 'pending')
--     .limit(10);
--
--   for (const item of data) {
--     try {
--       if (item.entity_type === 'candidate') {
--         await supabase.functions.invoke('generate-embeddings', {
--           body: { candidate_id: item.entity_id, candidate_data: ... }
--         });
--       } else if (item.entity_type === 'job_posting') {
--         await supabase.functions.invoke('generate-job-embeddings', {
--           body: { job_posting_id: item.entity_id, job_data: ... }
--         });
--       }
--
--       await supabase
--         .from('embedding_generation_queue')
--         .update({ status: 'completed', processed_at: new Date() })
--         .eq('id', item.id);
--     } catch (error) {
--       await supabase
--         .from('embedding_generation_queue')
--         .update({
--           status: 'failed',
--           error_message: error.message,
--           attempts: item.attempts + 1
--         })
--         .eq('id', item.id);
--     }
--   }
-- }, 5000); // Run every 5 seconds

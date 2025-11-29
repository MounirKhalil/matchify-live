-- Fix security warnings: Add search_path to all embedding functions

CREATE OR REPLACE FUNCTION public.queue_embedding_generation(
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM embedding_generation_queue
    WHERE entity_type = p_entity_type
    AND entity_id = p_entity_id
    AND status IN ('pending', 'processing', 'completed')
  ) THEN
    RETURN;
  END IF;

  INSERT INTO embedding_generation_queue (entity_type, entity_id, status)
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
$$;

CREATE OR REPLACE FUNCTION public.trigger_candidate_embedding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (
    NEW.name IS NOT NULL OR
    NEW.work_experience IS NOT NULL OR
    NEW.interests IS NOT NULL
  ) THEN
    PERFORM queue_embedding_generation('candidate', NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_candidate_embedding_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (
    NEW.name IS DISTINCT FROM OLD.name OR
    NEW.family_name IS DISTINCT FROM OLD.family_name OR
    NEW.work_experience IS DISTINCT FROM OLD.work_experience OR
    NEW.education IS DISTINCT FROM OLD.education OR
    NEW.interests IS DISTINCT FROM OLD.interests OR
    NEW.location IS DISTINCT FROM OLD.location
  ) THEN
    DELETE FROM candidate_embeddings WHERE candidate_id = NEW.id;
    PERFORM queue_embedding_generation('candidate', NEW.id);
    RAISE NOTICE 'Queued embedding regeneration for candidate: %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_job_embedding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (
    NEW.status = 'open' AND
    (NEW.job_title IS NOT NULL OR NEW.requirements IS NOT NULL)
  ) THEN
    PERFORM queue_embedding_generation('job_posting', NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_job_embedding_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (
    (OLD.status != 'open' AND NEW.status = 'open') OR
    (NEW.status = 'open' AND (
      NEW.job_title IS DISTINCT FROM OLD.job_title OR
      NEW.requirements IS DISTINCT FROM OLD.requirements OR
      NEW.categories IS DISTINCT FROM OLD.categories
    ))
  ) THEN
    DELETE FROM job_posting_embeddings WHERE job_posting_id = NEW.id;
    PERFORM queue_embedding_generation('job_posting', NEW.id);
    RAISE NOTICE 'Queued embedding regeneration for job: %', NEW.id;
  END IF;

  IF (OLD.status = 'open' AND NEW.status = 'closed') THEN
    DELETE FROM job_posting_embeddings WHERE job_posting_id = NEW.id;
    RAISE NOTICE 'Deleted embedding for closed job: %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_embedding_queue(
  batch_size INT DEFAULT 10
)
RETURNS TABLE (
  processed INT,
  succeeded INT,
  failed INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_processed INT := 0;
  v_succeeded INT := 0;
  v_failed INT := 0;
  queue_item RECORD;
BEGIN
  FOR queue_item IN
    SELECT id, entity_type, entity_id
    FROM embedding_generation_queue
    WHERE status = 'pending'
    ORDER BY created_at ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE embedding_generation_queue
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
$$;
-- Fix security warning: Set search_path for the vector search function
CREATE OR REPLACE FUNCTION search_candidates_by_embedding(
  query_embedding VECTOR(1536),
  similarity_threshold FLOAT DEFAULT 0.5,
  limit_count INT DEFAULT 10
)
RETURNS TABLE (
  candidate_id UUID,
  similarity FLOAT,
  metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ce.candidate_id,
    1 - (ce.embeddings <=> query_embedding) AS similarity,
    ce.metadata
  FROM public.candidate_embeddings ce
  WHERE 1 - (ce.embeddings <=> query_embedding) > similarity_threshold
  ORDER BY ce.embeddings <=> query_embedding
  LIMIT limit_count;
END;
$$;
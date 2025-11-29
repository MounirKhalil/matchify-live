-- SQL Function for vector similarity search
-- This function performs semantic search on candidate embeddings

CREATE OR REPLACE FUNCTION public.search_candidates_by_embedding(
  query_embedding vector,
  similarity_threshold float DEFAULT 0.5,
  limit_results int DEFAULT 5
)
RETURNS TABLE (
  candidate_id uuid,
  metadata jsonb,
  similarity float
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ce.candidate_id,
    ce.metadata,
    1 - (ce.embeddings <-> query_embedding) as similarity
  FROM public.candidate_embeddings ce
  WHERE 1 - (ce.embeddings <-> query_embedding) > similarity_threshold
  ORDER BY ce.embeddings <-> query_embedding ASC
  LIMIT limit_results;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.search_candidates_by_embedding(vector, float, int) TO authenticated;

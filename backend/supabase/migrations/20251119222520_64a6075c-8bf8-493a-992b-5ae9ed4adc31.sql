-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Table 1: candidate_embeddings
CREATE TABLE public.candidate_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID UNIQUE NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  embeddings VECTOR(1536) NOT NULL,
  metadata JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_candidate_embeddings_vector
ON public.candidate_embeddings USING ivfflat (embeddings vector_cosine_ops) WITH (lists = 100);

-- Enable RLS
ALTER TABLE public.candidate_embeddings ENABLE ROW LEVEL SECURITY;

-- RLS Policy for candidate_embeddings
CREATE POLICY "Recruiters can view embeddings"
  ON public.candidate_embeddings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.recruiter_profiles
    WHERE user_id = auth.uid()
  ));

-- Table 2: chatbot_conversations
CREATE TABLE public.chatbot_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id UUID NOT NULL REFERENCES public.recruiter_profiles(id) ON DELETE CASCADE,
  conversation_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_chatbot_conversations_recruiter ON public.chatbot_conversations(recruiter_id);

-- Enable RLS
ALTER TABLE public.chatbot_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policy for chatbot_conversations
CREATE POLICY "Recruiters can manage conversations"
  ON public.chatbot_conversations FOR ALL
  USING (recruiter_id IN (
    SELECT id FROM public.recruiter_profiles WHERE user_id = auth.uid()
  ));

-- Add column to candidate_profiles
ALTER TABLE public.candidate_profiles
ADD COLUMN IF NOT EXISTS embedding_last_updated TIMESTAMP WITH TIME ZONE;

-- Create RPC function for vector search (if not exists)
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
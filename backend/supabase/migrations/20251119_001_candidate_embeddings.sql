-- Create candidate_embeddings table for semantic search
CREATE TABLE public.candidate_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID UNIQUE NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  embeddings VECTOR(1536) NOT NULL, -- OpenAI embedding dimension
  metadata JSONB NOT NULL, -- Stores: position, skills, experience, location, languages, certifications
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for fast vector similarity search using ivfflat
CREATE INDEX idx_candidate_embeddings_vector
ON public.candidate_embeddings USING ivfflat (embeddings vector_cosine_ops)
WITH (lists = 100);

-- Create chatbot_conversations table to track recruiter interactions
CREATE TABLE public.chatbot_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id UUID NOT NULL REFERENCES public.recruiter_profiles(id) ON DELETE CASCADE,
  conversation_history JSONB DEFAULT '[]'::jsonb, -- Array of {role: 'recruiter'|'bot', content: string, timestamp: ISO8601}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_chatbot_conversations_recruiter ON public.chatbot_conversations(recruiter_id);
CREATE INDEX idx_chatbot_conversations_created ON public.chatbot_conversations(created_at DESC);

-- Extend candidate_profiles table to track embedding updates
ALTER TABLE public.candidate_profiles
ADD COLUMN IF NOT EXISTS embedding_last_updated TIMESTAMP WITH TIME ZONE;

-- Enable Row Level Security
ALTER TABLE public.candidate_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policy for candidate_embeddings: recruiters can view embeddings of candidates they found
CREATE POLICY "Recruiters can view candidate embeddings they found"
  ON public.candidate_embeddings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.external_candidates ec
      WHERE ec.id = candidate_embeddings.candidate_id
      AND ec.found_by_search_id IN (
        SELECT id FROM public.headhunt_searches hs
        WHERE hs.recruiter_id IN (
          SELECT id FROM public.recruiter_profiles rp
          WHERE rp.user_id = auth.uid()
        )
      )
    )
    OR
    -- Also allow recruiters to see embeddings of candidates they own (for future internal candidate matching)
    EXISTS (
      SELECT 1 FROM public.candidate_profiles cp
      WHERE cp.id = candidate_embeddings.candidate_id
      AND cp.user_id = auth.uid()
    )
  );

-- RLS Policy for chatbot_conversations: recruiters can only access their own conversations
CREATE POLICY "Recruiters can manage their own conversations"
  ON public.chatbot_conversations
  FOR ALL
  USING (
    recruiter_id IN (
      SELECT id FROM public.recruiter_profiles
      WHERE user_id = auth.uid()
    )
  );

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_candidate_embeddings_updated_at
  BEFORE UPDATE ON public.candidate_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_chatbot_conversations_updated_at
  BEFORE UPDATE ON public.chatbot_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

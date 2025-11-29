-- Create audit_logs table for structured security event logging
-- This table provides compliance-ready audit trail for all high-risk operations

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Timestamp and user identification
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_role TEXT CHECK (user_role IN ('job_seeker', 'recruiter', 'admin', 'system')),

  -- Action classification
  action_type TEXT NOT NULL,  -- e.g., 'AUTO_APPLY', 'HEADHUNT_QUERY', 'AGENT_REASONING', 'MODERATION_BLOCK'
  action_category TEXT CHECK (action_category IN ('authentication', 'data_access', 'data_modification', 'autonomous_action', 'security_event', 'cost_event')),

  -- Resource identification
  resource_type TEXT,  -- e.g., 'candidate_profile', 'job_posting', 'application', 'external_candidate'
  resource_id UUID,

  -- Safety Gateway results
  moderation_result JSONB,  -- OpenAI moderation API response
  patterns_triggered TEXT[],  -- List of pattern names that matched
  safety_action TEXT,  -- 'allowed', 'blocked', 'flagged_for_review', 'sanitized'

  -- Agent/LLM tracking
  tool_calls TEXT[],  -- Which tools were invoked
  llm_model TEXT,  -- Which model was used (gpt-4, gpt-3.5-turbo, etc.)
  total_tokens INTEGER,
  cost_usd DECIMAL(10, 6),

  -- Request context
  details JSONB,  -- Additional context (query, reasoning, etc.)
  ip_address INET,
  user_agent TEXT,

  -- Severity for alerting
  severity TEXT CHECK (severity IN ('info', 'warning', 'error', 'critical')) DEFAULT 'info',

  -- Flag for follow-up
  requires_review BOOLEAN DEFAULT FALSE,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  review_notes TEXT
);

-- Indexes for common queries
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_logs_action_type ON public.audit_logs(action_type);
CREATE INDEX idx_audit_logs_severity ON public.audit_logs(severity) WHERE severity IN ('error', 'critical');
CREATE INDEX idx_audit_logs_requires_review ON public.audit_logs(requires_review) WHERE requires_review = TRUE;
CREATE INDEX idx_audit_logs_safety_action ON public.audit_logs(safety_action) WHERE safety_action IN ('blocked', 'flagged_for_review');

-- Row Level Security
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs"
  ON public.audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: System can insert audit logs (via service role key)
-- This will be enforced at application level - edge functions use service role key

-- Grant permissions
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT INSERT ON public.audit_logs TO service_role;

-- Add comment for documentation
COMMENT ON TABLE public.audit_logs IS 'Structured audit trail for security events, autonomous actions, and compliance';
COMMENT ON COLUMN public.audit_logs.moderation_result IS 'Raw JSON response from OpenAI moderation API';
COMMENT ON COLUMN public.audit_logs.patterns_triggered IS 'List of security pattern names that matched (e.g., prompt_injection, sql_injection)';
COMMENT ON COLUMN public.audit_logs.safety_action IS 'What action was taken: allowed, blocked, flagged_for_review, sanitized';

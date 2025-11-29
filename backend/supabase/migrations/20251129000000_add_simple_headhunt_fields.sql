-- Migration: Add fields for simplified PhantomBuster headhunting
-- This supports the platform-managed headhunting feature where recruiters
-- don't need to provide their own API keys.

-- Add fields to headhunt_searches for simplified flow
ALTER TABLE public.headhunt_searches
ADD COLUMN IF NOT EXISTS provider text DEFAULT 'multi', -- 'linkedin', 'github', 'multi'
ADD COLUMN IF NOT EXISTS role text, -- Simplified role field (maps to job_title)
ADD COLUMN IF NOT EXISTS seniority text, -- 'Junior', 'Mid', 'Senior', 'Lead', etc.
ADD COLUMN IF NOT EXISTS skills text[], -- Simplified skills array
ADD COLUMN IF NOT EXISTS location text, -- Single location string
ADD COLUMN IF NOT EXISTS query_string text, -- The exact query sent to PhantomBuster
ADD COLUMN IF NOT EXISTS phantombuster_container_id text, -- For tracking PB runs
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending'; -- Duplicate of search_status for convenience

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_headhunt_searches_status ON public.headhunt_searches(status);
CREATE INDEX IF NOT EXISTS idx_headhunt_searches_recruiter_id ON public.headhunt_searches(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_headhunt_searches_created_at ON public.headhunt_searches(created_at DESC);

-- Add index to external_candidates for run lookups
ALTER TABLE public.external_candidates
ADD COLUMN IF NOT EXISTS run_id uuid REFERENCES public.headhunt_searches(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_external_candidates_run_id ON public.external_candidates(run_id);

-- Update the external_candidates table to use profile_url as main field
ALTER TABLE public.external_candidates
ADD COLUMN IF NOT EXISTS profile_url text; -- Generic profile URL (can be LinkedIn, GitHub, etc.)

-- Add job_title field if it doesn't exist (more standard name than current_position)
ALTER TABLE public.external_candidates
ADD COLUMN IF NOT EXISTS job_title text;

-- Add company field if it doesn't exist (more standard name than current_company)
ALTER TABLE public.external_candidates
ADD COLUMN IF NOT EXISTS company text;

-- Add raw jsonb field to store complete PhantomBuster response
ALTER TABLE public.external_candidates
ADD COLUMN IF NOT EXISTS raw jsonb DEFAULT '{}'::jsonb;

-- Comment the tables
COMMENT ON COLUMN public.headhunt_searches.provider IS 'Search provider: linkedin, github, or multi';
COMMENT ON COLUMN public.headhunt_searches.role IS 'Simplified role/job title for the search';
COMMENT ON COLUMN public.headhunt_searches.seniority IS 'Seniority level: Junior, Mid, Senior, Lead, Principal, etc.';
COMMENT ON COLUMN public.headhunt_searches.skills IS 'Array of required skills (simplified from required_skills)';
COMMENT ON COLUMN public.headhunt_searches.location IS 'Single location string (simplified from target_locations)';
COMMENT ON COLUMN public.headhunt_searches.query_string IS 'The exact search query sent to PhantomBuster';
COMMENT ON COLUMN public.headhunt_searches.phantombuster_container_id IS 'PhantomBuster container ID for tracking the scraping run';
COMMENT ON COLUMN public.headhunt_searches.status IS 'Current status: pending, running, completed, failed';

COMMENT ON COLUMN public.external_candidates.run_id IS 'Reference to the headhunt_searches that found this candidate';
COMMENT ON COLUMN public.external_candidates.profile_url IS 'Main profile URL (LinkedIn, GitHub, etc.)';
COMMENT ON COLUMN public.external_candidates.job_title IS 'Current job title';
COMMENT ON COLUMN public.external_candidates.company IS 'Current company';
COMMENT ON COLUMN public.external_candidates.raw IS 'Raw data from the scraping API (PhantomBuster, etc.)';

-- Make search_name optional for simplified flow (can use auto-generated name)
ALTER TABLE public.headhunt_searches
ALTER COLUMN search_name DROP NOT NULL;

-- Make job_title optional (can use role instead)
ALTER TABLE public.headhunt_searches
ALTER COLUMN job_title DROP NOT NULL;

-- Add a helpful view for simplified headhunting results
CREATE OR REPLACE VIEW public.headhunt_simple_results AS
SELECT
  hs.id as search_id,
  hs.recruiter_id,
  hs.provider,
  hs.role,
  hs.seniority,
  hs.location,
  hs.skills,
  hs.query_string,
  hs.status,
  hs.created_at as search_created_at,
  hs.completed_at as search_completed_at,
  ec.id as candidate_id,
  ec.full_name,
  ec.headline,
  ec.profile_url,
  ec.location as candidate_location,
  ec.company,
  ec.job_title,
  ec.source,
  ec.email,
  ec.created_at as candidate_created_at
FROM public.headhunt_searches hs
LEFT JOIN public.external_candidates ec ON ec.run_id = hs.id
WHERE hs.provider IS NOT NULL; -- Only include searches from simplified flow

-- Add RLS policy for the view (same as base tables)
ALTER VIEW public.headhunt_simple_results OWNER TO postgres;

-- Grant access to authenticated users
GRANT SELECT ON public.headhunt_simple_results TO authenticated;

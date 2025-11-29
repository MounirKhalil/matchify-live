-- Drop the old headhunt_searches table if it exists
DROP TABLE IF EXISTS public.headhunt_searches CASCADE;

-- Create headhunt_searches table for external candidate scraping
CREATE TABLE IF NOT EXISTS public.headhunt_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id uuid NOT NULL REFERENCES public.recruiter_profiles(id) ON DELETE CASCADE,

  -- Search criteria (NO NAME FIELD - search by skills/requirements only)
  search_name text NOT NULL, -- Name for this search campaign
  job_title text NOT NULL,
  required_skills text[] DEFAULT '{}',
  preferred_skills text[] DEFAULT '{}',
  min_years_experience integer,
  max_years_experience integer,
  required_education_level text,
  preferred_education_fields text[] DEFAULT '{}',
  target_locations text[] DEFAULT '{}', -- Where to search
  target_countries text[] DEFAULT '{}',
  categories text[] DEFAULT '{}',
  required_certifications text[] DEFAULT '{}',
  keywords text[] DEFAULT '{}', -- Keywords to search for
  exclude_keywords text[] DEFAULT '{}',

  -- Search sources configuration
  search_linkedin boolean DEFAULT true,
  search_github boolean DEFAULT true,
  search_google boolean DEFAULT true,
  search_stackoverflow boolean DEFAULT false,
  search_twitter boolean DEFAULT false,

  -- Additional criteria
  detailed_requirements text,
  company_size_preference text, -- e.g., "startup", "enterprise", "mid-size"
  industry_preferences text[] DEFAULT '{}',

  -- Search settings
  min_match_score numeric DEFAULT 70,
  max_results integer DEFAULT 50,

  -- Results (external candidates found)
  results jsonb DEFAULT '[]'::jsonb,
  search_status text DEFAULT 'pending', -- pending, running, completed, failed
  search_completed boolean DEFAULT false,
  total_found integer DEFAULT 0,
  error_message text,

  -- Metadata
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  started_at timestamp with time zone,
  completed_at timestamp with time zone
);

-- Create external_candidates table to store scraped candidates
CREATE TABLE IF NOT EXISTS public.external_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source information
  source text NOT NULL, -- 'linkedin', 'github', 'google', 'stackoverflow', etc.
  source_url text NOT NULL UNIQUE, -- Original profile URL
  source_id text, -- ID on the source platform

  -- Candidate information
  full_name text NOT NULL,
  headline text,
  location text,
  country text,
  email text,
  phone_number text,

  -- Professional details
  current_company text,
  current_position text,
  years_of_experience integer,

  -- Profile links
  linkedin_url text,
  github_url text,
  twitter_url text,
  website_url text,
  portfolio_url text,

  -- Extracted data
  skills text[] DEFAULT '{}',
  education jsonb DEFAULT '[]'::jsonb,
  work_experience jsonb DEFAULT '[]'::jsonb,
  certifications text[] DEFAULT '{}',
  languages text[] DEFAULT '{}',

  -- Profile details
  bio text,
  profile_image_url text,

  -- Metadata
  scraped_at timestamp with time zone DEFAULT now(),
  last_updated timestamp with time zone DEFAULT now(),
  scrape_quality_score numeric, -- 0-100, how complete is the data

  -- Search association
  found_by_search_id uuid REFERENCES public.headhunt_searches(id) ON DELETE SET NULL,
  match_score numeric, -- Score for the search that found them

  -- Deduplication
  fingerprint text, -- Hash of name + location for deduplication

  CONSTRAINT unique_source_url UNIQUE(source_url)
);

-- Create scraping_jobs table to track async scraping tasks
CREATE TABLE IF NOT EXISTS public.scraping_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id uuid NOT NULL REFERENCES public.headhunt_searches(id) ON DELETE CASCADE,
  source text NOT NULL, -- 'linkedin', 'github', etc.
  status text DEFAULT 'pending', -- pending, running, completed, failed
  query_string text, -- The search query used
  results_count integer DEFAULT 0,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  error_message text,
  created_at timestamp with time zone DEFAULT now()
);

-- Add updated_at trigger for headhunt_searches
CREATE TRIGGER handle_headhunt_searches_updated_at
  BEFORE UPDATE ON public.headhunt_searches
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Add updated_at trigger for external_candidates
CREATE TRIGGER handle_external_candidates_updated_at
  BEFORE UPDATE ON public.external_candidates
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create indexes
CREATE INDEX idx_headhunt_searches_recruiter_id ON public.headhunt_searches(recruiter_id);
CREATE INDEX idx_headhunt_searches_status ON public.headhunt_searches(search_status);
CREATE INDEX idx_external_candidates_source ON public.external_candidates(source);
CREATE INDEX idx_external_candidates_source_url ON public.external_candidates(source_url);
CREATE INDEX idx_external_candidates_fingerprint ON public.external_candidates(fingerprint);
CREATE INDEX idx_external_candidates_search_id ON public.external_candidates(found_by_search_id);
CREATE INDEX idx_scraping_jobs_search_id ON public.scraping_jobs(search_id);
CREATE INDEX idx_scraping_jobs_status ON public.scraping_jobs(status);

-- RLS Policies for headhunt_searches
ALTER TABLE public.headhunt_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recruiters can create their own headhunt searches"
ON public.headhunt_searches
FOR INSERT
WITH CHECK (
  recruiter_id IN (
    SELECT id FROM public.recruiter_profiles
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Recruiters can view their own headhunt searches"
ON public.headhunt_searches
FOR SELECT
USING (
  recruiter_id IN (
    SELECT id FROM public.recruiter_profiles
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Recruiters can update their own headhunt searches"
ON public.headhunt_searches
FOR UPDATE
USING (
  recruiter_id IN (
    SELECT id FROM public.recruiter_profiles
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Recruiters can delete their own headhunt searches"
ON public.headhunt_searches
FOR DELETE
USING (
  recruiter_id IN (
    SELECT id FROM public.recruiter_profiles
    WHERE user_id = auth.uid()
  )
);

-- RLS Policies for external_candidates
ALTER TABLE public.external_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recruiters can view candidates from their searches"
ON public.external_candidates
FOR SELECT
USING (
  found_by_search_id IN (
    SELECT id FROM public.headhunt_searches
    WHERE recruiter_id IN (
      SELECT id FROM public.recruiter_profiles
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "System can insert external candidates"
ON public.external_candidates
FOR INSERT
WITH CHECK (true); -- Edge function will insert with service role

-- RLS Policies for scraping_jobs
ALTER TABLE public.scraping_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recruiters can view their scraping jobs"
ON public.scraping_jobs
FOR SELECT
USING (
  search_id IN (
    SELECT id FROM public.headhunt_searches
    WHERE recruiter_id IN (
      SELECT id FROM public.recruiter_profiles
      WHERE user_id = auth.uid()
    )
  )
);

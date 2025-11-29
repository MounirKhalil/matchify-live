-- Create headhunt_searches table to store recruiter headhunting search criteria and results
CREATE TABLE IF NOT EXISTS public.headhunt_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id uuid NOT NULL REFERENCES public.recruiter_profiles(id) ON DELETE CASCADE,

  -- Search criteria
  search_name text NOT NULL, -- Name for this search/campaign
  job_title text NOT NULL,
  required_skills text[] DEFAULT '{}',
  preferred_skills text[] DEFAULT '{}',
  min_years_experience integer,
  max_years_experience integer,
  required_education_level text, -- e.g., "Bachelor's", "Master's", "PhD"
  preferred_education_fields text[] DEFAULT '{}',
  required_locations text[] DEFAULT '{}',
  preferred_locations text[] DEFAULT '{}',
  categories text[] DEFAULT '{}',
  required_certifications text[] DEFAULT '{}',

  -- Additional criteria
  must_have_github boolean DEFAULT false,
  must_have_linkedin boolean DEFAULT false,
  must_have_portfolio boolean DEFAULT false,
  keywords text[] DEFAULT '{}', -- Keywords to search for in profiles
  exclude_keywords text[] DEFAULT '{}', -- Keywords to exclude

  -- Detailed description
  detailed_requirements text, -- Detailed description of ideal candidate

  -- Search settings
  min_match_score numeric DEFAULT 70, -- Minimum score to include in results
  max_results integer DEFAULT 50,

  -- Results (stored as JSONB for flexibility)
  results jsonb DEFAULT '[]'::jsonb,
  search_completed boolean DEFAULT false,

  -- Metadata
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  last_searched_at timestamp with time zone
);

-- Add updated_at trigger
CREATE TRIGGER handle_headhunt_searches_updated_at
  BEFORE UPDATE ON public.headhunt_searches
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create index on recruiter_id for faster queries
CREATE INDEX idx_headhunt_searches_recruiter_id ON public.headhunt_searches(recruiter_id);

-- Create index on search_completed for filtering
CREATE INDEX idx_headhunt_searches_completed ON public.headhunt_searches(search_completed);

-- RLS Policies
ALTER TABLE public.headhunt_searches ENABLE ROW LEVEL SECURITY;

-- Recruiters can create their own headhunt searches
CREATE POLICY "Recruiters can create their own headhunt searches"
ON public.headhunt_searches
FOR INSERT
WITH CHECK (
  recruiter_id IN (
    SELECT id FROM public.recruiter_profiles
    WHERE user_id = auth.uid()
  )
);

-- Recruiters can view their own headhunt searches
CREATE POLICY "Recruiters can view their own headhunt searches"
ON public.headhunt_searches
FOR SELECT
USING (
  recruiter_id IN (
    SELECT id FROM public.recruiter_profiles
    WHERE user_id = auth.uid()
  )
);

-- Recruiters can update their own headhunt searches
CREATE POLICY "Recruiters can update their own headhunt searches"
ON public.headhunt_searches
FOR UPDATE
USING (
  recruiter_id IN (
    SELECT id FROM public.recruiter_profiles
    WHERE user_id = auth.uid()
  )
);

-- Recruiters can delete their own headhunt searches
CREATE POLICY "Recruiters can delete their own headhunt searches"
ON public.headhunt_searches
FOR DELETE
USING (
  recruiter_id IN (
    SELECT id FROM public.recruiter_profiles
    WHERE user_id = auth.uid()
  )
);
-- Create table for recruiter API settings
CREATE TABLE IF NOT EXISTS public.recruiter_api_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id UUID NOT NULL REFERENCES public.recruiter_profiles(id) ON DELETE CASCADE,
  
  -- API Keys (encrypted at rest by Supabase)
  github_token TEXT,
  proxycurl_api_key TEXT,
  scrapingbee_api_key TEXT,
  apify_api_key TEXT,
  phantombuster_api_key TEXT,
  rapidapi_key TEXT,
  serpapi_key TEXT,
  hunter_api_key TEXT,
  rocketreach_api_key TEXT,
  anthropic_api_key TEXT,
  stackoverflow_api_key TEXT,
  
  -- Service Toggles
  use_github BOOLEAN DEFAULT true,
  use_linkedin BOOLEAN DEFAULT true,
  use_google BOOLEAN DEFAULT false,
  use_stackoverflow BOOLEAN DEFAULT false,
  use_twitter BOOLEAN DEFAULT false,
  
  -- Provider Selection
  linkedin_provider TEXT DEFAULT 'proxycurl', -- proxycurl, scrapingbee, apify, phantombuster, rapidapi
  email_provider TEXT DEFAULT 'hunter', -- hunter, rocketreach, none
  
  -- Search Preferences
  min_results INTEGER DEFAULT 10,
  max_results INTEGER DEFAULT 50,
  default_min_match_score NUMERIC DEFAULT 70,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(recruiter_id)
);

-- Enable RLS
ALTER TABLE public.recruiter_api_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Recruiters can view their own API settings"
  ON public.recruiter_api_settings
  FOR SELECT
  USING (
    recruiter_id IN (
      SELECT id FROM public.recruiter_profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Recruiters can insert their own API settings"
  ON public.recruiter_api_settings
  FOR INSERT
  WITH CHECK (
    recruiter_id IN (
      SELECT id FROM public.recruiter_profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Recruiters can update their own API settings"
  ON public.recruiter_api_settings
  FOR UPDATE
  USING (
    recruiter_id IN (
      SELECT id FROM public.recruiter_profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Recruiters can delete their own API settings"
  ON public.recruiter_api_settings
  FOR DELETE
  USING (
    recruiter_id IN (
      SELECT id FROM public.recruiter_profiles
      WHERE user_id = auth.uid()
    )
  );

-- Create index for faster lookups
CREATE INDEX idx_recruiter_api_settings_recruiter_id ON public.recruiter_api_settings(recruiter_id);

-- Trigger for updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.recruiter_api_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
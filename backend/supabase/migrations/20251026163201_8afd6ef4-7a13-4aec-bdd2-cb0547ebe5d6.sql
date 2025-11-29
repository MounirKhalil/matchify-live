-- Create candidate_profiles table
CREATE TABLE public.candidate_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  family_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone_number TEXT,
  country TEXT,
  date_of_birth DATE,
  location TEXT,
  cv_url TEXT,
  interests TEXT[],
  automatic BOOLEAN DEFAULT false,
  refine BOOLEAN DEFAULT false,
  applications_sent INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.candidate_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only access their own profile
CREATE POLICY "Users can view their own profile"
  ON public.candidate_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.candidate_profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.candidate_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create storage bucket for CVs
INSERT INTO storage.buckets (id, name, public)
VALUES ('cvstorage', 'cvstorage', false);

-- Storage policies for CV uploads
CREATE POLICY "Users can view their own CVs"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'cvstorage' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own CVs"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'cvstorage' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own CVs"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'cvstorage' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own CVs"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'cvstorage' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_candidate_profiles_updated_at
  BEFORE UPDATE ON public.candidate_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.candidate_profiles (user_id, name, family_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'family_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
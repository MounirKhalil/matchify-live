-- Delete all existing users (this will cascade to profiles due to triggers)
DELETE FROM auth.users;

-- Create role enum
CREATE TYPE public.app_role AS ENUM ('job_seeker', 'recruiter');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Create recruiter_profiles table
CREATE TABLE public.recruiter_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  name TEXT NOT NULL,
  family_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT,
  organization_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on recruiter_profiles
ALTER TABLE public.recruiter_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for recruiter_profiles
CREATE POLICY "Users can view their own profile"
ON public.recruiter_profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.recruiter_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.recruiter_profiles
FOR UPDATE
USING (auth.uid() = user_id);

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Update handle_new_user function to handle both roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Get role from metadata
  user_role := NEW.raw_user_meta_data->>'role';
  
  -- Insert into user_roles table
  IF user_role = 'job_seeker' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'job_seeker');
    
    -- Create candidate profile
    INSERT INTO public.candidate_profiles (user_id, name, family_name, email)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', ''),
      COALESCE(NEW.raw_user_meta_data->>'family_name', ''),
      NEW.email
    );
  ELSIF user_role = 'recruiter' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'recruiter');
    
    -- Create recruiter profile
    INSERT INTO public.recruiter_profiles (user_id, name, family_name, email, organization_name)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', ''),
      COALESCE(NEW.raw_user_meta_data->>'family_name', ''),
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'organization_name', '')
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add trigger for updated_at on recruiter_profiles
CREATE TRIGGER update_recruiter_profiles_updated_at
BEFORE UPDATE ON public.recruiter_profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
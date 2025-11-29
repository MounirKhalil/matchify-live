-- Create function to delete user and all associated data
CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id_to_delete uuid;
BEGIN
  -- Get the current user's ID
  user_id_to_delete := auth.uid();
  
  IF user_id_to_delete IS NULL THEN
    RAISE EXCEPTION 'No authenticated user found';
  END IF;

  -- Delete from candidate_profiles
  DELETE FROM public.candidate_profiles WHERE user_id = user_id_to_delete;
  
  -- Delete from recruiter_profiles
  DELETE FROM public.recruiter_profiles WHERE user_id = user_id_to_delete;
  
  -- Delete from user_roles
  DELETE FROM public.user_roles WHERE user_id = user_id_to_delete;
  
  -- Delete the auth user (this will cascade to any other related data)
  DELETE FROM auth.users WHERE id = user_id_to_delete;
END;
$$;
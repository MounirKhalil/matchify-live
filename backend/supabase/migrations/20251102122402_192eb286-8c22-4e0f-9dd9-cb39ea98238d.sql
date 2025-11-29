-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Job seekers can view recruiters for open postings" ON recruiter_profiles;

-- Create a simpler policy that allows job seekers to view all recruiter profiles
-- This is safe because recruiter profiles don't contain sensitive information
CREATE POLICY "Job seekers can view recruiter organization info"
ON recruiter_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'job_seeker'
  )
);
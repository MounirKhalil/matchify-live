-- Allow job seekers to view all open job postings
CREATE POLICY "Job seekers can view open job postings"
ON job_postings
FOR SELECT
TO authenticated
USING (
  status = 'open' AND
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'job_seeker'
  )
);
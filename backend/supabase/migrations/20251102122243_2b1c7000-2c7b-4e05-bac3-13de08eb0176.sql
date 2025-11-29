-- Allow job seekers to view recruiter profiles tied to open job postings
CREATE POLICY "Job seekers can view recruiters for open postings"
ON recruiter_profiles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'job_seeker') AND
  EXISTS (
    SELECT 1 FROM job_postings jp
    WHERE jp.recruiter_id = recruiter_profiles.id
      AND jp.status = 'open'
  )
);
-- Add RLS policy to allow candidates to create their own applications
CREATE POLICY "Candidates can create their own applications"
ON public.applications
FOR INSERT
TO authenticated
WITH CHECK (
  candidate_id IN (
    SELECT id
    FROM public.candidate_profiles
    WHERE user_id = auth.uid()
  )
);
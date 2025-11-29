-- Add RLS policies for auto_application_runs table

CREATE POLICY "Service role can manage auto application runs"
  ON public.auto_application_runs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view auto application runs"
  ON public.auto_application_runs
  FOR SELECT
  TO authenticated
  USING (true);
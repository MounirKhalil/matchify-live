-- Clean up JSONB fields in candidate_profiles table
-- Remove fields that don't exist in the UI

-- Function to clean education entries
CREATE OR REPLACE FUNCTION clean_education_entry(entry jsonb)
RETURNS jsonb AS $$
BEGIN
  RETURN jsonb_build_object(
    'institution', entry->>'institution',
    'degree', entry->>'degree',
    'field_of_study', entry->>'field_of_study',
    'start_year', entry->>'start_year',
    'end_year', entry->>'end_year',
    'location', entry->>'location',
    'gpa', entry->>'gpa',
    'description', entry->>'description'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to clean work_experience entries
CREATE OR REPLACE FUNCTION clean_work_experience_entry(entry jsonb)
RETURNS jsonb AS $$
BEGIN
  RETURN jsonb_build_object(
    'title', entry->>'title',
    'company', entry->>'company',
    'start_year', entry->>'start_year',
    'end_year', entry->>'end_year',
    'is_present', COALESCE((entry->>'is_present')::boolean, false),
    'description', entry->>'description',
    'technologies', entry->>'technologies'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to clean certificate entries (remove expiry_date and other unused fields)
CREATE OR REPLACE FUNCTION clean_certificate_entry(entry jsonb)
RETURNS jsonb AS $$
BEGIN
  RETURN jsonb_build_object(
    'name', entry->>'name',
    'issuer', entry->>'issuer',
    'date', entry->>'date',
    'credential_id', entry->>'credential_id',
    'url', entry->>'url'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to clean project entries
CREATE OR REPLACE FUNCTION clean_project_entry(entry jsonb)
RETURNS jsonb AS $$
BEGIN
  RETURN jsonb_build_object(
    'name', entry->>'name',
    'description', entry->>'description',
    'technologies', entry->>'technologies',
    'link', entry->>'link',
    'start_year', entry->>'start_year',
    'end_year', entry->>'end_year'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to clean paper entries
CREATE OR REPLACE FUNCTION clean_paper_entry(entry jsonb)
RETURNS jsonb AS $$
BEGIN
  RETURN jsonb_build_object(
    'title', entry->>'title',
    'publication', entry->>'publication',
    'date', entry->>'date',
    'link', entry->>'link',
    'description', entry->>'description'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to clean other_sections entries
CREATE OR REPLACE FUNCTION clean_other_section_entry(entry jsonb)
RETURNS jsonb AS $$
BEGIN
  RETURN jsonb_build_object(
    'title', entry->>'title',
    'description', entry->>'description'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update all existing candidate profiles to clean JSONB data
UPDATE candidate_profiles
SET 
  education = (
    SELECT jsonb_agg(clean_education_entry(elem))
    FROM jsonb_array_elements(COALESCE(education, '[]'::jsonb)) elem
  ),
  work_experience = (
    SELECT jsonb_agg(clean_work_experience_entry(elem))
    FROM jsonb_array_elements(COALESCE(work_experience, '[]'::jsonb)) elem
  ),
  certificates = (
    SELECT jsonb_agg(clean_certificate_entry(elem))
    FROM jsonb_array_elements(COALESCE(certificates, '[]'::jsonb)) elem
  ),
  projects = (
    SELECT jsonb_agg(clean_project_entry(elem))
    FROM jsonb_array_elements(COALESCE(projects, '[]'::jsonb)) elem
  ),
  papers = (
    SELECT jsonb_agg(clean_paper_entry(elem))
    FROM jsonb_array_elements(COALESCE(papers, '[]'::jsonb)) elem
  ),
  other_sections = (
    SELECT jsonb_agg(clean_other_section_entry(elem))
    FROM jsonb_array_elements(COALESCE(other_sections, '[]'::jsonb)) elem
  );

-- Add comments documenting the expected JSONB structure
COMMENT ON COLUMN candidate_profiles.education IS 'Array of education entries: [{institution, degree, field_of_study, start_year, end_year, location, gpa, description}]';
COMMENT ON COLUMN candidate_profiles.work_experience IS 'Array of work experience entries: [{title, company, start_year, end_year, is_present, description, technologies}]';
COMMENT ON COLUMN candidate_profiles.certificates IS 'Array of certificate entries: [{name, issuer, date, credential_id, url}]';
COMMENT ON COLUMN candidate_profiles.projects IS 'Array of project entries: [{name, description, technologies, link, start_year, end_year}]';
COMMENT ON COLUMN candidate_profiles.papers IS 'Array of paper entries: [{title, publication, date, link, description}]';
COMMENT ON COLUMN candidate_profiles.other_sections IS 'Array of other section entries: [{title, description}]';
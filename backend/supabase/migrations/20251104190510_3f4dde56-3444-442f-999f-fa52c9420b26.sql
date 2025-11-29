-- Fix security warnings: Set search_path for all cleaning functions

CREATE OR REPLACE FUNCTION clean_education_entry(entry jsonb)
RETURNS jsonb 
LANGUAGE plpgsql 
IMMUTABLE
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION clean_work_experience_entry(entry jsonb)
RETURNS jsonb 
LANGUAGE plpgsql 
IMMUTABLE
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION clean_certificate_entry(entry jsonb)
RETURNS jsonb 
LANGUAGE plpgsql 
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'name', entry->>'name',
    'issuer', entry->>'issuer',
    'date', entry->>'date',
    'credential_id', entry->>'credential_id',
    'url', entry->>'url'
  );
END;
$$;

CREATE OR REPLACE FUNCTION clean_project_entry(entry jsonb)
RETURNS jsonb 
LANGUAGE plpgsql 
IMMUTABLE
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION clean_paper_entry(entry jsonb)
RETURNS jsonb 
LANGUAGE plpgsql 
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'title', entry->>'title',
    'publication', entry->>'publication',
    'date', entry->>'date',
    'link', entry->>'link',
    'description', entry->>'description'
  );
END;
$$;

CREATE OR REPLACE FUNCTION clean_other_section_entry(entry jsonb)
RETURNS jsonb 
LANGUAGE plpgsql 
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'title', entry->>'title',
    'description', entry->>'description'
  );
END;
$$;
-- Insert 10 fake Lebanese female candidates with proper auth.users entries
DO $$
DECLARE
  user1_id uuid := gen_random_uuid();
  user2_id uuid := gen_random_uuid();
  user3_id uuid := gen_random_uuid();
  user4_id uuid := gen_random_uuid();
  user5_id uuid := gen_random_uuid();
  user6_id uuid := gen_random_uuid();
  user7_id uuid := gen_random_uuid();
  user8_id uuid := gen_random_uuid();
  user9_id uuid := gen_random_uuid();
  user10_id uuid := gen_random_uuid();
BEGIN
  -- Insert users into auth.users (trigger will handle user_roles and candidate_profiles creation)
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, role, aud, instance_id, confirmation_token)
  VALUES
    (user1_id, 'carla.nader@example.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"role": "job_seeker", "name": "Carla", "family_name": "Nader"}'::jsonb, 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000', ''),
    (user2_id, 'dima.saleh@example.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"role": "job_seeker", "name": "Dima", "family_name": "Saleh"}'::jsonb, 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000', ''),
    (user3_id, 'layla.haddad@example.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"role": "job_seeker", "name": "Layla", "family_name": "Haddad"}'::jsonb, 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000', ''),
    (user4_id, 'lina.matar@example.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"role": "job_seeker", "name": "Lina", "family_name": "Matar"}'::jsonb, 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000', ''),
    (user5_id, 'maya.khoury@example.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"role": "job_seeker", "name": "Maya", "family_name": "Khoury"}'::jsonb, 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000', ''),
    (user6_id, 'nadine.elkhoury@example.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"role": "job_seeker", "name": "Nadine", "family_name": "El Khoury"}'::jsonb, 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000', ''),
    (user7_id, 'nour.abboud@example.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"role": "job_seeker", "name": "Nour", "family_name": "Abboud"}'::jsonb, 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000', ''),
    (user8_id, 'rita.farah@example.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"role": "job_seeker", "name": "Rita", "family_name": "Farah"}'::jsonb, 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000', ''),
    (user9_id, 'sara.khalil@example.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"role": "job_seeker", "name": "Sara", "family_name": "Khalil"}'::jsonb, 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000', ''),
    (user10_id, 'zeina.hassan@example.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"role": "job_seeker", "name": "Zeina", "family_name": "Hassan"}'::jsonb, 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000', '');

  -- Update candidate profiles with additional details (profiles were created by trigger with basic info)
  UPDATE public.candidate_profiles SET
    phone_number = '+961 71 123 456',
    location = 'Beirut',
    country = 'Lebanon',
    profile_image_url = '/profile_images/carla_nader.png',
    preferred_categories = ARRAY['Software Development', 'Data Science']::text[],
    preferred_job_types = ARRAY['Full-time', 'Remote']::text[],
    education = '[{"institution": "American University of Beirut", "degree": "Bachelor", "field_of_study": "Computer Science", "start_year": "2016", "end_year": "2020", "gpa": "3.8"}]'::jsonb,
    work_experience = '[{"title": "Software Engineer", "company": "Tech Solutions Lebanon", "start_year": "2020", "end_year": "2023", "is_present": false, "description": "Developed web applications using React and Node.js"}]'::jsonb,
    interests = ARRAY['Machine Learning', 'Web Development', 'UI/UX Design']::text[]
  WHERE user_id = user1_id;

  UPDATE public.candidate_profiles SET
    phone_number = '+961 71 234 567',
    location = 'Jounieh',
    country = 'Lebanon',
    profile_image_url = '/profile_images/dima_saleh.png',
    preferred_categories = ARRAY['Marketing', 'Business Development']::text[],
    preferred_job_types = ARRAY['Full-time', 'Hybrid']::text[],
    education = '[{"institution": "Lebanese American University", "degree": "Bachelor", "field_of_study": "Marketing", "start_year": "2015", "end_year": "2019", "gpa": "3.6"}]'::jsonb,
    work_experience = '[{"title": "Marketing Manager", "company": "Creative Agency", "start_year": "2019", "end_year": "2024", "is_present": true, "description": "Led digital marketing campaigns and brand strategy"}]'::jsonb,
    interests = ARRAY['Digital Marketing', 'Social Media', 'Content Strategy']::text[]
  WHERE user_id = user2_id;

  UPDATE public.candidate_profiles SET
    phone_number = '+961 71 345 678',
    location = 'Tripoli',
    country = 'Lebanon',
    profile_image_url = '/profile_images/layla_haddad.png',
    preferred_categories = ARRAY['Healthcare', 'Medical']::text[],
    preferred_job_types = ARRAY['Full-time', 'On-site']::text[],
    education = '[{"institution": "Saint Joseph University", "degree": "Master", "field_of_study": "Nursing", "start_year": "2014", "end_year": "2019", "gpa": "3.9"}]'::jsonb,
    work_experience = '[{"title": "Registered Nurse", "company": "Beirut Medical Center", "start_year": "2019", "end_year": "2024", "is_present": true, "description": "Provided patient care in emergency department"}]'::jsonb,
    interests = ARRAY['Patient Care', 'Emergency Medicine', 'Healthcare Management']::text[]
  WHERE user_id = user3_id;

  UPDATE public.candidate_profiles SET
    phone_number = '+961 71 456 789',
    location = 'Sidon',
    country = 'Lebanon',
    profile_image_url = '/profile_images/lina_matar.png',
    preferred_categories = ARRAY['Finance', 'Accounting']::text[],
    preferred_job_types = ARRAY['Full-time', 'On-site']::text[],
    education = '[{"institution": "Beirut Arab University", "degree": "Bachelor", "field_of_study": "Accounting", "start_year": "2017", "end_year": "2021", "gpa": "3.7"}]'::jsonb,
    work_experience = '[{"title": "Financial Analyst", "company": "Lebanese Bank", "start_year": "2021", "end_year": "2024", "is_present": true, "description": "Analyzed financial data and prepared reports"}]'::jsonb,
    interests = ARRAY['Financial Analysis', 'Auditing', 'Risk Management']::text[]
  WHERE user_id = user4_id;

  UPDATE public.candidate_profiles SET
    phone_number = '+961 71 567 890',
    location = 'Byblos',
    country = 'Lebanon',
    profile_image_url = '/profile_images/maya_khoury.png',
    preferred_categories = ARRAY['Education', 'Teaching']::text[],
    preferred_job_types = ARRAY['Full-time', 'On-site']::text[],
    education = '[{"institution": "Lebanese University", "degree": "Master", "field_of_study": "Education", "start_year": "2013", "end_year": "2018", "gpa": "3.8"}]'::jsonb,
    work_experience = '[{"title": "English Teacher", "company": "International School of Beirut", "start_year": "2018", "end_year": "2024", "is_present": true, "description": "Taught English language and literature to high school students"}]'::jsonb,
    interests = ARRAY['Curriculum Development', 'Educational Technology', 'Student Assessment']::text[]
  WHERE user_id = user5_id;

  UPDATE public.candidate_profiles SET
    phone_number = '+961 71 678 901',
    location = 'Zahle',
    country = 'Lebanon',
    profile_image_url = '/profile_images/nadine_el_khoury.png',
    preferred_categories = ARRAY['Architecture', 'Design']::text[],
    preferred_job_types = ARRAY['Full-time', 'Hybrid']::text[],
    education = '[{"institution": "American University of Beirut", "degree": "Bachelor", "field_of_study": "Architecture", "start_year": "2015", "end_year": "2020", "gpa": "3.9"}]'::jsonb,
    work_experience = '[{"title": "Junior Architect", "company": "Design Studio Lebanon", "start_year": "2020", "end_year": "2024", "is_present": true, "description": "Designed residential and commercial buildings"}]'::jsonb,
    interests = ARRAY['AutoCAD', '3D Modeling', 'Sustainable Design']::text[]
  WHERE user_id = user6_id;

  UPDATE public.candidate_profiles SET
    phone_number = '+961 71 789 012',
    location = 'Batroun',
    country = 'Lebanon',
    profile_image_url = '/profile_images/nour_abboud.png',
    preferred_categories = ARRAY['Human Resources', 'Recruitment']::text[],
    preferred_job_types = ARRAY['Full-time', 'Hybrid']::text[],
    education = '[{"institution": "Notre Dame University", "degree": "Bachelor", "field_of_study": "Business Administration", "start_year": "2016", "end_year": "2020", "gpa": "3.6"}]'::jsonb,
    work_experience = '[{"title": "HR Specialist", "company": "Corporate Solutions", "start_year": "2020", "end_year": "2024", "is_present": true, "description": "Managed recruitment and employee relations"}]'::jsonb,
    interests = ARRAY['Talent Acquisition', 'Employee Engagement', 'Performance Management']::text[]
  WHERE user_id = user7_id;

  UPDATE public.candidate_profiles SET
    phone_number = '+961 71 890 123',
    location = 'Beirut',
    country = 'Lebanon',
    profile_image_url = '/profile_images/rita_farah.png',
    preferred_categories = ARRAY['Legal', 'Law']::text[],
    preferred_job_types = ARRAY['Full-time', 'On-site']::text[],
    education = '[{"institution": "Lebanese University", "degree": "Master", "field_of_study": "Law", "start_year": "2014", "end_year": "2019", "gpa": "3.9"}]'::jsonb,
    work_experience = '[{"title": "Legal Associate", "company": "Law Firm Lebanon", "start_year": "2019", "end_year": "2024", "is_present": true, "description": "Provided legal counsel on corporate matters"}]'::jsonb,
    interests = ARRAY['Corporate Law', 'Contract Negotiation', 'Legal Research']::text[]
  WHERE user_id = user8_id;

  UPDATE public.candidate_profiles SET
    phone_number = '+961 71 901 234',
    location = 'Beirut',
    country = 'Lebanon',
    profile_image_url = '/profile_images/sara_khalil.png',
    preferred_categories = ARRAY['Graphic Design', 'Creative']::text[],
    preferred_job_types = ARRAY['Freelance', 'Remote']::text[],
    education = '[{"institution": "Lebanese American University", "degree": "Bachelor", "field_of_study": "Graphic Design", "start_year": "2017", "end_year": "2021", "gpa": "3.8"}]'::jsonb,
    work_experience = '[{"title": "Graphic Designer", "company": "Freelance", "start_year": "2021", "end_year": "2024", "is_present": true, "description": "Created visual content for various clients"}]'::jsonb,
    interests = ARRAY['Adobe Creative Suite', 'Branding', 'Typography']::text[]
  WHERE user_id = user9_id;

  UPDATE public.candidate_profiles SET
    phone_number = '+961 71 012 345',
    location = 'Beirut',
    country = 'Lebanon',
    profile_image_url = '/profile_images/zeina_hassan.png',
    preferred_categories = ARRAY['Journalism', 'Media']::text[],
    preferred_job_types = ARRAY['Full-time', 'Hybrid']::text[],
    education = '[{"institution": "American University of Beirut", "degree": "Bachelor", "field_of_study": "Journalism", "start_year": "2016", "end_year": "2020", "gpa": "3.7"}]'::jsonb,
    work_experience = '[{"title": "Journalist", "company": "Lebanese Broadcasting Corporation", "start_year": "2020", "end_year": "2024", "is_present": true, "description": "Reported on local and regional news"}]'::jsonb,
    interests = ARRAY['Investigative Reporting', 'News Writing', 'Video Editing']::text[]
  WHERE user_id = user10_id;
END $$;
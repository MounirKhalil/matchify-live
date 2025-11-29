-- Insert 10 fake Lebanese candidate profiles
-- NOTE: Replace 'YOUR_USER_ID_HERE' with an actual user_id from auth.users or a dummy UUID
-- All profiles use the same user_id to avoid foreign key issues

-- You can generate a dummy UUID with: SELECT gen_random_uuid();
-- Or use an existing user's ID from: SELECT id FROM auth.users LIMIT 1;

-- First, let's use a placeholder - replace this with actual user_id
DO $$
DECLARE
  dummy_user_id UUID := 'REPLACE_WITH_ACTUAL_USER_ID'; -- Replace this!
BEGIN

-- 1. Karim Hassan - Software Engineer
INSERT INTO candidate_profiles (
  user_id, name, family_name, email, phone_number, location, country,
  profile_image_url, preferred_categories, preferred_job_types,
  education, work_experience, interests
) VALUES (
  dummy_user_id, 'Karim', 'Hassan', 'karim.hassan@email.com', '+961 3 123 456',
  'Beirut', 'Lebanon',
  'https://mwqjyukczekhnimillfn.supabase.co/storage/v1/object/public/profile_images/karim_hassan.png',
  ARRAY['Software Development', 'Full Stack Development'],
  ARRAY['Full-time', 'Remote'],
  '[{"institution": "American University of Beirut", "degree": "Bachelor", "field_of_study": "Computer Science", "start_year": "2015", "end_year": "2019"}]'::jsonb,
  '[{"title": "Software Engineer", "company": "Tech Lebanon", "start_year": "2019", "end_year": "2023", "is_present": false, "description": "Developed web applications using React and Node.js"}]'::jsonb,
  ARRAY['Web Development', 'AI', 'Gaming']
);

-- 2. Tarek Khalil - Data Scientist
INSERT INTO candidate_profiles (
  user_id, name, family_name, email, phone_number, location, country,
  profile_image_url, preferred_categories, preferred_job_types,
  education, work_experience, interests
) VALUES (
  dummy_user_id, 'Tarek', 'Khalil', 'tarek.khalil@email.com', '+961 3 234 567',
  'Jounieh', 'Lebanon',
  'https://mwqjyukczekhnimillfn.supabase.co/storage/v1/object/public/profile_images/tarek_khalil.png',
  ARRAY['Data Science & Analytics', 'Artificial Intelligence & Machine Learning'],
  ARRAY['Full-time', 'Hybrid'],
  '[{"institution": "Lebanese American University", "degree": "Master", "field_of_study": "Data Science", "start_year": "2017", "end_year": "2019"}]'::jsonb,
  '[{"title": "Data Scientist", "company": "Analytics Hub", "start_year": "2019", "end_year": "", "is_present": true, "description": "Built ML models for predictive analytics"}]'::jsonb,
  ARRAY['Machine Learning', 'Statistics', 'Data Visualization']
);

-- 3. Rami Abboud - Graphic Designer
INSERT INTO candidate_profiles (
  user_id, name, family_name, email, phone_number, location, country,
  profile_image_url, preferred_categories, preferred_job_types,
  education, work_experience, interests
) VALUES (
  dummy_user_id, 'Rami', 'Abboud', 'rami.abboud@email.com', '+961 3 345 678',
  'Tripoli', 'Lebanon',
  'https://mwqjyukczekhnimillfn.supabase.co/storage/v1/object/public/profile_images/rami_abboud.png',
  ARRAY['Graphic Design', 'UI/UX Design'],
  ARRAY['Full-time', 'Freelance'],
  '[{"institution": "Notre Dame University", "degree": "Bachelor", "field_of_study": "Graphic Design", "start_year": "2016", "end_year": "2020"}]'::jsonb,
  '[{"title": "Senior Graphic Designer", "company": "Creative Studio", "start_year": "2020", "end_year": "", "is_present": true, "description": "Created brand identities and marketing materials"}]'::jsonb,
  ARRAY['Design', 'Photography', 'Art']
);

-- 4. Elie Nader - Marketing Manager
INSERT INTO candidate_profiles (
  user_id, name, family_name, email, phone_number, location, country,
  profile_image_url, preferred_categories, preferred_job_types,
  education, work_experience, interests
) VALUES (
  dummy_user_id, 'Elie', 'Nader', 'elie.nader@email.com', '+961 3 456 789',
  'Beirut', 'Lebanon',
  'https://mwqjyukczekhnimillfn.supabase.co/storage/v1/object/public/profile_images/elie_nader.png',
  ARRAY['Digital Marketing', 'Content Marketing'],
  ARRAY['Full-time'],
  '[{"institution": "Saint Joseph University", "degree": "Bachelor", "field_of_study": "Marketing", "start_year": "2014", "end_year": "2018"}]'::jsonb,
  '[{"title": "Marketing Manager", "company": "Brandify", "start_year": "2018", "end_year": "", "is_present": true, "description": "Led digital marketing campaigns and social media strategy"}]'::jsonb,
  ARRAY['Marketing', 'Social Media', 'Content Creation']
);

-- 5. Youssef Matar - Mechanical Engineer
INSERT INTO candidate_profiles (
  user_id, name, family_name, email, phone_number, location, country,
  profile_image_url, preferred_categories, preferred_job_types,
  education, work_experience, interests
) VALUES (
  dummy_user_id, 'Youssef', 'Matar', 'youssef.matar@email.com', '+961 3 567 890',
  'Sidon', 'Lebanon',
  'https://mwqjyukczekhnimillfn.supabase.co/storage/v1/object/public/profile_images/youssef_matar.png',
  ARRAY['Mechanical Engineering', 'Manufacturing'],
  ARRAY['Full-time'],
  '[{"institution": "Lebanese University", "degree": "Bachelor", "field_of_study": "Mechanical Engineering", "start_year": "2013", "end_year": "2018"}]'::jsonb,
  '[{"title": "Mechanical Engineer", "company": "Industrial Solutions", "start_year": "2018", "end_year": "", "is_present": true, "description": "Designed and optimized manufacturing processes"}]'::jsonb,
  ARRAY['Engineering', 'Robotics', 'Innovation']
);

-- 6. Fadi Saleh - Product Manager
INSERT INTO candidate_profiles (
  user_id, name, family_name, email, phone_number, location, country,
  profile_image_url, preferred_categories, preferred_job_types,
  education, work_experience, interests
) VALUES (
  dummy_user_id, 'Fadi', 'Saleh', 'fadi.saleh@email.com', '+961 3 678 901',
  'Zahle', 'Lebanon',
  'https://mwqjyukczekhnimillfn.supabase.co/storage/v1/object/public/profile_images/fadi_saleh.png',
  ARRAY['Product Management', 'Business Analysis'],
  ARRAY['Full-time', 'Hybrid'],
  '[{"institution": "American University of Beirut", "degree": "MBA", "field_of_study": "Business Administration", "start_year": "2018", "end_year": "2020"}]'::jsonb,
  '[{"title": "Product Manager", "company": "Tech Innovations", "start_year": "2020", "end_year": "", "is_present": true, "description": "Led product development from conception to launch"}]'::jsonb,
  ARRAY['Product Strategy', 'Startups', 'Technology']
);

-- 7. Nabil Haddad - Cybersecurity Analyst
INSERT INTO candidate_profiles (
  user_id, name, family_name, email, phone_number, location, country,
  profile_image_url, preferred_categories, preferred_job_types,
  education, work_experience, interests
) VALUES (
  dummy_user_id, 'Nabil', 'Haddad', 'nabil.haddad@email.com', '+961 3 789 012',
  'Beirut', 'Lebanon',
  'https://mwqjyukczekhnimillfn.supabase.co/storage/v1/object/public/profile_images/nabil_haddad.png',
  ARRAY['Cybersecurity', 'Information Security'],
  ARRAY['Full-time', 'Remote'],
  '[{"institution": "Balamand University", "degree": "Bachelor", "field_of_study": "Computer Engineering", "start_year": "2015", "end_year": "2019"}]'::jsonb,
  '[{"title": "Cybersecurity Analyst", "company": "SecureNet", "start_year": "2019", "end_year": "", "is_present": true, "description": "Monitored networks and implemented security protocols"}]'::jsonb,
  ARRAY['Security', 'Ethical Hacking', 'Privacy']
);

-- 8. Georges Karam - Finance Manager
INSERT INTO candidate_profiles (
  user_id, name, family_name, email, phone_number, location, country,
  profile_image_url, preferred_categories, preferred_job_types,
  education, work_experience, interests
) VALUES (
  dummy_user_id, 'Georges', 'Karam', 'georges.karam@email.com', '+961 3 890 123',
  'Batroun', 'Lebanon',
  'https://mwqjyukczekhnimillfn.supabase.co/storage/v1/object/public/profile_images/georges_karam.png',
  ARRAY['Finance & Accounting', 'Financial Analysis'],
  ARRAY['Full-time'],
  '[{"institution": "Holy Spirit University", "degree": "Bachelor", "field_of_study": "Finance", "start_year": "2014", "end_year": "2018"}]'::jsonb,
  '[{"title": "Finance Manager", "company": "Bank of Lebanon", "start_year": "2018", "end_year": "", "is_present": true, "description": "Managed financial planning and analysis"}]'::jsonb,
  ARRAY['Finance', 'Investment', 'Economics']
);

-- 9. Michel Farah - DevOps Engineer
INSERT INTO candidate_profiles (
  user_id, name, family_name, email, phone_number, location, country,
  profile_image_url, preferred_categories, preferred_job_types,
  education, work_experience, interests
) VALUES (
  dummy_user_id, 'Michel', 'Farah', 'michel.farah@email.com', '+961 3 901 234',
  'Byblos', 'Lebanon',
  'https://mwqjyukczekhnimillfn.supabase.co/storage/v1/object/public/profile_images/michel_farah.png',
  ARRAY['DevOps & Cloud Engineering', 'System Administration'],
  ARRAY['Full-time', 'Remote'],
  '[{"institution": "Lebanese American University", "degree": "Bachelor", "field_of_study": "Computer Science", "start_year": "2016", "end_year": "2020"}]'::jsonb,
  '[{"title": "DevOps Engineer", "company": "CloudTech", "start_year": "2020", "end_year": "", "is_present": true, "description": "Managed CI/CD pipelines and cloud infrastructure"}]'::jsonb,
  ARRAY['Cloud Computing', 'Automation', 'Linux']
);

-- 10. Samir El Khoury - Civil Engineer
INSERT INTO candidate_profiles (
  user_id, name, family_name, email, phone_number, location, country,
  profile_image_url, preferred_categories, preferred_job_types,
  education, work_experience, interests
) VALUES (
  dummy_user_id, 'Samir', 'El Khoury', 'samir.elkhoury@email.com', '+961 3 012 345',
  'Jounieh', 'Lebanon',
  'https://mwqjyukczekhnimillfn.supabase.co/storage/v1/object/public/profile_images/samir_el_khoury.png',
  ARRAY['Civil Engineering', 'Architecture'],
  ARRAY['Full-time'],
  '[{"institution": "American University of Beirut", "degree": "Bachelor", "field_of_study": "Civil Engineering", "start_year": "2012", "end_year": "2017"}]'::jsonb,
  '[{"title": "Civil Engineer", "company": "Construction Masters", "start_year": "2017", "end_year": "", "is_present": true, "description": "Supervised construction projects and structural designs"}]'::jsonb,
  ARRAY['Construction', 'Architecture', 'Urban Planning']
);

END $$;

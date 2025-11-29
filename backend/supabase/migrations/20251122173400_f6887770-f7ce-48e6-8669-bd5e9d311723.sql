-- Create 10 diverse job openings for Veltow
INSERT INTO public.job_postings (
  recruiter_id,
  job_title,
  public_information,
  requirements,
  categories,
  status
) VALUES
(
  'c1c84e60-a5f3-4c3d-87be-90457de09626',
  'Senior Full Stack Developer',
  'Join our innovative tech team to build cutting-edge web applications using React, Node.js, and cloud technologies.',
  '[
    {"requirement": "5+ years experience in full-stack development"},
    {"requirement": "Proficiency in React, Node.js, TypeScript"},
    {"requirement": "Experience with AWS or Azure"},
    {"requirement": "Strong problem-solving skills"}
  ]'::jsonb,
  ARRAY['Software Development', 'Technology']::text[],
  'open'
),
(
  'c1c84e60-a5f3-4c3d-87be-90457de09626',
  'Digital Marketing Manager',
  'Lead our digital marketing initiatives and drive growth through innovative campaigns across multiple channels.',
  '[
    {"requirement": "3+ years in digital marketing"},
    {"requirement": "Experience with SEO, SEM, and social media marketing"},
    {"requirement": "Strong analytical and data-driven mindset"},
    {"requirement": "Excellent communication skills"}
  ]'::jsonb,
  ARRAY['Marketing', 'Business Development']::text[],
  'open'
),
(
  'c1c84e60-a5f3-4c3d-87be-90457de09626',
  'UX/UI Designer',
  'Create beautiful and intuitive user experiences for our digital products. Work closely with product and engineering teams.',
  '[
    {"requirement": "3+ years of UX/UI design experience"},
    {"requirement": "Proficiency in Figma, Adobe XD, or Sketch"},
    {"requirement": "Strong portfolio showcasing web and mobile designs"},
    {"requirement": "Understanding of design systems and accessibility"}
  ]'::jsonb,
  ARRAY['Design', 'Creative']::text[],
  'open'
),
(
  'c1c84e60-a5f3-4c3d-87be-90457de09626',
  'Data Analyst',
  'Transform data into actionable insights. Help drive business decisions through comprehensive data analysis and visualization.',
  '[
    {"requirement": "2+ years experience in data analysis"},
    {"requirement": "Proficiency in SQL, Python, and BI tools (Tableau/Power BI)"},
    {"requirement": "Strong statistical analysis skills"},
    {"requirement": "Bachelor degree in relevant field"}
  ]'::jsonb,
  ARRAY['Data Science', 'Analytics']::text[],
  'open'
),
(
  'c1c84e60-a5f3-4c3d-87be-90457de09626',
  'HR Business Partner',
  'Partner with business leaders to develop and implement HR strategies that support organizational goals and foster employee engagement.',
  '[
    {"requirement": "4+ years of HR experience"},
    {"requirement": "Experience in talent management and employee relations"},
    {"requirement": "Strong interpersonal and communication skills"},
    {"requirement": "Bachelor degree in HR or related field"}
  ]'::jsonb,
  ARRAY['Human Resources', 'Management']::text[],
  'open'
),
(
  'c1c84e60-a5f3-4c3d-87be-90457de09626',
  'Financial Controller',
  'Oversee financial operations, ensure compliance, and provide strategic financial guidance to senior management.',
  '[
    {"requirement": "5+ years in financial management"},
    {"requirement": "CPA or equivalent certification preferred"},
    {"requirement": "Experience with financial reporting and compliance"},
    {"requirement": "Strong analytical and leadership skills"}
  ]'::jsonb,
  ARRAY['Finance', 'Accounting']::text[],
  'open'
),
(
  'c1c84e60-a5f3-4c3d-87be-90457de09626',
  'DevOps Engineer',
  'Build and maintain our cloud infrastructure, implement CI/CD pipelines, and ensure system reliability and scalability.',
  '[
    {"requirement": "3+ years of DevOps experience"},
    {"requirement": "Expertise in Docker, Kubernetes, and CI/CD tools"},
    {"requirement": "Experience with AWS, Azure, or GCP"},
    {"requirement": "Strong scripting skills (Bash, Python)"}
  ]'::jsonb,
  ARRAY['Software Development', 'Infrastructure']::text[],
  'open'
),
(
  'c1c84e60-a5f3-4c3d-87be-90457de09626',
  'Content Writer',
  'Craft compelling content for our blog, website, and marketing materials. Help tell our brand story and engage our audience.',
  '[
    {"requirement": "2+ years of content writing experience"},
    {"requirement": "Excellent writing and editing skills"},
    {"requirement": "Understanding of SEO best practices"},
    {"requirement": "Ability to adapt tone for different audiences"}
  ]'::jsonb,
  ARRAY['Content', 'Marketing']::text[],
  'open'
),
(
  'c1c84e60-a5f3-4c3d-87be-90457de09626',
  'Customer Success Manager',
  'Build strong relationships with clients, ensure customer satisfaction, and drive product adoption and retention.',
  '[
    {"requirement": "3+ years in customer success or account management"},
    {"requirement": "Excellent communication and problem-solving skills"},
    {"requirement": "Experience with CRM tools (Salesforce, HubSpot)"},
    {"requirement": "Customer-centric mindset"}
  ]'::jsonb,
  ARRAY['Customer Service', 'Account Management']::text[],
  'open'
),
(
  'c1c84e60-a5f3-4c3d-87be-90457de09626',
  'Product Manager',
  'Define product vision and strategy, prioritize features, and work cross-functionally to deliver exceptional products to market.',
  '[
    {"requirement": "4+ years of product management experience"},
    {"requirement": "Strong analytical and strategic thinking"},
    {"requirement": "Experience with agile methodologies"},
    {"requirement": "Excellent stakeholder management skills"}
  ]'::jsonb,
  ARRAY['Product Management', 'Technology']::text[],
  'open'
);
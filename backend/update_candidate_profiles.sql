-- Update all candidate profiles with comprehensive work experience, projects, and certificates

-- Carla Nader - Software Engineer
UPDATE candidate_profiles SET
  work_experience = '[
    {"title": "Senior Software Engineer", "company": "Tech Solutions Lebanon", "start_year": "2022", "end_year": "", "is_present": true, "description": "Leading frontend development team, architecting scalable React applications with TypeScript", "technologies": "React, TypeScript, Node.js, AWS"},
    {"title": "Software Engineer", "company": "Tech Solutions Lebanon", "start_year": "2020", "end_year": "2022", "is_present": false, "description": "Developed web applications using React and Node.js", "technologies": "React, Node.js, MongoDB"},
    {"title": "Junior Developer", "company": "Digital Innovations", "start_year": "2019", "end_year": "2020", "is_present": false, "description": "Built responsive websites and maintained legacy systems", "technologies": "JavaScript, HTML, CSS, jQuery"}
  ]'::jsonb,
  projects = '[
    {"name": "E-Commerce Platform", "description": "Built a full-stack e-commerce platform with payment integration and inventory management", "technologies": "React, Node.js, Stripe, PostgreSQL", "link": "https://github.com/carla/ecommerce", "start_year": "2023", "end_year": "2024"},
    {"name": "Real-Time Chat Application", "description": "Developed a real-time messaging app with WebSocket support", "technologies": "React, Socket.io, Express", "link": "https://github.com/carla/chat-app", "start_year": "2022", "end_year": "2023"}
  ]'::jsonb,
  certificates = '[
    {"name": "AWS Certified Solutions Architect", "issuer": "Amazon Web Services", "date": "2023", "credential_id": "AWS-CSA-2023", "url": "https://aws.amazon.com/certification/"},
    {"name": "React Professional Certificate", "issuer": "Meta", "date": "2022", "credential_id": "META-RC-2022", "url": "https://www.coursera.org/meta"}
  ]'::jsonb
WHERE name = 'Carla' AND family_name = 'Nader';

-- Dima Saleh - Marketing Manager
UPDATE candidate_profiles SET
  work_experience = '[
    {"title": "Senior Marketing Manager", "company": "Creative Agency", "start_year": "2023", "end_year": "", "is_present": true, "description": "Leading marketing strategy and team of 5, managing $500K annual budget", "technologies": "Google Analytics, HubSpot, Adobe Creative Suite"},
    {"title": "Marketing Manager", "company": "Creative Agency", "start_year": "2019", "end_year": "2023", "is_present": false, "description": "Led digital marketing campaigns and brand strategy", "technologies": "Facebook Ads, Google Ads, SEO"},
    {"title": "Marketing Specialist", "company": "Brand Studio", "start_year": "2017", "end_year": "2019", "is_present": false, "description": "Managed social media accounts and content creation", "technologies": "Social Media Marketing, Content Management"}
  ]'::jsonb,
  projects = '[
    {"name": "Brand Transformation Campaign", "description": "Led complete rebrand for major Lebanese retail chain, increasing brand awareness by 45%", "technologies": "Brand Strategy, Digital Marketing", "start_year": "2023", "end_year": "2024"},
    {"name": "Influencer Marketing Platform", "description": "Launched influencer marketing program connecting 50+ local influencers with brands", "technologies": "Partnership Management, Analytics", "start_year": "2022", "end_year": "2023"}
  ]'::jsonb,
  certificates = '[
    {"name": "Google Analytics Certification", "issuer": "Google", "date": "2023", "credential_id": "GA-2023", "url": "https://skillshop.withgoogle.com"},
    {"name": "Digital Marketing Professional", "issuer": "HubSpot Academy", "date": "2022", "credential_id": "HUB-DMP-2022", "url": "https://academy.hubspot.com"},
    {"name": "Facebook Blueprint Certification", "issuer": "Meta", "date": "2021", "credential_id": "FB-BC-2021", "url": "https://www.facebook.com/business/learn"}
  ]'::jsonb
WHERE name = 'Dima' AND family_name = 'Saleh';

-- Elie Nader - Marketing Manager
UPDATE candidate_profiles SET
  work_experience = '[
    {"title": "Marketing Director", "company": "Brandify", "start_year": "2022", "end_year": "", "is_present": true, "description": "Leading marketing department, developing omnichannel strategies", "technologies": "Marketing Automation, CRM, Analytics"},
    {"title": "Marketing Manager", "company": "Brandify", "start_year": "2018", "end_year": "2022", "is_present": false, "description": "Led digital marketing campaigns and social media strategy", "technologies": "Social Media, Content Marketing"},
    {"title": "Digital Marketing Coordinator", "company": "Media Plus", "start_year": "2016", "end_year": "2018", "is_present": false, "description": "Coordinated digital campaigns across multiple channels", "technologies": "Email Marketing, PPC"}
  ]'::jsonb,
  projects = '[
    {"name": "Multi-Channel Marketing Campaign", "description": "Orchestrated integrated campaign across digital and traditional channels, achieving 200% ROI", "technologies": "Campaign Management, Analytics", "start_year": "2023", "end_year": "2024"},
    {"name": "Customer Loyalty Program", "description": "Designed and launched loyalty program increasing customer retention by 35%", "technologies": "CRM, Data Analytics", "start_year": "2021", "end_year": "2022"}
  ]'::jsonb,
  certificates = '[
    {"name": "Professional Certified Marketer", "issuer": "American Marketing Association", "date": "2023", "credential_id": "AMA-PCM-2023", "url": "https://www.ama.org"},
    {"name": "Content Marketing Certification", "issuer": "Content Marketing Institute", "date": "2021", "credential_id": "CMI-2021", "url": "https://contentmarketinginstitute.com"}
  ]'::jsonb,
  education = '[
    {"institution": "Saint Joseph University", "degree": "Bachelor", "field_of_study": "Marketing", "start_year": "2014", "end_year": "2018", "gpa": "3.7"},
    {"institution": "Lebanese American University", "degree": "Marketing Analytics Certificate", "field_of_study": "Data Analytics", "start_year": "2020", "end_year": "2021"}
  ]'::jsonb
WHERE name = 'Elie' AND family_name = 'Nader';

-- Fadi Saleh - Product Manager
UPDATE candidate_profiles SET
  work_experience = '[
    {"title": "Senior Product Manager", "company": "Tech Innovations", "start_year": "2023", "end_year": "", "is_present": true, "description": "Leading product strategy for SaaS platform serving 10K+ users", "technologies": "Product Management, Agile, Jira"},
    {"title": "Product Manager", "company": "Tech Innovations", "start_year": "2020", "end_year": "2023", "is_present": false, "description": "Led product development from conception to launch", "technologies": "Roadmapping, User Research, Analytics"},
    {"title": "Product Analyst", "company": "Startup Hub", "start_year": "2018", "end_year": "2020", "is_present": false, "description": "Analyzed user data and provided insights for product decisions", "technologies": "SQL, Python, Data Analysis"}
  ]'::jsonb,
  projects = '[
    {"name": "Mobile App Launch", "description": "Led development and launch of mobile app, achieving 50K downloads in first 3 months", "technologies": "Product Strategy, Mobile Development", "start_year": "2023", "end_year": "2024"},
    {"name": "Feature Optimization Initiative", "description": "Redesigned core features based on user feedback, increasing engagement by 60%", "technologies": "A/B Testing, User Research", "start_year": "2022", "end_year": "2023"},
    {"name": "API Platform Development", "description": "Launched API platform enabling third-party integrations", "technologies": "API Design, Developer Experience", "start_year": "2021", "end_year": "2022"}
  ]'::jsonb,
  certificates = '[
    {"name": "Certified Scrum Product Owner", "issuer": "Scrum Alliance", "date": "2023", "credential_id": "CSPO-2023", "url": "https://www.scrumalliance.org"},
    {"name": "Product Management Certificate", "issuer": "Product School", "date": "2021", "credential_id": "PS-PM-2021", "url": "https://productschool.com"}
  ]'::jsonb
WHERE name = 'Fadi' AND family_name = 'Saleh';

-- Georges Karam - Finance Manager
UPDATE candidate_profiles SET
  work_experience = '[
    {"title": "Senior Finance Manager", "company": "Bank of Lebanon", "start_year": "2021", "end_year": "", "is_present": true, "description": "Managing financial operations, budgeting, and forecasting for corporate banking division", "technologies": "SAP, Excel, Financial Modeling"},
    {"title": "Finance Manager", "company": "Bank of Lebanon", "start_year": "2018", "end_year": "2021", "is_present": false, "description": "Managed financial planning and analysis", "technologies": "Financial Reporting, Budgeting"},
    {"title": "Financial Analyst", "company": "Investment Group", "start_year": "2016", "end_year": "2018", "is_present": false, "description": "Conducted financial analysis and prepared investment reports", "technologies": "Financial Analysis, Valuation"}
  ]'::jsonb,
  projects = '[
    {"name": "Cost Optimization Program", "description": "Implemented cost reduction initiative saving $2M annually", "technologies": "Financial Analysis, Process Improvement", "start_year": "2023", "end_year": "2024"},
    {"name": "Financial Reporting Automation", "description": "Automated monthly financial reports, reducing processing time by 70%", "technologies": "Excel VBA, Power BI", "start_year": "2022", "end_year": "2023"}
  ]'::jsonb,
  certificates = '[
    {"name": "Certified Public Accountant (CPA)", "issuer": "AICPA", "date": "2022", "credential_id": "CPA-2022", "url": "https://www.aicpa.org"},
    {"name": "Financial Risk Manager", "issuer": "GARP", "date": "2021", "credential_id": "FRM-2021", "url": "https://www.garp.org"},
    {"name": "Chartered Financial Analyst Level II", "issuer": "CFA Institute", "date": "2023", "credential_id": "CFA-L2-2023", "url": "https://www.cfainstitute.org"}
  ]'::jsonb,
  education = '[
    {"institution": "Holy Spirit University", "degree": "Bachelor", "field_of_study": "Finance", "start_year": "2014", "end_year": "2018", "gpa": "3.8"},
    {"institution": "American University of Beirut", "degree": "Master of Finance", "field_of_study": "Corporate Finance", "start_year": "2019", "end_year": "2021", "gpa": "3.9"}
  ]'::jsonb
WHERE name = 'Georges' AND family_name = 'Karam';

-- Karim Hassan - Data Scientist
UPDATE candidate_profiles SET
  work_experience = '[
    {"title": "Senior Data Scientist", "company": "Analytics Pro", "start_year": "2022", "end_year": "", "is_present": true, "description": "Leading ML initiatives, building predictive models for business intelligence", "technologies": "Python, TensorFlow, AWS SageMaker"},
    {"title": "Data Scientist", "company": "Data Insights", "start_year": "2019", "end_year": "2022", "is_present": false, "description": "Developed machine learning models for customer analytics", "technologies": "Python, Scikit-learn, SQL"},
    {"title": "Data Analyst", "company": "Tech Corp", "start_year": "2017", "end_year": "2019", "is_present": false, "description": "Analyzed business data and created dashboards", "technologies": "SQL, Tableau, Excel"}
  ]'::jsonb,
  projects = '[
    {"name": "Customer Churn Prediction", "description": "Built ML model predicting customer churn with 92% accuracy, saving $1M in retention costs", "technologies": "Python, XGBoost, AWS", "link": "https://github.com/karim/churn-prediction", "start_year": "2023", "end_year": "2024"},
    {"name": "Recommendation Engine", "description": "Developed personalized recommendation system increasing user engagement by 40%", "technologies": "Python, TensorFlow, Collaborative Filtering", "link": "https://github.com/karim/recommender", "start_year": "2022", "end_year": "2023"},
    {"name": "NLP Sentiment Analysis", "description": "Created sentiment analysis tool processing 100K+ social media posts daily", "technologies": "Python, NLTK, spaCy", "start_year": "2021", "end_year": "2022"}
  ]'::jsonb,
  certificates = '[
    {"name": "TensorFlow Developer Certificate", "issuer": "Google", "date": "2023", "credential_id": "TF-DEV-2023", "url": "https://www.tensorflow.org/certificate"},
    {"name": "AWS Certified Machine Learning", "issuer": "Amazon Web Services", "date": "2022", "credential_id": "AWS-ML-2022", "url": "https://aws.amazon.com/certification/"},
    {"name": "Deep Learning Specialization", "issuer": "DeepLearning.AI", "date": "2021", "credential_id": "DL-SPEC-2021", "url": "https://www.deeplearning.ai"}
  ]'::jsonb
WHERE name = 'Karim' AND family_name = 'Hassan';

-- Layla Haddad - UX Designer
UPDATE candidate_profiles SET
  work_experience = '[
    {"title": "Senior UX Designer", "company": "Design Studio", "start_year": "2021", "end_year": "", "is_present": true, "description": "Leading UX design for mobile and web applications, managing design system", "technologies": "Figma, Adobe XD, User Research"},
    {"title": "UX Designer", "company": "Creative Hub", "start_year": "2018", "end_year": "2021", "is_present": false, "description": "Designed user interfaces and conducted usability testing", "technologies": "Sketch, InVision, Prototyping"},
    {"title": "UI Designer", "company": "Digital Agency", "start_year": "2016", "end_year": "2018", "is_present": false, "description": "Created visual designs for websites and mobile apps", "technologies": "Photoshop, Illustrator"}
  ]'::jsonb,
  projects = '[
    {"name": "Banking App Redesign", "description": "Led complete redesign of mobile banking app, improving user satisfaction by 85%", "technologies": "Figma, User Testing, Design System", "start_year": "2023", "end_year": "2024"},
    {"name": "E-Learning Platform UX", "description": "Designed intuitive learning platform used by 20K+ students", "technologies": "User Research, Wireframing, Prototyping", "start_year": "2022", "end_year": "2023"},
    {"name": "Design System Creation", "description": "Built comprehensive design system adopted across 5 products", "technologies": "Figma, Component Library", "start_year": "2021", "end_year": "2022"}
  ]'::jsonb,
  certificates = '[
    {"name": "Google UX Design Certificate", "issuer": "Google", "date": "2023", "credential_id": "GUX-2023", "url": "https://grow.google/uxdesign"},
    {"name": "Interaction Design Specialization", "issuer": "UC San Diego", "date": "2021", "credential_id": "IXD-2021", "url": "https://www.coursera.org"}
  ]'::jsonb
WHERE name = 'Layla' AND family_name = 'Haddad';

-- Lina Matar - HR Manager
UPDATE candidate_profiles SET
  work_experience = '[
    {"title": "HR Director", "company": "Corporate Solutions", "start_year": "2022", "end_year": "", "is_present": true, "description": "Leading HR strategy and operations for 200+ employees, overseeing recruitment and talent development", "technologies": "HR Management, Recruitment, Performance Management"},
    {"title": "HR Manager", "company": "Business Group", "start_year": "2019", "end_year": "2022", "is_present": false, "description": "Managed recruitment, onboarding, and employee relations", "technologies": "ATS, HRIS, Employee Engagement"},
    {"title": "HR Specialist", "company": "Startup Inc", "start_year": "2017", "end_year": "2019", "is_present": false, "description": "Supported hiring processes and maintained HR records", "technologies": "Recruiting, HR Administration"}
  ]'::jsonb,
  projects = '[
    {"name": "Talent Acquisition Program", "description": "Implemented new recruitment strategy reducing time-to-hire by 40%", "technologies": "ATS, Employer Branding", "start_year": "2023", "end_year": "2024"},
    {"name": "Employee Engagement Initiative", "description": "Launched engagement program increasing employee satisfaction scores by 30%", "technologies": "Surveys, Culture Building", "start_year": "2022", "end_year": "2023"}
  ]'::jsonb,
  certificates = '[
    {"name": "SHRM-CP Certification", "issuer": "SHRM", "date": "2022", "credential_id": "SHRM-CP-2022", "url": "https://www.shrm.org"},
    {"name": "Talent Acquisition Specialist", "issuer": "LinkedIn", "date": "2021", "credential_id": "LI-TAS-2021", "url": "https://www.linkedin.com/learning"}
  ]'::jsonb
WHERE name = 'Lina' AND family_name = 'Matar';

-- Maya Khoury - Graphic Designer
UPDATE candidate_profiles SET
  work_experience = '[
    {"title": "Senior Graphic Designer", "company": "Creative Studio", "start_year": "2021", "end_year": "", "is_present": true, "description": "Creating visual identities and marketing materials for major brands", "technologies": "Adobe Creative Suite, Branding, Print Design"},
    {"title": "Graphic Designer", "company": "Marketing Agency", "start_year": "2018", "end_year": "2021", "is_present": false, "description": "Designed logos, brochures, and digital assets", "technologies": "Illustrator, Photoshop, InDesign"},
    {"title": "Junior Designer", "company": "Print Shop", "start_year": "2016", "end_year": "2018", "is_present": false, "description": "Assisted with design projects and production", "technologies": "Design Software, Print Production"}
  ]'::jsonb,
  projects = '[
    {"name": "Restaurant Brand Identity", "description": "Created complete brand identity for upscale restaurant chain", "technologies": "Branding, Logo Design, Print Collateral", "start_year": "2023", "end_year": "2024"},
    {"name": "Magazine Design", "description": "Designed monthly lifestyle magazine with 50K circulation", "technologies": "InDesign, Typography, Layout", "start_year": "2022", "end_year": "2023"},
    {"name": "Packaging Design Collection", "description": "Developed product packaging for 15+ consumer products", "technologies": "Packaging Design, 3D Mockups", "start_year": "2021", "end_year": "2022"}
  ]'::jsonb,
  certificates = '[
    {"name": "Adobe Certified Professional", "issuer": "Adobe", "date": "2023", "credential_id": "ACP-2023", "url": "https://www.adobe.com/certification"},
    {"name": "Brand Identity Design", "issuer": "Skillshare", "date": "2021", "credential_id": "SK-BID-2021", "url": "https://www.skillshare.com"}
  ]'::jsonb
WHERE name = 'Maya' AND family_name = 'Khoury';

-- Michel Farah - Civil Engineer
UPDATE candidate_profiles SET
  work_experience = '[
    {"title": "Senior Civil Engineer", "company": "Construction Leaders", "start_year": "2021", "end_year": "", "is_present": true, "description": "Managing large-scale infrastructure projects, overseeing teams of 20+ engineers", "technologies": "AutoCAD, Civil 3D, Project Management"},
    {"title": "Civil Engineer", "company": "Engineering Firm", "start_year": "2017", "end_year": "2021", "is_present": false, "description": "Designed and supervised construction of buildings and roads", "technologies": "Structural Analysis, CAD, Site Management"},
    {"title": "Junior Engineer", "company": "Design Studio", "start_year": "2015", "end_year": "2017", "is_present": false, "description": "Assisted with structural calculations and drawings", "technologies": "AutoCAD, Structural Design"}
  ]'::jsonb,
  projects = '[
    {"name": "Highway Expansion Project", "description": "Led engineering design for 15km highway expansion project", "technologies": "Civil 3D, Geotechnical Engineering", "start_year": "2023", "end_year": "2024"},
    {"name": "Commercial Tower Development", "description": "Managed structural design for 30-story commercial building", "technologies": "Structural Analysis, ETABS", "start_year": "2021", "end_year": "2022"},
    {"name": "Bridge Rehabilitation", "description": "Designed rehabilitation plan for historic bridge infrastructure", "technologies": "Structural Engineering, Safety Analysis", "start_year": "2020", "end_year": "2021"}
  ]'::jsonb,
  certificates = '[
    {"name": "Professional Engineer License", "issuer": "Order of Engineers", "date": "2020", "credential_id": "PE-2020", "url": "https://www.oea.org.lb"},
    {"name": "PMP Certification", "issuer": "PMI", "date": "2022", "credential_id": "PMP-2022", "url": "https://www.pmi.org"}
  ]'::jsonb
WHERE name = 'Michel' AND family_name = 'Farah';

-- Nabil Haddad - Operations Manager
UPDATE candidate_profiles SET
  work_experience = '[
    {"title": "Operations Director", "company": "Logistics Corp", "start_year": "2022", "end_year": "", "is_present": true, "description": "Overseeing operations across 3 facilities, managing supply chain and logistics", "technologies": "Operations Management, ERP, Supply Chain"},
    {"title": "Operations Manager", "company": "Manufacturing Co", "start_year": "2018", "end_year": "2022", "is_present": false, "description": "Managed production operations and team of 50+ employees", "technologies": "Lean Manufacturing, Process Optimization"},
    {"title": "Operations Coordinator", "company": "Distribution Center", "start_year": "2016", "end_year": "2018", "is_present": false, "description": "Coordinated daily operations and inventory management", "technologies": "Inventory Management, Scheduling"}
  ]'::jsonb,
  projects = '[
    {"name": "Warehouse Automation", "description": "Implemented automated systems reducing operational costs by 35%", "technologies": "WMS, Automation, Process Improvement", "start_year": "2023", "end_year": "2024"},
    {"name": "Supply Chain Optimization", "description": "Redesigned supply chain processes improving delivery times by 50%", "technologies": "Supply Chain Management, Logistics", "start_year": "2021", "end_year": "2022"}
  ]'::jsonb,
  certificates = '[
    {"name": "Six Sigma Black Belt", "issuer": "ASQ", "date": "2022", "credential_id": "SSBB-2022", "url": "https://asq.org"},
    {"name": "Certified Supply Chain Professional", "issuer": "APICS", "date": "2021", "credential_id": "CSCP-2021", "url": "https://www.apics.org"}
  ]'::jsonb
WHERE name = 'Nabil' AND family_name = 'Haddad';

-- Nadine El Khoury - Content Writer
UPDATE candidate_profiles SET
  work_experience = '[
    {"title": "Senior Content Strategist", "company": "Digital Media", "start_year": "2021", "end_year": "", "is_present": true, "description": "Leading content strategy and team of writers, creating content for multiple platforms", "technologies": "Content Strategy, SEO, CMS"},
    {"title": "Content Writer", "company": "Marketing Hub", "start_year": "2018", "end_year": "2021", "is_present": false, "description": "Wrote blog posts, articles, and marketing copy", "technologies": "Copywriting, SEO Writing, WordPress"},
    {"title": "Junior Copywriter", "company": "Ad Agency", "start_year": "2016", "end_year": "2018", "is_present": false, "description": "Created advertising copy and social media content", "technologies": "Creative Writing, Social Media"}
  ]'::jsonb,
  projects = '[
    {"name": "Content Marketing Campaign", "description": "Developed content strategy increasing organic traffic by 200%", "technologies": "Content Strategy, SEO, Analytics", "start_year": "2023", "end_year": "2024"},
    {"name": "Corporate Blog Launch", "description": "Launched company blog with 100+ published articles", "technologies": "Blog Management, Editorial Calendar", "start_year": "2022", "end_year": "2023"},
    {"name": "E-Book Series", "description": "Authored series of industry e-books downloaded 10K+ times", "technologies": "Long-form Writing, Design Collaboration", "start_year": "2021", "end_year": "2022"}
  ]'::jsonb,
  certificates = '[
    {"name": "Content Marketing Certification", "issuer": "HubSpot", "date": "2023", "credential_id": "HUB-CM-2023", "url": "https://academy.hubspot.com"},
    {"name": "SEO Fundamentals", "issuer": "Semrush", "date": "2022", "credential_id": "SEM-SEO-2022", "url": "https://www.semrush.com/academy"}
  ]'::jsonb
WHERE name = 'Nadine' AND family_name = 'El Khoury';

-- Nour Abboud - Business Analyst
UPDATE candidate_profiles SET
  work_experience = '[
    {"title": "Senior Business Analyst", "company": "Consulting Group", "start_year": "2021", "end_year": "", "is_present": true, "description": "Leading business analysis for enterprise clients, managing requirement gathering", "technologies": "Business Analysis, SQL, Agile"},
    {"title": "Business Analyst", "company": "Tech Solutions", "start_year": "2018", "end_year": "2021", "is_present": false, "description": "Analyzed business processes and documented requirements", "technologies": "Process Modeling, Requirements Analysis"},
    {"title": "Junior Analyst", "company": "Consulting Firm", "start_year": "2016", "end_year": "2018", "is_present": false, "description": "Supported business analysis and data gathering", "technologies": "Data Analysis, Documentation"}
  ]'::jsonb,
  projects = '[
    {"name": "ERP System Implementation", "description": "Led requirements analysis for enterprise ERP implementation", "technologies": "Business Analysis, Change Management", "start_year": "2023", "end_year": "2024"},
    {"name": "Process Optimization Study", "description": "Conducted analysis resulting in 25% efficiency improvement", "technologies": "Process Analysis, Business Intelligence", "start_year": "2022", "end_year": "2023"}
  ]'::jsonb,
  certificates = '[
    {"name": "CBAP Certification", "issuer": "IIBA", "date": "2022", "credential_id": "CBAP-2022", "url": "https://www.iiba.org"},
    {"name": "Agile Analysis Certification", "issuer": "IIBA", "date": "2021", "credential_id": "AAC-2021", "url": "https://www.iiba.org"}
  ]'::jsonb
WHERE name = 'Nour' AND family_name = 'Abboud';

-- Rami Abboud - Full Stack Developer
UPDATE candidate_profiles SET
  work_experience = '[
    {"title": "Lead Full Stack Developer", "company": "Tech Startup", "start_year": "2022", "end_year": "", "is_present": true, "description": "Leading development team, architecting scalable full-stack applications", "technologies": "React, Node.js, PostgreSQL, AWS, Docker"},
    {"title": "Full Stack Developer", "company": "Software House", "start_year": "2019", "end_year": "2022", "is_present": false, "description": "Developed web applications using modern tech stack", "technologies": "JavaScript, TypeScript, MongoDB, Express"},
    {"title": "Backend Developer", "company": "Digital Agency", "start_year": "2017", "end_year": "2019", "is_present": false, "description": "Built RESTful APIs and microservices", "technologies": "Node.js, Python, MySQL"}
  ]'::jsonb,
  projects = '[
    {"name": "SaaS Platform", "description": "Built multi-tenant SaaS platform serving 5K+ businesses", "technologies": "React, Node.js, PostgreSQL, Redis", "link": "https://github.com/rami/saas-platform", "start_year": "2023", "end_year": "2024"},
    {"name": "Real-Time Analytics Dashboard", "description": "Developed real-time dashboard processing millions of events daily", "technologies": "React, WebSocket, Elasticsearch", "link": "https://github.com/rami/analytics-dashboard", "start_year": "2022", "end_year": "2023"},
    {"name": "Microservices Architecture", "description": "Migrated monolith to microservices improving scalability", "technologies": "Docker, Kubernetes, Node.js", "start_year": "2021", "end_year": "2022"}
  ]'::jsonb,
  certificates = '[
    {"name": "AWS Certified Developer", "issuer": "Amazon Web Services", "date": "2023", "credential_id": "AWS-DEV-2023", "url": "https://aws.amazon.com/certification/"},
    {"name": "MongoDB Certified Developer", "issuer": "MongoDB", "date": "2022", "credential_id": "MDB-DEV-2022", "url": "https://university.mongodb.com"},
    {"name": "Docker Certified Associate", "issuer": "Docker", "date": "2021", "credential_id": "DCA-2021", "url": "https://www.docker.com/certification"}
  ]'::jsonb
WHERE name = 'Rami' AND family_name = 'Abboud';

-- Rita Farah - Sales Manager
UPDATE candidate_profiles SET
  work_experience = '[
    {"title": "Regional Sales Director", "company": "Enterprise Corp", "start_year": "2022", "end_year": "", "is_present": true, "description": "Managing sales team of 15, overseeing $5M territory", "technologies": "Salesforce, Sales Strategy, Team Leadership"},
    {"title": "Sales Manager", "company": "Tech Solutions", "start_year": "2019", "end_year": "2022", "is_present": false, "description": "Led B2B sales team, consistently exceeding quotas", "technologies": "CRM, Sales Management, Negotiation"},
    {"title": "Sales Representative", "company": "Software Company", "start_year": "2017", "end_year": "2019", "is_present": false, "description": "Sold software solutions to enterprise clients", "technologies": "B2B Sales, Relationship Building"}
  ]'::jsonb,
  projects = '[
    {"name": "Enterprise Sales Expansion", "description": "Expanded enterprise client base by 150%, adding $3M in annual revenue", "technologies": "Enterprise Sales, Account Management", "start_year": "2023", "end_year": "2024"},
    {"name": "Sales Enablement Program", "description": "Developed training program improving team performance by 40%", "technologies": "Sales Training, Process Development", "start_year": "2022", "end_year": "2023"}
  ]'::jsonb,
  certificates = '[
    {"name": "Salesforce Administrator", "issuer": "Salesforce", "date": "2023", "credential_id": "SF-ADM-2023", "url": "https://trailhead.salesforce.com"},
    {"name": "Strategic Selling", "issuer": "Miller Heiman Group", "date": "2022", "credential_id": "MH-SS-2022", "url": "https://www.millerheimangroup.com"}
  ]'::jsonb
WHERE name = 'Rita' AND family_name = 'Farah';

-- Samir El Khoury - DevOps Engineer
UPDATE candidate_profiles SET
  work_experience = '[
    {"title": "Senior DevOps Engineer", "company": "Cloud Services", "start_year": "2021", "end_year": "", "is_present": true, "description": "Managing cloud infrastructure and CI/CD pipelines for enterprise applications", "technologies": "AWS, Kubernetes, Terraform, Jenkins"},
    {"title": "DevOps Engineer", "company": "Tech Company", "start_year": "2018", "end_year": "2021", "is_present": false, "description": "Implemented automation and monitoring solutions", "technologies": "Docker, GitLab CI, Ansible, Prometheus"},
    {"title": "Systems Administrator", "company": "IT Services", "start_year": "2016", "end_year": "2018", "is_present": false, "description": "Managed servers and infrastructure", "technologies": "Linux, Bash, Monitoring"}
  ]'::jsonb,
  projects = '[
    {"name": "Kubernetes Migration", "description": "Migrated 50+ applications to Kubernetes reducing costs by 40%", "technologies": "Kubernetes, Docker, Helm", "link": "https://github.com/samir/k8s-migration", "start_year": "2023", "end_year": "2024"},
    {"name": "Infrastructure as Code", "description": "Implemented Terraform for all infrastructure provisioning", "technologies": "Terraform, AWS, GitOps", "start_year": "2022", "end_year": "2023"},
    {"name": "Monitoring Platform", "description": "Built comprehensive monitoring solution with custom dashboards", "technologies": "Prometheus, Grafana, AlertManager", "start_year": "2021", "end_year": "2022"}
  ]'::jsonb,
  certificates = '[
    {"name": "AWS Solutions Architect Professional", "issuer": "Amazon Web Services", "date": "2023", "credential_id": "AWS-SAP-2023", "url": "https://aws.amazon.com/certification/"},
    {"name": "Certified Kubernetes Administrator", "issuer": "CNCF", "date": "2022", "credential_id": "CKA-2022", "url": "https://www.cncf.io/certification/cka/"},
    {"name": "HashiCorp Certified Terraform", "issuer": "HashiCorp", "date": "2021", "credential_id": "HCT-2021", "url": "https://www.hashicorp.com/certification"}
  ]'::jsonb
WHERE name = 'Samir' AND family_name = 'El Khoury';

-- Sara Khalil - Project Manager
UPDATE candidate_profiles SET
  work_experience = '[
    {"title": "Senior Project Manager", "company": "Consulting Firm", "start_year": "2021", "end_year": "", "is_present": true, "description": "Managing multiple enterprise projects with budgets over $2M", "technologies": "PMP, Agile, Scrum, MS Project"},
    {"title": "Project Manager", "company": "IT Solutions", "start_year": "2018", "end_year": "2021", "is_present": false, "description": "Led software development projects from initiation to delivery", "technologies": "Project Management, Risk Management, Stakeholder Management"},
    {"title": "Project Coordinator", "company": "Tech Startup", "start_year": "2016", "end_year": "2018", "is_present": false, "description": "Supported project planning and execution", "technologies": "Coordination, Documentation, Tracking"}
  ]'::jsonb,
  projects = '[
    {"name": "ERP Implementation", "description": "Managed enterprise ERP implementation for 500+ users, delivered on time and under budget", "technologies": "Project Management, Change Management", "start_year": "2023", "end_year": "2024"},
    {"name": "Digital Transformation Initiative", "description": "Led digital transformation program across 5 business units", "technologies": "Program Management, Stakeholder Engagement", "start_year": "2022", "end_year": "2023"},
    {"name": "Agile Transformation", "description": "Implemented Agile methodology across development teams", "technologies": "Agile, Scrum, Training", "start_year": "2021", "end_year": "2022"}
  ]'::jsonb,
  certificates = '[
    {"name": "PMP Certification", "issuer": "PMI", "date": "2022", "credential_id": "PMP-2022", "url": "https://www.pmi.org"},
    {"name": "Certified Scrum Master", "issuer": "Scrum Alliance", "date": "2021", "credential_id": "CSM-2021", "url": "https://www.scrumalliance.org"},
    {"name": "PRINCE2 Practitioner", "issuer": "Axelos", "date": "2020", "credential_id": "P2P-2020", "url": "https://www.axelos.com"}
  ]'::jsonb
WHERE name = 'Sara' AND family_name = 'Khalil';

-- Tarek Khalil - Mobile Developer
UPDATE candidate_profiles SET
  work_experience = '[
    {"title": "Senior Mobile Developer", "company": "Mobile Apps Co", "start_year": "2021", "end_year": "", "is_present": true, "description": "Leading mobile development team, building iOS and Android applications", "technologies": "React Native, Swift, Kotlin, Firebase"},
    {"title": "Mobile Developer", "company": "Digital Studio", "start_year": "2018", "end_year": "2021", "is_present": false, "description": "Developed cross-platform mobile applications", "technologies": "React Native, JavaScript, REST APIs"},
    {"title": "Junior iOS Developer", "company": "App Development", "start_year": "2016", "end_year": "2018", "is_present": false, "description": "Built iOS applications and features", "technologies": "Swift, Xcode, UIKit"}
  ]'::jsonb,
  projects = '[
    {"name": "Fitness Tracking App", "description": "Built fitness app with 100K+ downloads and 4.8 star rating", "technologies": "React Native, Firebase, HealthKit", "link": "https://apps.apple.com/fitness-pro", "start_year": "2023", "end_year": "2024"},
    {"name": "E-Commerce Mobile App", "description": "Developed shopping app with integrated payment and delivery tracking", "technologies": "React Native, Stripe, Push Notifications", "start_year": "2022", "end_year": "2023"},
    {"name": "Social Media Platform", "description": "Created social networking app with real-time messaging", "technologies": "React Native, Socket.io, Redux", "start_year": "2021", "end_year": "2022"}
  ]'::jsonb,
  certificates = '[
    {"name": "iOS App Development", "issuer": "Apple", "date": "2023", "credential_id": "APPLE-IOS-2023", "url": "https://developer.apple.com"},
    {"name": "React Native Certification", "issuer": "Meta", "date": "2022", "credential_id": "META-RN-2022", "url": "https://reactnative.dev"}
  ]'::jsonb
WHERE name = 'Tarek' AND family_name = 'Khalil';

-- Youssef Matar - Cybersecurity Specialist
UPDATE candidate_profiles SET
  work_experience = '[
    {"title": "Senior Security Engineer", "company": "SecureNet", "start_year": "2021", "end_year": "", "is_present": true, "description": "Leading security operations, conducting penetration testing and vulnerability assessments", "technologies": "Security Analysis, Penetration Testing, SIEM, Firewall Management"},
    {"title": "Cybersecurity Analyst", "company": "Tech Security", "start_year": "2018", "end_year": "2021", "is_present": false, "description": "Monitored security threats and implemented security measures", "technologies": "Network Security, Incident Response, Security Tools"},
    {"title": "IT Security Specialist", "company": "Financial Institution", "start_year": "2016", "end_year": "2018", "is_present": false, "description": "Managed security infrastructure and policies", "technologies": "Access Control, Security Policies"}
  ]'::jsonb,
  projects = '[
    {"name": "Security Infrastructure Upgrade", "description": "Implemented enterprise security solution protecting 1000+ endpoints", "technologies": "SIEM, EDR, Network Security", "start_year": "2023", "end_year": "2024"},
    {"name": "Penetration Testing Program", "description": "Established penetration testing program identifying critical vulnerabilities", "technologies": "Kali Linux, Metasploit, Burp Suite", "start_year": "2022", "end_year": "2023"},
    {"name": "Security Awareness Training", "description": "Developed security training program reducing phishing incidents by 80%", "technologies": "Security Training, Awareness", "start_year": "2021", "end_year": "2022"}
  ]'::jsonb,
  certificates = '[
    {"name": "CISSP Certification", "issuer": "ISC2", "date": "2023", "credential_id": "CISSP-2023", "url": "https://www.isc2.org"},
    {"name": "CEH Certification", "issuer": "EC-Council", "date": "2022", "credential_id": "CEH-2022", "url": "https://www.eccouncil.org"},
    {"name": "OSCP Certification", "issuer": "Offensive Security", "date": "2021", "credential_id": "OSCP-2021", "url": "https://www.offensive-security.com"}
  ]'::jsonb
WHERE name = 'Youssef' AND family_name = 'Matar';

-- Zeina Hassan - Accountant
UPDATE candidate_profiles SET
  work_experience = '[
    {"title": "Senior Accountant", "company": "Accounting Firm", "start_year": "2021", "end_year": "", "is_present": true, "description": "Managing financial reporting and audits for multiple clients", "technologies": "QuickBooks, Excel, Financial Reporting, Tax Preparation"},
    {"title": "Accountant", "company": "Corporate Finance", "start_year": "2018", "end_year": "2021", "is_present": false, "description": "Prepared financial statements and managed accounts", "technologies": "Accounting Software, Reconciliation, Financial Analysis"},
    {"title": "Junior Accountant", "company": "Audit Firm", "start_year": "2016", "end_year": "2018", "is_present": false, "description": "Assisted with bookkeeping and financial records", "technologies": "Bookkeeping, Data Entry"}
  ]'::jsonb,
  projects = '[
    {"name": "Financial System Migration", "description": "Led migration to new accounting system for 50+ entities", "technologies": "ERP, Data Migration, Process Improvement", "start_year": "2023", "end_year": "2024"},
    {"name": "Audit Automation", "description": "Automated audit procedures reducing audit time by 50%", "technologies": "Excel Automation, VBA, Data Analytics", "start_year": "2022", "end_year": "2023"}
  ]'::jsonb,
  certificates = '[
    {"name": "CPA License", "issuer": "AICPA", "date": "2022", "credential_id": "CPA-2022", "url": "https://www.aicpa.org"},
    {"name": "CIA Certification", "issuer": "IIA", "date": "2021", "credential_id": "CIA-2021", "url": "https://www.theiia.org"}
  ]'::jsonb
WHERE name = 'Zeina' AND family_name = 'Hassan';

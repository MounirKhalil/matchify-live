// Supabase Edge Function for CV Autofill
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getDocument } from 'https://esm.sh/pdfjs-serverless@0.3.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CVAutofillRequest {
  cv_url: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get user from auth header
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse request body
    const { cv_url } = (await req.json()) as CVAutofillRequest;

    if (!cv_url) {
      throw new Error('cv_url is required');
    }

    // Get user profile to check autofill setting
    const { data: profile, error: profileError } = await supabaseClient
      .from('candidate_profiles')
      .select('autofill_from_cv')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      throw new Error('Failed to fetch user profile');
    }

    // Check if autofill is enabled
    if (!profile.autofill_from_cv) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Autofill is disabled',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Download CV from storage
    const { data: cvFile, error: downloadError } = await supabaseClient.storage
      .from('cvstorage')
      .download(cv_url);

    if (downloadError || !cvFile) {
      throw new Error('Failed to download CV file');
    }

    // Convert blob to array buffer
    const arrayBuffer = await cvFile.arrayBuffer();

    // Extract text from PDF
    const cvText = await extractTextFromPDF(arrayBuffer);

    if (!cvText || cvText.trim().length === 0) {
      throw new Error('No text could be extracted from the CV');
    }

    // Parse CV using OpenAI
    const extractedData = await parseCVWithOpenAI(cvText);
    console.log('Extracted data from CV:', JSON.stringify(extractedData, null, 2));

    // Update profile with extracted data
    const updatedFields = await updateProfile(supabaseClient, user.id, extractedData);
    console.log('Updated fields:', updatedFields);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully extracted and saved information from your CV`,
        extracted_data: extractedData,
        updated_fields: updatedFields,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('CV autofill error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    // Load PDF document (serverless-friendly)
    const loadingTask = getDocument(new Uint8Array(arrayBuffer));

    const pdf = await loadingTask.promise;
    let fullText = '';

    // Extract text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }

    return fullText.trim();
  } catch (error: any) {
    console.error('PDF extraction error:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

async function parseCVWithOpenAI(cvText: string): Promise<any> {
  try {
    const systemPrompt = `You are an expert CV/Resume parser. Extract structured information from the provided CV text.

**CRITICAL - Use ONLY these EXACT field names from the database schema:**

**Personal Information (text fields):**
- phone_number: Phone number
- location: City, state/region
- country: Country name
- date_of_birth: Date of birth (YYYY-MM-DD format, if mentioned)

**RESTRICTED FIELDS (DO NOT EXTRACT - User identity fields):**
- name: First name (SKIP - already in system)
- family_name: Last name (SKIP - already in system)
- email: Email address (SKIP - already in system)

**Social Links (URLs):**
 - link: GitHub profile URL
- linkedin_url: LinkedIn profile URL
- huggingface_url: HuggingFace profile URL

**Preferences (arrays of strings):**
- interests: Professional interests or skills (e.g., ["Machine Learning", "Python"])
- preferred_categories: Inferred job categories (e.g., ["Software Development", "Data Science"])
- preferred_job_types: Inferred from work history (e.g., ["Full-time", "Remote"])

**Education (array of objects - each with these EXACT fields):**
- institution: School/university name (REQUIRED)
- degree: Degree name (REQUIRED, e.g., "BS Computer Science")
- field_of_study: Major or field (optional)
- start_year: Start year (optional, YYYY format)
- end_year: End year (optional, YYYY format)
- location: School location (optional)
- gpa: GPA if mentioned (optional)
- description: Additional details (optional)

**Work Experience (array of objects - each with these EXACT fields):**
- title: Job title (REQUIRED)
- company: Company name (REQUIRED)
- start_year: Start year (optional, YYYY format)
- end_year: End year (optional, YYYY format, empty string if is_present=true)
- is_present: Boolean (REQUIRED - true if currently working there, false otherwise)
- description: Job responsibilities and achievements (optional)
- technologies: Technologies used (optional, string)

**Certificates (array of objects - each with these EXACT fields):**
- name: Certificate name (REQUIRED)
- issuer: Issuing organization (REQUIRED)
- date: Date issued (optional, YYYY or YYYY-MM format)
- credential_id: Credential ID (optional)
- url: Certificate URL (optional)

**Projects (array of objects - each with these EXACT fields):**
- name: Project name (REQUIRED)
- description: Project description (REQUIRED)
- technologies: Technologies used (optional, string)
- link: Project/GitHub URL (optional - use "link" NOT "url")
- start_year: Start year (optional, YYYY format)
- end_year: End year (optional, YYYY format)

**Papers (array of objects - each with these EXACT fields):**
- title: Paper title (REQUIRED)
- publication: Publication venue (optional)
- date: Publication date (optional, YYYY or YYYY-MM format)
- link: Paper URL (optional - use "link" NOT "url")
- description: Abstract or summary (optional)

**Other Sections (array of objects - for ANY additional information that doesn't fit above):**
- title: Section title (e.g., "Languages", "Volunteer Experience", "Awards", "Hobbies", "Publications Summary", "References")
- description: Detailed information for that section

**IMPORTANT - Use other_sections for:**
- Languages spoken (e.g., title: "Languages", description: "English (Native), Spanish (Fluent), French (Intermediate)")
- Volunteer work (e.g., title: "Volunteer Experience", description: "Habitat for Humanity - Built homes for low-income families")
- Awards and recognition (e.g., title: "Awards", description: "Employee of the Year 2023, Best Innovation Award 2022")
- Hobbies and interests that aren't professional skills
- Any other information not covered by the fields above

**Guidelines:**
1. Extract only information that is explicitly stated or clearly implied
2. Use consistent date formats (YYYY-MM or YYYY)
3. DO NOT extract name, family_name, or email - these are restricted identity fields
4. Extract URLs and links when mentioned
5. Infer preferred_categories from work experience (common categories: Software Development, Data Science, DevOps, Product Management, Design, Marketing, Sales, etc.)
6. Return null/undefined for fields not found in the CV
7. For arrays, return empty array if no items found
8. For information that doesn't fit predefined fields (education, work, projects, etc.), put it in other_sections
9. Use "interests" field ONLY for professional skills/competencies
10. Use "other_sections" for languages, hobbies, volunteer work, awards, and miscellaneous info

Return the data as a valid JSON object with ONLY the field names specified above (excluding name, family_name, email).`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `Parse this CV and extract structured data:\n\n${cvText}`,
          },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const extractedData = JSON.parse(data.choices[0].message.content || '{}');

    return validateAndCleanData(extractedData);
  } catch (error: any) {
    console.error('CV parsing error:', error);
    throw new Error(`Failed to parse CV: ${error.message}`);
  }
}

function validateAndCleanData(data: any): any {
  const cleaned: any = {};

  // RESTRICTED FIELDS - DO NOT EXTRACT (for security)
  // name, family_name, email are identity fields that should not be auto-populated

  // Personal information
  if (data.phone_number && typeof data.phone_number === 'string') {
    cleaned.phone_number = data.phone_number.trim();
  }
  if (data.location && typeof data.location === 'string') {
    cleaned.location = data.location.trim();
  }
  if (data.country && typeof data.country === 'string') {
    cleaned.country = data.country.trim();
  }
  if (data.date_of_birth && typeof data.date_of_birth === 'string') {
    cleaned.date_of_birth = data.date_of_birth.trim();
  }

  // Social links
  if (data.github_url && isValidURL(data.github_url)) {
    cleaned.github_url = data.github_url.trim();
  }
  if (data.linkedin_url && isValidURL(data.linkedin_url)) {
    cleaned.linkedin_url = data.linkedin_url.trim();
  }
  if (data.huggingface_url && isValidURL(data.huggingface_url)) {
    cleaned.huggingface_url = data.huggingface_url.trim();
  }

  // Arrays of strings
  if (Array.isArray(data.interests) && data.interests.length > 0) {
    cleaned.interests = data.interests
      .filter((interest: any) => typeof interest === 'string')
      .map((interest: string) => interest.trim());
  }
  if (Array.isArray(data.preferred_categories) && data.preferred_categories.length > 0) {
    cleaned.preferred_categories = data.preferred_categories
      .filter((cat: any) => typeof cat === 'string')
      .map((cat: string) => cat.trim());
  }
  if (Array.isArray(data.preferred_job_types) && data.preferred_job_types.length > 0) {
    cleaned.preferred_job_types = data.preferred_job_types
      .filter((type: any) => typeof type === 'string')
      .map((type: string) => type.trim());
  }

  // Complex arrays (JSONB) - Clean to match EXACT database schema
  if (Array.isArray(data.education) && data.education.length > 0) {
    cleaned.education = data.education
      .filter((edu: any) => edu.institution && edu.degree)
      .map((edu: any) => ({
        institution: edu.institution,
        degree: edu.degree,
        field_of_study: edu.field_of_study || null,
        start_year: edu.start_year || null,
        end_year: edu.end_year || null,
        location: edu.location || null,
        gpa: edu.gpa || null,
        description: edu.description || null,
      }));
  }

  if (Array.isArray(data.work_experience) && data.work_experience.length > 0) {
    cleaned.work_experience = data.work_experience
      .filter((work: any) => work.title && work.company)
      .map((work: any) => ({
        title: work.title,
        company: work.company,
        start_year: work.start_year || null,
        end_year: work.end_year || null,
        is_present: work.is_present !== undefined ? work.is_present : false,
        description: work.description || null,
        technologies: work.technologies || null,
      }));
  }

  if (Array.isArray(data.certificates) && data.certificates.length > 0) {
    cleaned.certificates = data.certificates
      .filter((cert: any) => cert.name && cert.issuer)
      .map((cert: any) => ({
        name: cert.name,
        issuer: cert.issuer,
        date: cert.date || null,
        credential_id: cert.credential_id || null,
        url: cert.url || null,
      }));
  }

  if (Array.isArray(data.projects) && data.projects.length > 0) {
    cleaned.projects = data.projects
      .filter((proj: any) => proj.name && proj.description)
      .map((proj: any) => ({
        name: proj.name,
        description: proj.description,
        technologies: proj.technologies || null,
        link: proj.link || null,
        start_year: proj.start_year || null,
        end_year: proj.end_year || null,
      }));
  }

  if (Array.isArray(data.papers) && data.papers.length > 0) {
    cleaned.papers = data.papers
      .filter((paper: any) => paper.title)
      .map((paper: any) => ({
        title: paper.title,
        publication: paper.publication || null,
        date: paper.date || null,
        link: paper.link || null,
        description: paper.description || null,
      }));
  }

  if (Array.isArray(data.other_sections) && data.other_sections.length > 0) {
    cleaned.other_sections = data.other_sections
      .filter((section: any) => section.title && section.description)
      .map((section: any) => ({
        title: section.title,
        description: section.description,
      }));
  }

  return cleaned;
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

async function updateProfile(
  supabaseClient: any,
  userId: string,
  extractedData: any
): Promise<string[]> {
  try {
    const updatedFields: string[] = [];
    const updateData: any = {};

    // Fetch existing profile to preserve date_of_birth if not in CV
    const { data: existingProfile } = await supabaseClient
      .from('candidate_profiles')
      .select('date_of_birth')
      .eq('user_id', userId)
      .single();

    // CLEAR ALL EXISTING PROFILE DATA (except restricted fields: name, family_name, email, cv_url, autofill_from_cv, date_of_birth)
    // This ensures CV data completely replaces old data
    const fieldsToUpdate = [
      'phone_number', 'location', 'country',
      'github_url', 'linkedin_url', 'huggingface_url',
      'interests', 'preferred_categories', 'preferred_job_types',
      'education', 'work_experience', 'certificates', 'projects', 'papers', 'other_sections'
    ];

    // Set all fields to null/empty first
    fieldsToUpdate.forEach(field => {
      if (field === 'interests' || field === 'preferred_categories' || field === 'preferred_job_types') {
        updateData[field] = []; // Clear array fields
      } else if (field === 'education' || field === 'work_experience' || field === 'certificates' ||
                 field === 'projects' || field === 'papers' || field === 'other_sections') {
        updateData[field] = []; // Clear JSONB array fields
      } else {
        updateData[field] = null; // Clear simple text fields
      }
    });

    // Now add the extracted data from CV
    Object.keys(extractedData).forEach((key) => {
      const value = extractedData[key];
      if (value !== null && value !== undefined) {
        // For arrays, only update if not empty
        if (Array.isArray(value)) {
          if (value.length > 0) {
            updateData[key] = value;
            updatedFields.push(key);
          } else {
            // Keep it as empty array (already set above)
            updateData[key] = [];
          }
        } else {
          updateData[key] = value;
          updatedFields.push(key);
        }
      }
    });

    // Handle date_of_birth separately - preserve existing if CV doesn't have it
    if (extractedData.date_of_birth) {
      updateData.date_of_birth = extractedData.date_of_birth;
      updatedFields.push('date_of_birth');
    } else if (existingProfile?.date_of_birth) {
      // Preserve existing date_of_birth if CV doesn't contain it
      updateData.date_of_birth = existingProfile.date_of_birth;
    }

    console.log('Clearing old data and updating with CV data...');

    const { error } = await supabaseClient
      .from('candidate_profiles')
      .update(updateData)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating profile:', error);
      throw new Error('Failed to update profile');
    }

    return updatedFields;
  } catch (error: any) {
    console.error('Error updating profile:', error);
    throw new Error(`Failed to update profile: ${error.message}`);
  }
}

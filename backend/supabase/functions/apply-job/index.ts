// Supabase Edge Function for AI-powered Job Application Evaluation
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getDocument } from 'https://esm.sh/pdfjs-serverless@0.3.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApplyJobRequest {
  job_posting_id: string;
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
    const { job_posting_id } = (await req.json()) as ApplyJobRequest;

    if (!job_posting_id) {
      throw new Error('job_posting_id is required');
    }

    console.log(`Processing application for user ${user.id} to job ${job_posting_id}`);

    // 1. Fetch candidate profile (excluding application settings, interests, etc.)
    const { data: candidateProfile, error: profileError } = await supabaseClient
      .from('candidate_profiles')
      .select('id, name, family_name, email, phone_number, location, country, date_of_birth, github_url, linkedin_url, huggingface_url, education, work_experience, certificates, projects, papers, other_sections')
      .eq('user_id', user.id)
      .single();

    if (profileError || !candidateProfile) {
      throw new Error('Candidate profile not found');
    }

    // 2. Fetch job posting details
    const { data: jobPosting, error: jobError } = await supabaseClient
      .from('job_postings')
      .select('id, job_title, requirements, public_information, categories, description_url, recruiter_id')
      .eq('id', job_posting_id)
      .single();

    if (jobError || !jobPosting) {
      throw new Error('Job posting not found');
    }

    // 3. Extract job description from PDF if available
    let jobDescriptionText = '';
    if (jobPosting.description_url) {
      try {
        const { data: pdfFile, error: downloadError } = await supabaseClient.storage
          .from('jobpostings')
          .download(jobPosting.description_url);

        if (!downloadError && pdfFile) {
          const arrayBuffer = await pdfFile.arrayBuffer();
          jobDescriptionText = await extractTextFromPDF(arrayBuffer);
        }
      } catch (error) {
        console.error('Error extracting job description PDF:', error);
        // Continue without PDF content
      }
    }

    // 4. Check if application already exists
    const { data: existingApplication } = await supabaseClient
      .from('applications')
      .select('id')
      .eq('candidate_id', candidateProfile.id)
      .eq('job_posting_id', job_posting_id)
      .single();

    if (existingApplication) {
      throw new Error('You have already applied to this job');
    }

    // 5. Evaluate candidate using AI
    const evaluation = await evaluateCandidateWithAI(
      candidateProfile,
      jobPosting,
      jobDescriptionText
    );

    console.log('Evaluation result:', evaluation);

    // 6. Save application to database
    const { data: application, error: insertError } = await supabaseClient
      .from('applications')
      .insert({
        candidate_id: candidateProfile.id,
        job_posting_id: job_posting_id,
        education_score: evaluation.education_score,
        experience_score: evaluation.experience_score,
        skills_score: evaluation.skills_score,
        final_score: evaluation.final_score,
        hiring_status: evaluation.hiring_status,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting application:', insertError);
      throw new Error('Failed to save application');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Application sent successfully!',
        application: {
          id: application.id,
          education_score: application.education_score,
          experience_score: application.experience_score,
          skills_score: application.skills_score,
          final_score: application.final_score,
          hiring_status: application.hiring_status,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Apply job function error:', error);
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
    const loadingTask = getDocument(new Uint8Array(arrayBuffer));
    const pdf = await loadingTask.promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }

    return fullText.trim();
  } catch (error: any) {
    console.error('PDF extraction error:', error);
    return '';
  }
}

async function evaluateCandidateWithAI(
  candidate: any,
  jobPosting: any,
  jobDescriptionText: string
): Promise<any> {
  try {
    const systemPrompt = `You are an expert HR recruiter AI that evaluates job candidates objectively and fairly.

Your task is to evaluate a candidate's profile against a job posting and provide detailed scoring.

**EVALUATION CRITERIA:**

1. **Experience Score (0-100):**
   - Evaluate work experience relevance to the job
   - Consider years of experience
   - Assess alignment of past roles with job requirements
   - Look at technologies used in previous roles

2. **Education Score (0-100):**
   - Evaluate educational background
   - Consider degree level and field of study
   - Assess relevance to the job
   - Consider certifications and additional training

3. **Skills Score (0-100):**
   - Evaluate technical skills match
   - Consider projects, papers, and other sections
   - Assess skill depth and breadth
   - Match against job requirements

4. **Final Score (0-100):**
   - Weighted average: Experience (40%), Education (30%), Skills (30%)
   - Round to 2 decimal places

5. **Hiring Status:**
   - "potential_fit" (score < 70)
   - "rejected" (score 70-84)
   - "accepted" (score >= 85)

**IMPORTANT:**
- Be objective and fair
- Consider all aspects of the candidate's profile
- Provide realistic scores based on actual match
- Do not be overly harsh or lenient

Return ONLY valid JSON with this exact structure:
{
  "education_score": number,
  "experience_score": number,
  "skills_score": number,
  "final_score": number,
  "hiring_status": string,
  "evaluation_summary": string
}`;

    const candidateInfo = `
**CANDIDATE PROFILE:**
Name: ${candidate.name} ${candidate.family_name}
Email: ${candidate.email}
Phone: ${candidate.phone_number || 'N/A'}
Location: ${candidate.location || 'N/A'}, ${candidate.country}
GitHub: ${candidate.github_url || 'N/A'}
LinkedIn: ${candidate.linkedin_url || 'N/A'}

**Education:**
${JSON.stringify(candidate.education || [], null, 2)}

**Work Experience:**
${JSON.stringify(candidate.work_experience || [], null, 2)}

**Certificates:**
${JSON.stringify(candidate.certificates || [], null, 2)}

**Projects:**
${JSON.stringify(candidate.projects || [], null, 2)}

**Papers:**
${JSON.stringify(candidate.papers || [], null, 2)}

**Other Sections:**
${JSON.stringify(candidate.other_sections || [], null, 2)}
`;

    const jobInfo = `
**JOB POSTING:**
Title: ${jobPosting.job_title}
Categories: ${jobPosting.categories?.join(', ') || 'N/A'}

**Requirements:**
${JSON.stringify(jobPosting.requirements || [], null, 2)}

**Public Information:**
${jobPosting.public_information || 'N/A'}

**Job Description (from PDF):**
${jobDescriptionText || 'No additional job description available'}
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `Evaluate this candidate for the job posting:\n\n${candidateInfo}\n\n${jobInfo}`,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const evaluation = JSON.parse(data.choices[0].message.content || '{}');

    // Validate and clean evaluation data
    return {
      education_score: Math.min(100, Math.max(0, evaluation.education_score || 0)),
      experience_score: Math.min(100, Math.max(0, evaluation.experience_score || 0)),
      skills_score: Math.min(100, Math.max(0, evaluation.skills_score || 0)),
      final_score: Math.min(100, Math.max(0, evaluation.final_score || 0)),
      hiring_status: validateHiringStatus(evaluation.hiring_status),
    };
  } catch (error: any) {
    console.error('AI evaluation error:', error);
    // Return default scores if AI evaluation fails
    return {
      education_score: 50,
      experience_score: 50,
      skills_score: 50,
      final_score: 50,
      hiring_status: 'potential_fit',
    };
  }
}

function validateHiringStatus(status: string): string {
  const validStatuses = [
    'potential_fit',
    'rejected',
    'accepted',
  ];

  if (validStatuses.includes(status)) {
    return status;
  }

  // Default to potential_fit if invalid
  return 'potential_fit';
}

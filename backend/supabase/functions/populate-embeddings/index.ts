// Edge Function: Populate All Embeddings
// Purpose: Generate embeddings for all existing candidates and job postings
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessingStats {
  candidatesProcessed: number;
  candidatesSuccess: number;
  candidatesFailed: number;
  jobsProcessed: number;
  jobsSuccess: number;
  jobsFailed: number;
  totalCost: number;
  errors: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Admin-only function: accepts service role key for batch operations
    // No user authentication required

    console.log('Starting embedding generation process...');

    const stats: ProcessingStats = {
      candidatesProcessed: 0,
      candidatesSuccess: 0,
      candidatesFailed: 0,
      jobsProcessed: 0,
      jobsSuccess: 0,
      jobsFailed: 0,
      totalCost: 0,
      errors: [],
    };

    // Step 1: Process all candidates
    console.log('Fetching all candidates...');
    const { data: candidates, error: candidatesError } = await supabaseClient
      .from('candidate_profiles')
      .select('*');

    if (candidatesError) {
      throw new Error(`Error fetching candidates: ${candidatesError.message}`);
    }

    console.log(`Found ${candidates?.length || 0} candidates to process`);

    // Process candidates in batches of 10
    const candidateBatchSize = 10;
    const candidateBatches = [];
    for (let i = 0; i < (candidates || []).length; i += candidateBatchSize) {
      candidateBatches.push(candidates!.slice(i, i + candidateBatchSize));
    }

    for (let batchIndex = 0; batchIndex < candidateBatches.length; batchIndex++) {
      const batch = candidateBatches[batchIndex];
      console.log(`Processing candidate batch ${batchIndex + 1}/${candidateBatches.length}`);

      for (const candidate of batch) {
        try {
          // Calculate years of experience
          let totalYears = 0;
          const workExp = candidate.work_experience || [];
          workExp.forEach((exp: any) => {
            const startYear = parseInt(exp.start_year || '0');
            const endYear = exp.is_present ? new Date().getFullYear() : parseInt(exp.end_year || '0');
            if (startYear && endYear) {
              totalYears += (endYear - startYear);
            }
          });

          // Get current job
          const currentJob = workExp.find((exp: any) => exp.is_present);

          // Extract skills from interests and work experience
          const skills = [
            ...(candidate.interests || []),
            ...workExp.flatMap((exp: any) =>
              (exp.technologies || '').split(',').map((t: string) => t.trim()).filter(Boolean)
            ),
          ];

          // Prepare candidate data
          const candidateData = {
            name: `${candidate.name} ${candidate.family_name}`.trim(),
            headline: currentJob?.title || workExp[0]?.title || '',
            current_position: currentJob?.title || '',
            current_company: currentJob?.company || '',
            location: candidate.location || '',
            country: candidate.country || '',
            skills: [...new Set(skills)].slice(0, 20), // Limit to 20 unique skills
            years_of_experience: totalYears,
            work_experience: workExp.map((exp: any) => ({
              title: exp.title,
              company: exp.company,
              description: exp.description || '',
              duration: `${exp.start_year || ''}-${exp.is_present ? 'Present' : exp.end_year || ''}`,
              technologies: exp.technologies || '',
            })),
            education: (candidate.education || []).map((edu: any) => ({
              school: edu.institution,
              field: edu.field_of_study,
              degree: edu.degree,
            })),
          };

          // Call generate-embeddings function
          const { data: embeddingResult, error: embeddingError } = await supabaseClient.functions.invoke(
            'generate-embeddings',
            {
              body: {
                candidate_id: candidate.id,
                candidate_data: candidateData,
              },
            }
          );

          if (embeddingError) {
            console.error(`Error generating embedding for candidate ${candidate.id}:`, embeddingError);
            stats.candidatesFailed++;
            stats.errors.push(`Candidate ${candidate.name}: ${embeddingError.message}`);
          } else {
            console.log(`✓ Generated embedding for candidate: ${candidateData.name}`);
            stats.candidatesSuccess++;
            stats.totalCost += 0.00001; // Approximate cost per embedding
          }

          stats.candidatesProcessed++;
        } catch (error) {
          console.error(`Error processing candidate ${candidate.id}:`, error);
          stats.candidatesFailed++;
          stats.errors.push(`Candidate ${candidate.name}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Delay between batches to respect rate limits
      if (batchIndex < candidateBatches.length - 1) {
        console.log('Waiting 1 second before next batch...');
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Step 2: Process all open job postings
    console.log('Fetching all open job postings...');
    const { data: jobPostings, error: jobsError } = await supabaseClient
      .from('job_postings')
      .select('*')
      .eq('status', 'open');

    if (jobsError) {
      throw new Error(`Error fetching job postings: ${jobsError.message}`);
    }

    console.log(`Found ${jobPostings?.length || 0} open job postings to process`);

    // Process job postings in batches of 10
    const jobBatchSize = 10;
    const jobBatches = [];
    for (let i = 0; i < (jobPostings || []).length; i += jobBatchSize) {
      jobBatches.push(jobPostings!.slice(i, i + jobBatchSize));
    }

    for (let batchIndex = 0; batchIndex < jobBatches.length; batchIndex++) {
      const batch = jobBatches[batchIndex];
      console.log(`Processing job posting batch ${batchIndex + 1}/${jobBatches.length}`);

      for (const job of batch) {
        try {
          // Prepare job data
          const jobData = {
            job_title: job.job_title,
            categories: job.categories || [],
            job_location: '', // Not stored in job_postings table
            requirements: job.requirements || {},
            description_url: job.description_url || '',
            public_information: job.public_information || '',
          };

          // Call generate-job-embeddings function
          const { data: embeddingResult, error: embeddingError } = await supabaseClient.functions.invoke(
            'generate-job-embeddings',
            {
              body: {
                job_posting_id: job.id,
                job_data: jobData,
              },
            }
          );

          if (embeddingError) {
            console.error(`Error generating embedding for job ${job.id}:`, embeddingError);
            stats.jobsFailed++;
            stats.errors.push(`Job ${job.job_title}: ${embeddingError.message}`);
          } else {
            console.log(`✓ Generated embedding for job: ${job.job_title}`);
            stats.jobsSuccess++;
            stats.totalCost += 0.00001; // Approximate cost per embedding
          }

          stats.jobsProcessed++;
        } catch (error) {
          console.error(`Error processing job posting ${job.id}:`, error);
          stats.jobsFailed++;
          stats.errors.push(`Job ${job.job_title}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Delay between batches to respect rate limits
      if (batchIndex < jobBatches.length - 1) {
        console.log('Waiting 1 second before next batch...');
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log('Embedding generation completed!');
    console.log('Final stats:', stats);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Embedding generation completed',
        stats: {
          candidates: {
            total: candidates?.length || 0,
            processed: stats.candidatesProcessed,
            success: stats.candidatesSuccess,
            failed: stats.candidatesFailed,
          },
          jobs: {
            total: jobPostings?.length || 0,
            processed: stats.jobsProcessed,
            success: stats.jobsSuccess,
            failed: stats.jobsFailed,
          },
          estimatedCost: `$${stats.totalCost.toFixed(5)}`,
          errors: stats.errors.slice(0, 10), // Return first 10 errors only
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in populate-embeddings function:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

/**
 * Batch Generate Embeddings for All Candidates and Job Postings
 *
 * This script generates OpenAI embeddings for:
 * 1. All existing candidates in candidate_profiles
 * 2. All existing job postings in job_postings
 *
 * Run this once to populate the embedding tables.
 *
 * Usage:
 *   deno run --allow-net --allow-env scripts/generate-all-embeddings.ts
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Configuration
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';

const BATCH_SIZE = 10; // Process 10 at a time to avoid rate limits
const DELAY_MS = 1000; // 1 second delay between batches

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !OPENAI_API_KEY) {
  console.error('❌ Missing environment variables!');
  console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY');
  Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface CandidateProfile {
  id: string;
  name?: string;
  family_name?: string;
  location?: string;
  country?: string;
  interests?: string[];
  work_experience?: Array<{
    title?: string;
    company?: string;
    description?: string;
    technologies?: string;
    start_year?: string;
    end_year?: string;
    is_present?: boolean;
  }>;
  education?: Array<{
    institution?: string;
    degree?: string;
    field_of_study?: string;
    start_year?: string;
    end_year?: string;
  }>;
}

interface JobPosting {
  id: string;
  job_title?: string;
  description_url?: string;
  requirements?: any;
  categories?: string[];
  job_location?: string;
}

/**
 * Calculate total years of experience from work history
 */
function calculateYearsOfExperience(workExperience?: CandidateProfile['work_experience']): number {
  if (!workExperience || workExperience.length === 0) return 0;

  let totalYears = 0;
  const currentYear = new Date().getFullYear();

  for (const exp of workExperience) {
    const startYear = parseInt(exp.start_year || '0');
    const endYear = exp.is_present ? currentYear : parseInt(exp.end_year || '0');

    if (startYear && endYear) {
      totalYears += (endYear - startYear);
    }
  }

  return totalYears;
}

/**
 * Build semantic text representation of candidate
 */
function buildCandidateText(candidate: CandidateProfile): string {
  const parts: string[] = [];

  const fullName = [candidate.name, candidate.family_name].filter(Boolean).join(' ');
  if (fullName) parts.push(`Name: ${fullName}`);

  // Current position
  const currentJob = candidate.work_experience?.find(exp => exp.is_present);
  if (currentJob) {
    parts.push(`Current Position: ${currentJob.title} at ${currentJob.company}`);
  }

  const yearsExp = calculateYearsOfExperience(candidate.work_experience);
  if (yearsExp > 0) {
    parts.push(`Years of Experience: ${yearsExp} years`);
  }

  if (candidate.location) parts.push(`Location: ${candidate.location}`);
  if (candidate.country) parts.push(`Country: ${candidate.country}`);

  if (candidate.interests && candidate.interests.length > 0) {
    parts.push(`Skills: ${candidate.interests.join(', ')}`);
  }

  if (candidate.work_experience && candidate.work_experience.length > 0) {
    const workText = candidate.work_experience
      .map(exp => {
        const expParts: string[] = [];
        if (exp.title) expParts.push(exp.title);
        if (exp.company) expParts.push(`at ${exp.company}`);
        if (exp.technologies) expParts.push(`using ${exp.technologies}`);
        if (exp.description) expParts.push(exp.description);
        return expParts.join(' ');
      })
      .join('. ');
    parts.push(`Work Experience: ${workText}`);
  }

  if (candidate.education && candidate.education.length > 0) {
    const eduText = candidate.education
      .map(edu => {
        const eduParts: string[] = [];
        if (edu.degree) eduParts.push(edu.degree);
        if (edu.field_of_study) eduParts.push(`in ${edu.field_of_study}`);
        if (edu.institution) eduParts.push(`from ${edu.institution}`);
        return eduParts.join(' ');
      })
      .join('. ');
    parts.push(`Education: ${eduText}`);
  }

  return parts.join('. ');
}

/**
 * Build semantic text representation of job posting
 */
function buildJobText(job: JobPosting): string {
  const parts: string[] = [];

  if (job.job_title) parts.push(`Position: ${job.job_title}`);

  if (job.categories && job.categories.length > 0) {
    parts.push(`Categories: ${job.categories.join(', ')}`);
  }

  if (job.job_location) parts.push(`Location: ${job.job_location}`);

  if (job.requirements) {
    const req = job.requirements;
    if (req.required_skills) parts.push(`Required Skills: ${req.required_skills.join(', ')}`);
    if (req.preferred_skills) parts.push(`Preferred Skills: ${req.preferred_skills.join(', ')}`);
    if (req.min_years_of_experience) parts.push(`Minimum Experience: ${req.min_years_of_experience} years`);
    if (req.education_level) parts.push(`Education: ${req.education_level}`);
    if (req.responsibilities) parts.push(`Responsibilities: ${req.responsibilities.join('. ')}`);
  }

  return parts.join('. ');
}

/**
 * Generate embedding using OpenAI API
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Generate embeddings for all candidates
 */
async function generateCandidateEmbeddings(): Promise<{ success: number; failed: number }> {
  console.log('\n📊 Fetching candidates...');

  const { data: candidates, error } = await supabase
    .from('candidate_profiles')
    .select('*');

  if (error) {
    console.error('❌ Error fetching candidates:', error);
    return { success: 0, failed: 0 };
  }

  if (!candidates || candidates.length === 0) {
    console.log('⚠️  No candidates found');
    return { success: 0, failed: 0 };
  }

  console.log(`✅ Found ${candidates.length} candidates`);

  // Filter out candidates that already have embeddings
  const { data: existingEmbeddings } = await supabase
    .from('candidate_embeddings')
    .select('candidate_id');

  const existingIds = new Set(existingEmbeddings?.map(e => e.candidate_id) || []);
  const candidatesToProcess = candidates.filter(c => !existingIds.has(c.id));

  console.log(`🔄 Need to generate embeddings for ${candidatesToProcess.length} candidates`);
  console.log(`✓ ${existingIds.size} candidates already have embeddings`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < candidatesToProcess.length; i += BATCH_SIZE) {
    const batch = candidatesToProcess.slice(i, i + BATCH_SIZE);
    console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(candidatesToProcess.length / BATCH_SIZE)} (${batch.length} candidates)`);

    for (const candidate of batch) {
      try {
        const candidateText = buildCandidateText(candidate as CandidateProfile);

        if (!candidateText || candidateText.length < 10) {
          console.log(`⏭️  Skipping candidate ${candidate.id} (insufficient data)`);
          failed++;
          continue;
        }

        const embedding = await generateEmbedding(candidateText);

        const currentJob = (candidate.work_experience as any)?.find((exp: any) => exp.is_present);
        const metadata = {
          name: candidate.name,
          headline: currentJob?.title,
          current_position: currentJob?.title,
          current_company: currentJob?.company,
          location: candidate.location,
          country: candidate.country,
          skills: candidate.interests || [],
          years_of_experience: calculateYearsOfExperience(candidate.work_experience as any),
          embedding_generated_at: new Date().toISOString(),
        };

        const { error: insertError } = await supabase
          .from('candidate_embeddings')
          .insert({
            candidate_id: candidate.id,
            embeddings: embedding,
            metadata,
          });

        if (insertError) {
          console.error(`❌ Failed to insert embedding for candidate ${candidate.id}:`, insertError.message);
          failed++;
        } else {
          await supabase
            .from('candidate_profiles')
            .update({ embedding_last_updated: new Date().toISOString() })
            .eq('id', candidate.id);

          console.log(`✅ Generated embedding for candidate ${candidate.id}`);
          success++;
        }
      } catch (error) {
        console.error(`❌ Error processing candidate ${candidate.id}:`, error);
        failed++;
      }
    }

    // Delay between batches to respect rate limits
    if (i + BATCH_SIZE < candidatesToProcess.length) {
      console.log(`⏳ Waiting ${DELAY_MS}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }

  return { success, failed };
}

/**
 * Generate embeddings for all job postings
 */
async function generateJobEmbeddings(): Promise<{ success: number; failed: number }> {
  console.log('\n📊 Fetching job postings...');

  const { data: jobs, error } = await supabase
    .from('job_postings')
    .select('*')
    .eq('status', 'open');

  if (error) {
    console.error('❌ Error fetching job postings:', error);
    return { success: 0, failed: 0 };
  }

  if (!jobs || jobs.length === 0) {
    console.log('⚠️  No job postings found');
    return { success: 0, failed: 0 };
  }

  console.log(`✅ Found ${jobs.length} open job postings`);

  // Filter out jobs that already have embeddings
  const { data: existingEmbeddings } = await supabase
    .from('job_posting_embeddings')
    .select('job_posting_id');

  const existingIds = new Set(existingEmbeddings?.map(e => e.job_posting_id) || []);
  const jobsToProcess = jobs.filter(j => !existingIds.has(j.id));

  console.log(`🔄 Need to generate embeddings for ${jobsToProcess.length} job postings`);
  console.log(`✓ ${existingIds.size} jobs already have embeddings`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < jobsToProcess.length; i += BATCH_SIZE) {
    const batch = jobsToProcess.slice(i, i + BATCH_SIZE);
    console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(jobsToProcess.length / BATCH_SIZE)} (${batch.length} jobs)`);

    for (const job of batch) {
      try {
        const jobText = buildJobText(job as JobPosting);

        if (!jobText || jobText.length < 10) {
          console.log(`⏭️  Skipping job ${job.id} (insufficient data)`);
          failed++;
          continue;
        }

        const embedding = await generateEmbedding(jobText);

        const metadata = {
          job_title: job.job_title,
          categories: job.categories || [],
          location: job.job_location,
          required_skills: job.requirements?.required_skills || [],
          min_years_of_experience: job.requirements?.min_years_of_experience,
          embedding_generated_at: new Date().toISOString(),
        };

        const { error: insertError } = await supabase
          .from('job_posting_embeddings')
          .insert({
            job_posting_id: job.id,
            embeddings: embedding,
            metadata,
          });

        if (insertError) {
          console.error(`❌ Failed to insert embedding for job ${job.id}:`, insertError.message);
          failed++;
        } else {
          console.log(`✅ Generated embedding for job ${job.id} (${job.job_title})`);
          success++;
        }
      } catch (error) {
        console.error(`❌ Error processing job ${job.id}:`, error);
        failed++;
      }
    }

    // Delay between batches
    if (i + BATCH_SIZE < jobsToProcess.length) {
      console.log(`⏳ Waiting ${DELAY_MS}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }

  return { success, failed };
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting batch embedding generation...\n');
  console.log('═'.repeat(60));

  const startTime = Date.now();

  // Generate candidate embeddings
  console.log('\n👤 CANDIDATE EMBEDDINGS');
  console.log('═'.repeat(60));
  const candidateResults = await generateCandidateEmbeddings();

  // Generate job embeddings
  console.log('\n💼 JOB POSTING EMBEDDINGS');
  console.log('═'.repeat(60));
  const jobResults = await generateJobEmbeddings();

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n📊 SUMMARY');
  console.log('═'.repeat(60));
  console.log(`⏱️  Total time: ${elapsed}s`);
  console.log(`\n👤 Candidates:`);
  console.log(`   ✅ Success: ${candidateResults.success}`);
  console.log(`   ❌ Failed: ${candidateResults.failed}`);
  console.log(`\n💼 Job Postings:`);
  console.log(`   ✅ Success: ${jobResults.success}`);
  console.log(`   ❌ Failed: ${jobResults.failed}`);
  console.log(`\n🎯 Total:`);
  console.log(`   ✅ Success: ${candidateResults.success + jobResults.success}`);
  console.log(`   ❌ Failed: ${candidateResults.failed + jobResults.failed}`);
  console.log('═'.repeat(60));

  const totalGenerated = candidateResults.success + jobResults.success;
  if (totalGenerated > 0) {
    console.log(`\n🎉 Successfully generated ${totalGenerated} embeddings!`);
    console.log(`💰 Estimated cost: ~$${(totalGenerated * 0.00001).toFixed(4)}`);
  }
}

// Run the script
main().catch(console.error);

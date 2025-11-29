/**
 * Embedding Generation Worker
 *
 * This worker continuously monitors the embedding_generation_queue table
 * and processes pending jobs by calling the appropriate edge functions.
 *
 * Run this in the background:
 *   deno run --allow-net --allow-env scripts/embedding-worker.ts
 *
 * Or deploy as a cron job / serverless function
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const POLL_INTERVAL_MS = 5000; // Poll every 5 seconds
const BATCH_SIZE = 5; // Process 5 at a time

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables!');
  Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface QueueItem {
  id: string;
  entity_type: 'candidate' | 'job_posting';
  entity_id: string;
  attempts: number;
}

/**
 * Fetch candidate data and prepare for embedding generation
 */
async function getCandidateData(candidateId: string) {
  const { data, error } = await supabase
    .from('candidate_profiles')
    .select('*')
    .eq('id', candidateId)
    .single();

  if (error || !data) {
    throw new Error(`Failed to fetch candidate: ${error?.message}`);
  }

  // Calculate years of experience
  let yearsOfExperience = 0;
  if (data.work_experience) {
    const currentYear = new Date().getFullYear();
    for (const exp of data.work_experience) {
      const startYear = parseInt(exp.start_year || '0');
      const endYear = exp.is_present ? currentYear : parseInt(exp.end_year || '0');
      if (startYear && endYear) {
        yearsOfExperience += (endYear - startYear);
      }
    }
  }

  const currentJob = data.work_experience?.find((exp: any) => exp.is_present);

  return {
    candidate_id: data.id,
    candidate_data: {
      name: data.name,
      headline: currentJob?.title,
      current_position: currentJob?.title,
      current_company: currentJob?.company,
      location: data.location,
      country: data.country,
      skills: data.interests || [],
      years_of_experience: yearsOfExperience,
      certifications: [], // Add if available
      languages: [], // Add if available
      bio: data.bio,
      work_experience: data.work_experience?.map((exp: any) => ({
        title: exp.title,
        company: exp.company,
        description: exp.description,
        duration: `${exp.start_year}-${exp.is_present ? 'Present' : exp.end_year}`,
      })) || [],
      education: data.education?.map((edu: any) => ({
        school: edu.institution,
        field: edu.field_of_study,
        degree: edu.degree,
      })) || [],
    },
  };
}

/**
 * Fetch job posting data and prepare for embedding generation
 */
async function getJobData(jobId: string) {
  const { data, error } = await supabase
    .from('job_postings')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error || !data) {
    throw new Error(`Failed to fetch job posting: ${error?.message}`);
  }

  return {
    job_posting_id: data.id,
    job_data: {
      job_title: data.job_title,
      categories: data.categories || [],
      job_location: data.job_location,
      requirements: data.requirements,
      description_url: data.description_url,
    },
  };
}

/**
 * Process a single queue item
 */
async function processQueueItem(item: QueueItem): Promise<{ success: boolean; error?: string }> {
  try {
    let result;

    if (item.entity_type === 'candidate') {
      console.log(`🔄 Processing candidate: ${item.entity_id}`);
      const payload = await getCandidateData(item.entity_id);

      result = await supabase.functions.invoke('generate-embeddings', {
        body: payload,
      });
    } else if (item.entity_type === 'job_posting') {
      console.log(`🔄 Processing job posting: ${item.entity_id}`);
      const payload = await getJobData(item.entity_id);

      result = await supabase.functions.invoke('generate-job-embeddings', {
        body: payload,
      });
    } else {
      throw new Error(`Unknown entity type: ${item.entity_type}`);
    }

    if (result.error) {
      throw result.error;
    }

    console.log(`✅ Successfully generated embedding for ${item.entity_type}: ${item.entity_id}`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to process ${item.entity_type} ${item.entity_id}:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Update queue item status
 */
async function updateQueueStatus(
  itemId: string,
  status: 'completed' | 'failed',
  errorMessage?: string,
  attempts?: number
) {
  const updates: any = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'completed') {
    updates.processed_at = new Date().toISOString();
  }

  if (status === 'failed') {
    updates.error_message = errorMessage;
    updates.attempts = attempts;
  }

  await supabase
    .from('embedding_generation_queue')
    .update(updates)
    .eq('id', itemId);
}

/**
 * Process pending queue items
 */
async function processPendingItems() {
  // Fetch pending items
  const { data: items, error } = await supabase
    .from('embedding_generation_queue')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    console.error('❌ Error fetching queue items:', error);
    return;
  }

  if (!items || items.length === 0) {
    return; // No pending items
  }

  console.log(`\n📦 Found ${items.length} pending items to process`);

  for (const item of items as QueueItem[]) {
    // Mark as processing
    await supabase
      .from('embedding_generation_queue')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', item.id);

    // Process the item
    const result = await processQueueItem(item);

    if (result.success) {
      await updateQueueStatus(item.id, 'completed');
    } else {
      const newAttempts = item.attempts + 1;
      const maxAttempts = 3;

      if (newAttempts >= maxAttempts) {
        // Give up after max attempts
        await updateQueueStatus(item.id, 'failed', result.error, newAttempts);
        console.log(`⚠️  Giving up on ${item.entity_type} ${item.entity_id} after ${maxAttempts} attempts`);
      } else {
        // Reset to pending for retry
        await supabase
          .from('embedding_generation_queue')
          .update({
            status: 'pending',
            attempts: newAttempts,
            error_message: result.error,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);
        console.log(`🔄 Will retry ${item.entity_type} ${item.entity_id} (attempt ${newAttempts}/${maxAttempts})`);
      }
    }
  }
}

/**
 * Main worker loop
 */
async function runWorker() {
  console.log('🚀 Embedding Generation Worker started');
  console.log(`⏱️  Poll interval: ${POLL_INTERVAL_MS}ms`);
  console.log(`📦 Batch size: ${BATCH_SIZE}`);
  console.log('═'.repeat(60));

  let iteration = 0;

  while (true) {
    try {
      iteration++;
      const timestamp = new Date().toISOString();

      // Process pending items
      await processPendingItems();

      // Wait before next poll
      if (iteration % 12 === 0) {
        // Log heartbeat every minute (12 iterations * 5 seconds)
        console.log(`\n💓 Worker heartbeat at ${timestamp}`);
      }

      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    } catch (error) {
      console.error('❌ Worker error:', error);
      // Continue running despite errors
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }
}

// Handle graceful shutdown
Deno.addSignalListener('SIGINT', () => {
  console.log('\n\n⚠️  Received SIGINT, shutting down gracefully...');
  Deno.exit(0);
});

Deno.addSignalListener('SIGTERM', () => {
  console.log('\n\n⚠️  Received SIGTERM, shutting down gracefully...');
  Deno.exit(0);
});

// Start the worker
runWorker().catch(error => {
  console.error('💥 Fatal worker error:', error);
  Deno.exit(1);
});

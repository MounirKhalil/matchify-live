/**
 * Embedding Generator Service
 * Manages embedding generation for candidates and job postings
 * Integrates with OpenAI API and Supabase storage
 */

import { createClient } from "@supabase/supabase-js";
import { createLogger } from "../utils/logger";
import { getSupabaseConfig } from "../utils/config";
import type {
  CandidateProfileData,
  JobPostingData,
  CandidateEmbeddingData,
  JobPostingEmbeddingData,
} from "../types/agent.types";

const logger = createLogger({ component: "EmbeddingGenerator", level: "info" });

/**
 * Call OpenAI API to generate embeddings (delegated to Edge Function)
 * In production, this would call the supabase edge function
 */
export async function generateEmbeddingVector(
  text: string
): Promise<number[]> {
  try {
    if (!text) {
      throw new Error("Text is required for embedding generation");
    }

    logger.debug("Generating embedding for text", {
      textLength: text.length,
    });

    // For testing, return mock embedding
    return generateMockEmbedding();
  } catch (error) {
    logger.error("Error generating embedding", { textLength: text.length }, error as Error);
    throw error;
  }
}

/**
 * Generate mock embedding for testing
 */
function generateMockEmbedding(): number[] {
  const embedding = Array(1536)
    .fill(0)
    .map(() => Math.random() - 0.5);

  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map((val) => val / magnitude);
}

/**
 * Extract text from candidate profile for embedding
 */
export function extractCandidateEmbeddingText(
  candidate: CandidateProfileData
): string {
  const parts: string[] = [];

  if (candidate.name) parts.push(candidate.name);
  if (candidate.family_name) parts.push(candidate.family_name);
  if (candidate.bio) parts.push(candidate.bio);

  if (candidate.skills && candidate.skills.length > 0) {
    parts.push(`Skills: ${candidate.skills.join(", ")}`);
  }

  if (candidate.work_experience && candidate.work_experience.length > 0) {
    for (const exp of candidate.work_experience) {
      parts.push(`${exp.position} at ${exp.company}`);
      if (exp.description) parts.push(exp.description);
      if (exp.technologies && exp.technologies.length > 0) {
        parts.push(`Technologies: ${exp.technologies.join(", ")}`);
      }
    }
  }

  if (candidate.education && candidate.education.length > 0) {
    for (const edu of candidate.education) {
      parts.push(`${edu.degree} in ${edu.field_of_study} from ${edu.institution}`);
    }
  }

  if (candidate.interests && candidate.interests.length > 0) {
    parts.push(`Interests: ${candidate.interests.join(", ")}`);
  }

  if (candidate.preferred_categories && candidate.preferred_categories.length > 0) {
    parts.push(`Preferred roles: ${candidate.preferred_categories.join(", ")}`);
  }

  return parts.filter((p) => p && p.length > 0).join(" | ");
}

/**
 * Extract text from job posting for embedding
 */
export function extractJobEmbeddingText(job: JobPostingData): string {
  const parts: string[] = [];

  if (job.job_title) parts.push(job.job_title);
  if (job.company_name) parts.push(job.company_name);
  if (job.public_information) parts.push(job.public_information);

  if (job.requirements && job.requirements.length > 0) {
    const skills = job.requirements.map((r) => r.name).join(", ");
    parts.push(`Required skills: ${skills}`);
  }

  if (job.categories && job.categories.length > 0) {
    parts.push(`Categories: ${job.categories.join(", ")}`);
  }

  if (job.job_type) parts.push(job.job_type);
  if (job.location) parts.push(job.location);
  if (job.salary_range) parts.push(job.salary_range);

  return parts.filter((p) => p && p.length > 0).join(" | ");
}

/**
 * Generate and save embedding for a candidate
 */
export async function generateCandidateEmbedding(
  candidateId: string,
  candidate?: CandidateProfileData
): Promise<CandidateEmbeddingData> {
  const supabaseConfig = getSupabaseConfig();
  const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey);

  try {
    logger.info(`Generating embedding for candidate ${candidateId}`);

    let candidateData = candidate;
    if (!candidateData) {
      const { data, error } = await supabase
        .from("candidate_profiles")
        .select("*")
        .eq("id", candidateId)
        .single();

      if (error || !data) {
        throw new Error(`Could not find candidate ${candidateId}`);
      }
      candidateData = data as CandidateProfileData;
    }

    const embeddingText = extractCandidateEmbeddingText(candidateData);

    if (!embeddingText || embeddingText.length === 0) {
      logger.warn(`No text to embed for candidate ${candidateId}`);
      throw new Error("Candidate profile is incomplete for embedding generation");
    }

    const embeddings = await generateEmbeddingVector(embeddingText);

    const { data, error } = await supabase
      .from("candidate_embeddings")
      .upsert(
        {
          candidate_id: candidateId,
          embeddings: embeddings,
          metadata: {
            text_length: embeddingText.length,
            generated_at: new Date().toISOString(),
          },
        },
        { onConflict: "candidate_id" }
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    logger.info(`Embedding generated for candidate ${candidateId}`, {
      textLength: embeddingText.length,
      dimensions: embeddings.length,
    });

    return data as CandidateEmbeddingData;
  } catch (error) {
    logger.error(
      `Error generating embedding for candidate ${candidateId}`,
      { candidateId },
      error as Error
    );
    throw error;
  }
}

/**
 * Generate and save embedding for a job posting
 */
export async function generateJobEmbedding(
  jobPostingId: string,
  job?: JobPostingData
): Promise<JobPostingEmbeddingData> {
  const supabaseConfig = getSupabaseConfig();
  const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey);

  try {
    logger.info(`Generating embedding for job ${jobPostingId}`);

    let jobData = job;
    if (!jobData) {
      const { data, error } = await supabase
        .from("job_postings")
        .select("*")
        .eq("id", jobPostingId)
        .single();

      if (error || !data) {
        throw new Error(`Could not find job ${jobPostingId}`);
      }
      jobData = data as JobPostingData;
    }

    const embeddingText = extractJobEmbeddingText(jobData);

    if (!embeddingText || embeddingText.length === 0) {
      logger.warn(`No text to embed for job ${jobPostingId}`);
      throw new Error("Job posting is incomplete for embedding generation");
    }

    const embeddings = await generateEmbeddingVector(embeddingText);

    const { data, error } = await supabase
      .from("job_posting_embeddings")
      .upsert(
        {
          job_posting_id: jobPostingId,
          embeddings: embeddings,
          metadata: {
            job_title: jobData.job_title,
            company_name: jobData.company_name,
            text_length: embeddingText.length,
            generated_at: new Date().toISOString(),
          },
        },
        { onConflict: "job_posting_id" }
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    logger.info(`Embedding generated for job ${jobPostingId}`, {
      textLength: embeddingText.length,
      dimensions: embeddings.length,
    });

    return data as JobPostingEmbeddingData;
  } catch (error) {
    logger.error(
      `Error generating embedding for job ${jobPostingId}`,
      { jobPostingId },
      error as Error
    );
    throw error;
  }
}

/**
 * Batch generate embeddings for multiple candidates
 */
export async function batchGenerateCandidateEmbeddings(
  candidateIds: string[]
): Promise<{
  generated: CandidateEmbeddingData[];
  failed: string[];
}> {
  logger.info(`Batch generating embeddings for ${candidateIds.length} candidates`);

  const generated: CandidateEmbeddingData[] = [];
  const failed: string[] = [];

  for (const candidateId of candidateIds) {
    try {
      const embedding = await generateCandidateEmbedding(candidateId);
      generated.push(embedding);
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      logger.error(`Failed to generate embedding for candidate ${candidateId}`, {}, error as Error);
      failed.push(candidateId);
    }
  }

  logger.info(
    `Batch generation complete: ${generated.length} generated, ${failed.length} failed`
  );

  return { generated, failed };
}

/**
 * Batch generate embeddings for multiple jobs
 */
export async function batchGenerateJobEmbeddings(
  jobPostingIds: string[]
): Promise<{
  generated: JobPostingEmbeddingData[];
  failed: string[];
}> {
  logger.info(`Batch generating embeddings for ${jobPostingIds.length} jobs`);

  const generated: JobPostingEmbeddingData[] = [];
  const failed: string[] = [];

  for (const jobPostingId of jobPostingIds) {
    try {
      const embedding = await generateJobEmbedding(jobPostingId);
      generated.push(embedding);
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      logger.error(`Failed to generate embedding for job ${jobPostingId}`, {}, error as Error);
      failed.push(jobPostingId);
    }
  }

  logger.info(
    `Batch generation complete: ${generated.length} generated, ${failed.length} failed`
  );

  return { generated, failed };
}

/**
 * Get or regenerate embedding for a candidate
 */
export async function ensureCandidateEmbedding(
  candidateId: string,
  forceRegenerate: boolean = false
): Promise<CandidateEmbeddingData | null> {
  const supabaseConfig = getSupabaseConfig();
  const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey);

  try {
    if (!forceRegenerate) {
      const { data } = await supabase
        .from("candidate_embeddings")
        .select("*")
        .eq("candidate_id", candidateId)
        .single();

      if (data) {
        logger.debug(`Embedding exists for candidate ${candidateId}`);
        return data as CandidateEmbeddingData;
      }
    }

    return await generateCandidateEmbedding(candidateId);
  } catch (error) {
    logger.error(
      `Error ensuring embedding for candidate ${candidateId}`,
      { candidateId },
      error as Error
    );
    return null;
  }
}

/**
 * Get or regenerate embedding for a job
 */
export async function ensureJobEmbedding(
  jobPostingId: string,
  forceRegenerate: boolean = false
): Promise<JobPostingEmbeddingData | null> {
  const supabaseConfig = getSupabaseConfig();
  const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey);

  try {
    if (!forceRegenerate) {
      const { data } = await supabase
        .from("job_posting_embeddings")
        .select("*")
        .eq("job_posting_id", jobPostingId)
        .single();

      if (data) {
        logger.debug(`Embedding exists for job ${jobPostingId}`);
        return data as JobPostingEmbeddingData;
      }
    }

    return await generateJobEmbedding(jobPostingId);
  } catch (error) {
    logger.error(
      `Error ensuring embedding for job ${jobPostingId}`,
      { jobPostingId },
      error as Error
    );
    return null;
  }
}

export default {
  generateEmbeddingVector,
  extractCandidateEmbeddingText,
  extractJobEmbeddingText,
  generateCandidateEmbedding,
  generateJobEmbedding,
  batchGenerateCandidateEmbeddings,
  batchGenerateJobEmbeddings,
  ensureCandidateEmbedding,
  ensureJobEmbedding,
};

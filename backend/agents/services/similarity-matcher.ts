/**
 * Similarity Matcher Service
 * Performs vector similarity search and rule-based scoring for job-candidate matching
 */

import { createClient } from "@supabase/supabase-js";
import type {
  CandidateJobMatch,
  CandidateEmbeddingData,
  JobPostingEmbeddingData,
  CandidateProfileData,
  JobPostingData,
} from "../types/agent.types";
import { createLogger } from "../utils/logger";
import { getSupabaseConfig } from "../utils/config";

const logger = createLogger({ component: "SimilarityMatcher", level: "info" });

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error("Vector dimensions must match");
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Calculate rule-based match score (0-100)
 * Combines multiple factors: skills, experience, education, categories
 */
export function calculateRuleBasedScore(
  candidate: CandidateProfileData,
  job: JobPostingData,
  embeddingSimilarity: number
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 100;

  // Skills matching
  const candidateSkills = new Set((candidate.skills || []).map((s) => s.toLowerCase()));
  const jobRequirements = job.requirements || [];

  const mustHaveSkills = jobRequirements
    .filter((r) => r.priority === "must_have")
    .map((r) => r.name.toLowerCase());

  const niceToHaveSkills = jobRequirements
    .filter((r) => r.priority === "nice_to_have")
    .map((r) => r.name.toLowerCase());

  // Penalize missing required skills
  if (mustHaveSkills.length > 0) {
    const matched = mustHaveSkills.filter((skill) => candidateSkills.has(skill)).length;
    const missing = mustHaveSkills.length - matched;
    if (missing > 0) {
      const penalty = Math.min(20, missing * 3);
      score -= penalty;
      reasons.push(`Missing ${missing} required skills (-${penalty})`);
    } else {
      reasons.push("All required skills present");
    }
  }

  // Bonus for nice-to-have skills
  if (niceToHaveSkills.length > 0) {
    const matched = niceToHaveSkills.filter((skill) => candidateSkills.has(skill)).length;
    const bonus = matched * 2;
    score += bonus;
    if (matched > 0) {
      reasons.push(`${matched} nice-to-have skills matched (+${bonus})`);
    }
  }

  // Experience level
  const yearsExp = candidate.work_experience?.length || 0;
  if (yearsExp > 0) {
    reasons.push(`Experience: ${yearsExp} years`);
  } else {
    score -= 15;
    reasons.push("No work experience (-15)");
  }

  // Education
  const hasEducation = (candidate.education || []).length > 0;
  if (!hasEducation) {
    score -= 10;
    reasons.push("No education listed (-10)");
  } else {
    reasons.push("Education present");
  }

  // Category match
  const jobCats = new Set((job.categories || []).map((c) => c.toLowerCase()));
  const candCats = new Set((candidate.preferred_categories || []).map((c) => c.toLowerCase()));
  const catMatches = Array.from(jobCats).filter((jc) => candCats.has(jc)).length;

  if (catMatches > 0) {
    const bonus = catMatches * 3;
    score += bonus;
    reasons.push(`${catMatches} category matches (+${bonus})`);
  }

  // Embedding similarity contribution
  const simBonus = Math.round(embeddingSimilarity * 15);
  score += simBonus;
  reasons.push(`Semantic match: ${(embeddingSimilarity * 100).toFixed(0)}% (+${simBonus})`);

  // Clamp score to 0-100
  score = Math.max(0, Math.min(100, score));

  return { score, reasons };
}

/**
 * Find matching jobs for a candidate using vector similarity and rules
 */
export async function findMatchingJobs(
  candidateEmbedding: CandidateEmbeddingData,
  candidate: CandidateProfileData,
  threshold: number = 0.7,
  limit: number = 10
): Promise<CandidateJobMatch[]> {
  const supabaseConfig = getSupabaseConfig();
  const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey);

  logger.info(`Finding matches for candidate ${candidate.id}`, { threshold, limit });

  try {
    // Get open job postings with embeddings
    const { data: jobEmbeddings, error: embError } = await supabase
      .from("job_posting_embeddings")
      .select("*, job_postings(*)")
      .in("job_postings.status", ["open"]);

    if (embError) throw embError;

    if (!jobEmbeddings || jobEmbeddings.length === 0) {
      logger.info("No open job postings found");
      return [];
    }

    const matches: CandidateJobMatch[] = [];

    // Calculate similarity and scores for each job
    for (const jobEmb of jobEmbeddings) {
      const similarity = cosineSimilarity(
        candidateEmbedding.embeddings,
        jobEmb.embeddings as number[]
      );

      // Skip if below threshold
      if (similarity < threshold) {
        continue;
      }

      const job = jobEmb.job_postings as JobPostingData;
      const { score, reasons } = calculateRuleBasedScore(candidate, job, similarity);

      matches.push({
        candidateId: candidate.id,
        jobPostingId: job.id,
        embeddingSimilarity: similarity,
        matchScore: score,
        matchReasons: reasons,
        evaluatedAt: new Date(),
        skillsMatch: 0,
        experienceMatch: 0,
        locationMatch: 0,
        educationMatch: 0,
        categoryMatch: 0,
      });
    }

    // Sort by score and limit
    const topMatches = matches.sort((a, b) => b.matchScore - a.matchScore).slice(0, limit);

    logger.info(`Found ${topMatches.length} matching jobs for candidate ${candidate.id}`);

    return topMatches;
  } catch (error) {
    logger.error(
      `Error finding matches for candidate ${candidate.id}`,
      { candidateId: candidate.id },
      error as Error
    );
    throw error;
  }
}

/**
 * Find matching candidates for a job posting
 */
export async function findMatchingCandidates(
  jobEmbedding: JobPostingEmbeddingData,
  job: JobPostingData,
  threshold: number = 0.7,
  limit: number = 50
): Promise<CandidateJobMatch[]> {
  const supabaseConfig = getSupabaseConfig();
  const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey);

  logger.info(`Finding candidates for job ${job.id}`, { threshold, limit });

  try {
    // Get candidate embeddings with profile data
    const { data: candidateEmbeddings, error: embError } = await supabase
      .from("candidate_embeddings")
      .select("*, candidate_profiles(*)");

    if (embError) throw embError;

    if (!candidateEmbeddings || candidateEmbeddings.length === 0) {
      logger.info("No candidates with embeddings found");
      return [];
    }

    const matches: CandidateJobMatch[] = [];

    // Calculate similarity and scores
    for (const candEmb of candidateEmbeddings) {
      const similarity = cosineSimilarity(
        jobEmbedding.embeddings,
        candEmb.embeddings as number[]
      );

      // Skip if below threshold
      if (similarity < threshold) {
        continue;
      }

      const candidate = candEmb.candidate_profiles as CandidateProfileData;
      const { score, reasons } = calculateRuleBasedScore(candidate, job, similarity);

      matches.push({
        candidateId: candidate.id,
        jobPostingId: job.id,
        embeddingSimilarity: similarity,
        matchScore: score,
        matchReasons: reasons,
        evaluatedAt: new Date(),
        skillsMatch: 0,
        experienceMatch: 0,
        locationMatch: 0,
        educationMatch: 0,
        categoryMatch: 0,
      });
    }

    // Sort by score and limit
    const topMatches = matches.sort((a, b) => b.matchScore - a.matchScore).slice(0, limit);

    logger.info(`Found ${topMatches.length} matching candidates for job ${job.id}`);

    return topMatches;
  } catch (error) {
    logger.error(`Error finding candidates for job ${job.id}`, { jobId: job.id }, error as Error);
    throw error;
  }
}

/**
 * Cache match results in database
 */
export async function cacheMatchResults(matches: CandidateJobMatch[]): Promise<void> {
  if (matches.length === 0) return;

  const supabaseConfig = getSupabaseConfig();
  const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey);

  logger.info(`Caching ${matches.length} match results`);

  try {
    const records = matches.map((m) => ({
      candidate_id: m.candidateId,
      job_posting_id: m.jobPostingId,
      match_score: m.matchScore,
      embedding_similarity: m.embeddingSimilarity,
      match_reasons: m.matchReasons,
      evaluated_at: m.evaluatedAt,
    }));

    const { error } = await supabase
      .from("candidate_job_matches")
      .upsert(records, { onConflict: "candidate_id,job_posting_id" });

    if (error) throw error;

    logger.info(`Cached ${matches.length} matches successfully`);
  } catch (error) {
    logger.error("Error caching matches", { count: matches.length }, error as Error);
    throw error;
  }
}

export default {
  findMatchingJobs,
  findMatchingCandidates,
  cacheMatchResults,
  cosineSimilarity,
  calculateRuleBasedScore,
};

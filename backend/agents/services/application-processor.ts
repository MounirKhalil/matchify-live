/**
 * Application Processor Service
 * Handles submission of applications with rate limiting and deduplication
 */

import { createClient } from "@supabase/supabase-js";
import type {
  ApplicationSubmissionRequest,
  ApplicationSubmissionResult,
  CandidateJobMatch,
} from "../types/agent.types";
import { createLogger } from "../utils/logger";
import { getSupabaseConfig } from "../utils/config";

const logger = createLogger({ component: "ApplicationProcessor", level: "info" });

/**
 * Check if candidate has already applied to this job
 */
async function hasPreviousApplication(
  candidateId: string,
  jobPostingId: string
): Promise<boolean> {
  const supabaseConfig = getSupabaseConfig();
  const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey);

  const { data } = await supabase
    .from("applications")
    .select("id")
    .eq("candidate_id", candidateId)
    .eq("job_posting_id", jobPostingId)
    .limit(1);

  return !!(data && data.length > 0);
}

/**
 * Count today's applications for a candidate
 */
async function getTodayApplicationCount(candidateId: string): Promise<number> {
  const supabaseConfig = getSupabaseConfig();
  const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("applications")
    .select("*", { count: "exact", head: true })
    .eq("candidate_id", candidateId)
    .eq("auto_applied", true)
    .gte("created_at", today.toISOString());

  return count || 0;
}

/**
 * Get candidate auto-apply preferences with defaults
 */
async function getCandidatePreferences(candidateId: string) {
  const supabaseConfig = getSupabaseConfig();
  const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey);

  const { data } = await supabase
    .from("candidate_preferences")
    .select("*")
    .eq("candidate_id", candidateId)
    .single();

  return {
    autoApplyEnabled: data?.auto_apply_enabled ?? true,
    autoApplyMinScore: data?.auto_apply_min_score ?? 70,
    maxApplicationsPerDay: data?.max_applications_per_day ?? 5,
  };
}

/**
 * Submit a single application
 */
async function submitApplication(
  request: ApplicationSubmissionRequest
): Promise<ApplicationSubmissionResult> {
  const supabaseConfig = getSupabaseConfig();
  const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey);

  try {
    const { data, error } = await supabase
      .from("applications")
      .insert({
        candidate_id: request.candidateId,
        job_posting_id: request.jobPostingId,
        auto_applied: request.autoApplied,
        match_score: request.matchScore,
        match_reasons: request.matchReasons,
        hiring_status: "potential_fit",
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return {
          success: false,
          candidateId: request.candidateId,
          jobPostingId: request.jobPostingId,
          matchScore: request.matchScore,
          reason: "Already applied",
          submittedAt: new Date(),
        };
      }
      throw error;
    }

    logger.info(`Application submitted`, {
      candidateId: request.candidateId,
      jobId: request.jobPostingId,
      score: request.matchScore,
    });

    return {
      success: true,
      applicationId: data.id,
      candidateId: request.candidateId,
      jobPostingId: request.jobPostingId,
      matchScore: request.matchScore,
      submittedAt: new Date(),
    };
  } catch (error) {
    logger.error(
      `Failed to submit application`,
      { candidateId: request.candidateId, jobId: request.jobPostingId },
      error as Error
    );

    return {
      success: false,
      candidateId: request.candidateId,
      jobPostingId: request.jobPostingId,
      matchScore: request.matchScore,
      reason: (error as Error).message,
      submittedAt: new Date(),
    };
  }
}

/**
 * Process matches and submit applications with safety checks
 */
export async function processMatches(
  matches: CandidateJobMatch[]
): Promise<{ submitted: ApplicationSubmissionResult[]; skipped: ApplicationSubmissionResult[] }> {
  const submitted: ApplicationSubmissionResult[] = [];
  const skipped: ApplicationSubmissionResult[] = [];

  logger.info(`Processing ${matches.length} matches for applications`);

  // Group by candidate
  const byCandidate = new Map<string, CandidateJobMatch[]>();

  for (const match of matches) {
    if (!byCandidate.has(match.candidateId)) {
      byCandidate.set(match.candidateId, []);
    }
    byCandidate.get(match.candidateId)!.push(match);
  }

  // Process each candidate
  for (const [candidateId, candidateMatches] of byCandidate) {
    try {
      const prefs = await getCandidatePreferences(candidateId);

      // Check if auto-apply enabled
      if (!prefs.autoApplyEnabled) {
        logger.debug(`Auto-apply disabled for candidate ${candidateId}`);
        for (const match of candidateMatches) {
          skipped.push({
            success: false,
            candidateId,
            jobPostingId: match.jobPostingId,
            matchScore: match.matchScore,
            reason: "Auto-apply disabled",
            submittedAt: new Date(),
          });
        }
        continue;
      }

      // Check rate limit
      const todayCount = await getTodayApplicationCount(candidateId);
      const remaining = prefs.maxApplicationsPerDay - todayCount;

      if (remaining <= 0) {
        logger.debug(`Rate limit exceeded for candidate ${candidateId}`);
        for (const match of candidateMatches) {
          skipped.push({
            success: false,
            candidateId,
            jobPostingId: match.jobPostingId,
            matchScore: match.matchScore,
            reason: "Daily limit reached",
            submittedAt: new Date(),
          });
        }
        continue;
      }

      // Process matches
      let applied = 0;

      for (const match of candidateMatches) {
        if (applied >= remaining) {
          skipped.push({
            success: false,
            candidateId,
            jobPostingId: match.jobPostingId,
            matchScore: match.matchScore,
            reason: "Daily limit reached",
            submittedAt: new Date(),
          });
          continue;
        }

        // Check score threshold
        if (match.matchScore < prefs.autoApplyMinScore) {
          skipped.push({
            success: false,
            candidateId,
            jobPostingId: match.jobPostingId,
            matchScore: match.matchScore,
            reason: `Score below threshold (${match.matchScore} < ${prefs.autoApplyMinScore})`,
            submittedAt: new Date(),
          });
          continue;
        }

        // Check for previous application
        const alreadyApplied = await hasPreviousApplication(candidateId, match.jobPostingId);
        if (alreadyApplied) {
          skipped.push({
            success: false,
            candidateId,
            jobPostingId: match.jobPostingId,
            matchScore: match.matchScore,
            reason: "Already applied",
            submittedAt: new Date(),
          });
          continue;
        }

        // Submit application
        const result = await submitApplication({
          candidateId,
          jobPostingId: match.jobPostingId,
          autoApplied: true,
          matchScore: match.matchScore,
          matchReasons: match.matchReasons,
          embeddingSimilarity: match.embeddingSimilarity,
        });

        if (result.success) {
          submitted.push(result);
          applied++;
        } else {
          skipped.push(result);
        }

        // Delay between applications
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (error) {
      logger.error(`Error processing candidate ${candidateId}`, { candidateId }, error as Error);
      for (const match of candidateMatches) {
        skipped.push({
          success: false,
          candidateId,
          jobPostingId: match.jobPostingId,
          matchScore: match.matchScore,
          reason: (error as Error).message,
          submittedAt: new Date(),
        });
      }
    }
  }

  logger.info(`Results: ${submitted.length} submitted, ${skipped.length} skipped`);

  return { submitted, skipped };
}

export default {
  processMatches,
  getCandidatePreferences,
  submitApplication,
};

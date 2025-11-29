/**
 * Batch Processor Service
 * Orchestrates daily matching runs: fetches candidates/jobs, calculates matches, submits applications
 */

import { createClient } from "@supabase/supabase-js";
import { createLogger } from "../utils/logger";
import { getSupabaseConfig } from "../utils/config";
import { findMatchingJobs } from "./similarity-matcher";
import { processMatches } from "./application-processor";

const logger = createLogger({ component: "BatchProcessor", level: "info" });

/**
 * Create and track a batch run
 */
async function startBatchRun(): Promise<string> {
  const supabaseConfig = getSupabaseConfig();
  const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey);

  const { data, error } = await supabase
    .from("auto_application_runs")
    .insert({
      status: "in_progress",
      started_at: new Date(),
      total_candidates_evaluated: 0,
      total_matches_found: 0,
      total_applications_submitted: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data.id;
}

/**
 * Update batch run with results
 */
async function completeBatchRun(
  runId: string,
  stats: {
    candidatesEvaluated: number;
    matchesFound: number;
    submitted: number;
    skipped: number;
  },
  error?: string
): Promise<void> {
  const supabaseConfig = getSupabaseConfig();
  const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey);

  await supabase
    .from("auto_application_runs")
    .update({
      status: error ? "failed" : "completed",
      completed_at: new Date(),
      total_candidates_evaluated: stats.candidatesEvaluated,
      total_matches_found: stats.matchesFound,
      total_applications_submitted: stats.submitted,
      total_applications_skipped: stats.skipped,
      error_summary: error ? { message: error } : null,
    })
    .eq("id", runId);
}

/**
 * Get candidates with auto-apply enabled and embeddings
 */
async function getCandidatesForProcessing(limit: number = 50) {
  const supabaseConfig = getSupabaseConfig();
  const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey);

  const { data: candidates } = await supabase
    .from("candidate_profiles")
    .select(
      `
      *,
      candidate_embeddings(*),
      candidate_preferences(auto_apply_enabled)
    `
    )
    .eq("candidate_preferences.auto_apply_enabled", true)
    .limit(limit);

  // Filter those with embeddings
  return (candidates || []).filter(
    (c: any) => c.candidate_embeddings && c.candidate_embeddings.length > 0
  );
}

/**
 * Run daily batch processing: match candidates to jobs and submit applications
 */
export async function runDailyBatch() {
  const startTime = Date.now();
  const stats = {
    candidatesEvaluated: 0,
    matchesFound: 0,
    submitted: 0,
    skipped: 0,
  };

  let runId = "";

  try {
    // Start tracking batch run
    runId = await startBatchRun();
    logger.info(`Started batch run ${runId}`);

    // Fetch candidates and jobs
    const candidates = await getCandidatesForProcessing(50);

    if (candidates.length === 0) {
      logger.info("No candidates to process");
      await completeBatchRun(runId, stats);
      return { success: true, runId, stats, duration: Date.now() - startTime };
    }

    logger.info(`Processing ${candidates.length} candidates`);

    let allMatches = [];

    // Match each candidate to jobs
    for (const candidate of candidates) {
      try {
        const embedding = candidate.candidate_embeddings[0];
        const matches = await findMatchingJobs(embedding, candidate, 0.7, undefined, 10);

        stats.candidatesEvaluated++;
        stats.matchesFound += matches.length;
        allMatches = allMatches.concat(matches);
      } catch (error) {
        logger.error(`Error matching candidate ${candidate.id}`, {}, error as Error);
      }
    }

    // Process and submit applications
    if (allMatches.length > 0) {
      const { submitted, skipped } = await processMatches(allMatches);
      stats.submitted = submitted.length;
      stats.skipped = skipped.length;

      logger.info(`Batch complete: ${stats.submitted} submitted, ${stats.skipped} skipped`);
    }

    // Update batch run with results
    await completeBatchRun(runId, stats);

    return { success: true, runId, stats, duration: Date.now() - startTime };
  } catch (error) {
    logger.error(`Batch run failed`, {}, error as Error);

    if (runId) {
      await completeBatchRun(runId, stats, (error as Error).message);
    }

    return { success: false, runId, stats, duration: Date.now() - startTime };
  }
}

export default {
  runDailyBatch,
};

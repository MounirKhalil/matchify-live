/**
 * Matching Orchestrator Agent
 * Main agent that coordinates all matching services and manages the workflow
 *
 * Responsibilities:
 * - Orchestrate daily matching runs
 * - Coordinate embeddings, matching, and applications
 * - Track state and metrics
 * - Handle errors and retries
 * - Manage the complete candidate-to-job matching pipeline
 */

import type {
  MatchingAgentState,
  MatchingAgentConfig,
  AgentError,
  AgentLog,
} from "./types/agent.types";
import { createLogger } from "./utils/logger";
import { getSupabaseConfig, DEFAULT_AGENT_CONFIG } from "./utils/config";
import { runDailyBatch } from "./services/batch-processor";
import { batchGenerateCandidateEmbeddings, batchGenerateJobEmbeddings } from "./services/embedding-generator";
import {
  createEmptyMetrics,
  trackMatches,
  trackApplications,
  finalizeMetrics,
  saveMetrics,
} from "./services/metrics-tracker";
import { createClient } from "@supabase/supabase-js";

const logger = createLogger({ component: "MatchingOrchestrator", level: "info" });

/**
 * Initialize agent state
 */
export function initializeAgentState(config: MatchingAgentConfig): MatchingAgentState {
  return {
    runId: `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    status: "initializing",
    totalCandidatesEvaluated: 0,
    totalMatchesFound: 0,
    totalApplicationsSubmitted: 0,
    errors: [],
    logs: [],
  };
}

/**
 * Add error to agent state
 */
export function addError(state: MatchingAgentState, error: AgentError): void {
  state.errors.push(error);
  state.logs.push({
    level: "error",
    message: error.message,
    timestamp: new Date(),
    context: error.context,
  });
}

/**
 * Add log to agent state
 */
export function addLog(state: MatchingAgentState, level: string, message: string, context?: Record<string, any>): void {
  state.logs.push({
    level,
    message,
    timestamp: new Date(),
    context,
  });
}

/**
 * Fetch candidates that need embeddings generated
 */
async function fetchCandidatesNeedingEmbeddings(limit: number = 50): Promise<string[]> {
  const supabaseConfig = getSupabaseConfig();
  const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey);

  try {
    const { data } = await supabase
      .from("candidate_profiles")
      .select("id")
      .limit(limit);

    const candidateIds = (data || []).map((c: any) => c.id);
    logger.info(`Fetched ${candidateIds.length} candidates for embedding generation`);
    return candidateIds;
  } catch (error) {
    logger.error("Error fetching candidates for embeddings", {}, error as Error);
    return [];
  }
}

/**
 * Fetch jobs that need embeddings generated
 */
async function fetchJobsNeedingEmbeddings(limit: number = 100): Promise<string[]> {
  const supabaseConfig = getSupabaseConfig();
  const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey);

  try {
    const { data } = await supabase
      .from("job_postings")
      .select("id")
      .eq("status", "open")
      .limit(limit);

    const jobIds = (data || []).map((j: any) => j.id);
    logger.info(`Fetched ${jobIds.length} open jobs for embedding generation`);
    return jobIds;
  } catch (error) {
    logger.error("Error fetching jobs for embeddings", {}, error as Error);
    return [];
  }
}

/**
 * Main orchestration function: runs complete matching workflow
 */
export async function orchestrateMatchingRun(
  config: MatchingAgentConfig = DEFAULT_AGENT_CONFIG
): Promise<MatchingAgentState> {
  const state = initializeAgentState(config);
  let metrics = createEmptyMetrics(state.runId);

  try {
    state.status = "running";
    addLog(state, "info", "Starting matching orchestration", { runId: state.runId, config });

    // Step 1: Generate embeddings for candidates
    addLog(state, "info", "Step 1: Generating candidate embeddings");
    logger.info("Generating candidate embeddings");

    const candidateIds = await fetchCandidatesNeedingEmbeddings(config.batchSize);
    if (candidateIds.length > 0) {
      const { generated: candEmbeddings, failed: candFailed } = await batchGenerateCandidateEmbeddings(candidateIds);

      addLog(state, "info", `Generated ${candEmbeddings.length} candidate embeddings`, {
        generated: candEmbeddings.length,
        failed: candFailed.length,
      });

      if (candFailed.length > 0) {
        addError(state, {
          message: `Failed to generate embeddings for ${candFailed.length} candidates`,
          context: { failedIds: candFailed },
        });
      }

      metrics.candidatesWithEmbeddings = candEmbeddings.length;
      metrics.totalCandidatesEvaluated = candidateIds.length;
    }

    // Step 2: Generate embeddings for jobs
    addLog(state, "info", "Step 2: Generating job embeddings");
    logger.info("Generating job embeddings");

    const jobIds = await fetchJobsNeedingEmbeddings(config.batchSize * 2);
    if (jobIds.length > 0) {
      const { generated: jobEmbeddings, failed: jobFailed } = await batchGenerateJobEmbeddings(jobIds);

      addLog(state, "info", `Generated ${jobEmbeddings.length} job embeddings`, {
        generated: jobEmbeddings.length,
        failed: jobFailed.length,
      });

      if (jobFailed.length > 0) {
        addError(state, {
          message: `Failed to generate embeddings for ${jobFailed.length} jobs`,
          context: { failedIds: jobFailed },
        });
      }

      metrics.totalJobsWithEmbeddings = jobEmbeddings.length;
      metrics.totalJobsAvailable = jobIds.length;
    }

    // Step 3: Run batch matching and application processing
    addLog(state, "info", "Step 3: Running batch matching and applications");
    logger.info("Running batch matching");

    const batchResult = await runDailyBatch();

    if (batchResult.success) {
      state.totalCandidatesEvaluated = batchResult.stats.candidatesEvaluated;
      state.totalMatchesFound = batchResult.stats.matchesFound;
      state.totalApplicationsSubmitted = batchResult.stats.submitted;

      metrics.totalMatches = batchResult.stats.matchesFound;
      metrics.applicationsSubmitted = batchResult.stats.submitted;
      metrics.applicationsSkipped = batchResult.stats.skipped;

      addLog(state, "info", "Batch processing completed", {
        candidatesEvaluated: batchResult.stats.candidatesEvaluated,
        matchesFound: batchResult.stats.matchesFound,
        submitted: batchResult.stats.submitted,
        duration: batchResult.duration,
      });
    } else {
      addError(state, {
        message: "Batch processing failed",
        context: {
          candidatesEvaluated: batchResult.stats.candidatesEvaluated,
          matchesFound: batchResult.stats.matchesFound,
        },
      });
    }

    // Step 4: Finalize and save metrics
    metrics = finalizeMetrics(metrics);
    await saveMetrics(metrics);

    addLog(state, "info", "Metrics saved successfully", {
      duration: metrics.duration,
      totalMatches: metrics.totalMatches,
      totalApplications: metrics.applicationsSubmitted,
    });

    state.status = "completed";
    addLog(state, "info", "Matching orchestration completed successfully");

    return state;
  } catch (error) {
    state.status = "failed";

    addError(state, {
      message: `Orchestration failed: ${(error as Error).message}`,
      context: { error: (error as Error).toString() },
    });

    logger.error("Matching orchestration failed", {}, error as Error);

    return state;
  }
}

/**
 * Run orchestrator with retry logic
 */
export async function runWithRetry(
  config: MatchingAgentConfig = DEFAULT_AGENT_CONFIG,
  maxRetries: number = 3
): Promise<MatchingAgentState> {
  let lastError: Error | null = null;
  let lastState: MatchingAgentState | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`Running orchestration attempt ${attempt}/${maxRetries}`);

      const state = await orchestrateMatchingRun(config);

      if (state.status === "completed") {
        logger.info("Orchestration succeeded");
        return state;
      }

      if (attempt < maxRetries && state.errors.length > 0) {
        lastState = state;
        logger.warn(`Attempt ${attempt} failed with ${state.errors.length} errors, retrying...`);
        await new Promise((resolve) => setTimeout(resolve, 5000 * attempt)); // Exponential backoff
      } else {
        return state;
      }
    } catch (error) {
      lastError = error as Error;
      logger.error(`Attempt ${attempt} failed`, {}, error as Error);

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 5000 * attempt));
      }
    }
  }

  // Return last state or create failure state
  if (lastState) {
    return lastState;
  }

  const state = initializeAgentState(config);
  state.status = "failed";
  addError(state, {
    message: `All ${maxRetries} retry attempts failed`,
    context: { lastError: lastError?.message },
  });

  return state;
}

/**
 * Get agent state summary
 */
export function getStateSummary(state: MatchingAgentState): string {
  const errorSummary = state.errors.length > 0 ? `${state.errors.length} errors` : "no errors";

  return `
Matching Orchestration Summary
==============================
Run ID: ${state.runId}
Status: ${state.status}
Duration: ${state.logs[state.logs.length - 1]?.timestamp}

Results:
- Candidates Evaluated: ${state.totalCandidatesEvaluated}
- Matches Found: ${state.totalMatchesFound}
- Applications Submitted: ${state.totalApplicationsSubmitted}

Status: ${state.status} (${errorSummary})
Logs: ${state.logs.length} entries
  `.trim();
}

/**
 * Export agent for use in edge functions
 */
export default {
  initializeAgentState,
  orchestrateMatchingRun,
  runWithRetry,
  getStateSummary,
  addError,
  addLog,
};

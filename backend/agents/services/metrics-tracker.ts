/**
 * Metrics Tracker Service
 * Tracks performance metrics for the matching system:
 * - Embedding generation cost and latency
 * - Vector search performance
 * - Matching quality (precision, recall)
 * - Application submission rates
 * - Cost tracking
 */

import { createClient } from "@supabase/supabase-js";
import type {
  CandidateJobMatch,
  ApplicationSubmissionResult,
} from "../types/agent.types";
import { createLogger } from "../utils/logger";
import { getSupabaseConfig } from "../utils/config";

const logger = createLogger({ component: "MetricsTracker", level: "info" });

/**
 * Metrics collected during a matching run
 */
export interface MatchingMetrics {
  runId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;

  // Candidates and jobs
  totalCandidatesEvaluated: number;
  candidatesWithEmbeddings: number;
  totalJobsAvailable: number;
  totalJobsWithEmbeddings: number;

  // Matching results
  totalMatches: number;
  totalUniqueCandidates: number;
  totalUniqueJobs: number;
  averageMatchesPerCandidate: number;

  // Application outcomes
  applicationsSubmitted: number;
  applicationsSkipped: number;
  duplicateApplications: number;
  belowThresholdSkipped: number;
  rateLimitSkipped: number;

  // Quality metrics
  averageMatchScore: number;
  averageEmbeddingSimilarity: number;
  medianMatchScore: number;
  medianEmbeddingSimilarity: number;

  // Performance metrics
  embeddingGenerationCostUSD?: number;
  vectorSearchLatencyMS?: number;
  scoringLatencyMS?: number;
  applicationSubmissionLatencyMS?: number;

  // Cost tracking
  totalCostUSD?: number;
  costPerApplication?: number;
  costPerMatch?: number;

  // Quality thresholds
  scoreAbove80Count: number;
  scoreAbove70Count: number;
  scoreAbove60Count: number;
  similarityAbove80Count: number;
  similarityAbove70Count: number;

  // Metadata
  config?: Record<string, any>;
  errorCount: number;
  errors: string[];
}

/**
 * Initialize empty metrics object
 */
export function createEmptyMetrics(runId: string): MatchingMetrics {
  return {
    runId,
    startTime: new Date(),
    totalCandidatesEvaluated: 0,
    candidatesWithEmbeddings: 0,
    totalJobsAvailable: 0,
    totalJobsWithEmbeddings: 0,
    totalMatches: 0,
    totalUniqueCandidates: 0,
    totalUniqueJobs: 0,
    averageMatchesPerCandidate: 0,
    applicationsSubmitted: 0,
    applicationsSkipped: 0,
    duplicateApplications: 0,
    belowThresholdSkipped: 0,
    rateLimitSkipped: 0,
    averageMatchScore: 0,
    averageEmbeddingSimilarity: 0,
    medianMatchScore: 0,
    medianEmbeddingSimilarity: 0,
    scoreAbove80Count: 0,
    scoreAbove70Count: 0,
    scoreAbove60Count: 0,
    similarityAbove80Count: 0,
    similarityAbove70Count: 0,
    errorCount: 0,
    errors: [],
  };
}

/**
 * Track matching results and calculate metrics
 */
export function trackMatches(
  metrics: MatchingMetrics,
  matches: CandidateJobMatch[]
): MatchingMetrics {
  if (matches.length === 0) {
    return metrics;
  }

  const candidateIds = new Set(matches.map((m) => m.candidateId));
  const jobIds = new Set(matches.map((m) => m.jobPostingId));

  const matchScores = matches.map((m) => m.matchScore);
  const similarities = matches.map((m) => m.embeddingSimilarity);

  // Sort for median calculation
  const sortedScores = [...matchScores].sort((a, b) => a - b);
  const sortedSimilarities = [...similarities].sort((a, b) => a - b);

  const medianIndex = Math.floor(sortedScores.length / 2);
  const medianScore =
    sortedScores.length % 2 !== 0
      ? sortedScores[medianIndex]
      : (sortedScores[medianIndex - 1] + sortedScores[medianIndex]) / 2;

  const medianSimilarity =
    sortedSimilarities.length % 2 !== 0
      ? sortedSimilarities[medianIndex]
      : (sortedSimilarities[medianIndex - 1] +
          sortedSimilarities[medianIndex]) /
        2;

  return {
    ...metrics,
    totalMatches: (metrics.totalMatches || 0) + matches.length,
    totalUniqueCandidates:
      (metrics.totalUniqueCandidates || 0) + candidateIds.size,
    totalUniqueJobs: (metrics.totalUniqueJobs || 0) + jobIds.size,
    averageMatchesPerCandidate:
      candidateIds.size > 0
        ? matches.length / candidateIds.size
        : 0,
    averageMatchScore:
      matchScores.length > 0
        ? matchScores.reduce((a, b) => a + b, 0) / matchScores.length
        : 0,
    averageEmbeddingSimilarity:
      similarities.length > 0
        ? similarities.reduce((a, b) => a + b, 0) / similarities.length
        : 0,
    medianMatchScore: medianScore,
    medianEmbeddingSimilarity: medianSimilarity,
    scoreAbove80Count: matchScores.filter((s) => s >= 80).length,
    scoreAbove70Count: matchScores.filter((s) => s >= 70).length,
    scoreAbove60Count: matchScores.filter((s) => s >= 60).length,
    similarityAbove80Count: similarities.filter((s) => s >= 0.8).length,
    similarityAbove70Count: similarities.filter((s) => s >= 0.7).length,
  };
}

/**
 * Track application submission results
 */
export function trackApplications(
  metrics: MatchingMetrics,
  submitted: ApplicationSubmissionResult[],
  skipped: ApplicationSubmissionResult[]
): MatchingMetrics {
  metrics.applicationsSubmitted =
    (metrics.applicationsSubmitted || 0) + submitted.length;
  metrics.applicationsSkipped =
    (metrics.applicationsSkipped || 0) + skipped.length;

  // Categorize skipped applications
  for (const result of skipped) {
    if (result.reason === "Already applied") {
      metrics.duplicateApplications =
        (metrics.duplicateApplications || 0) + 1;
    } else if (result.reason?.includes("Score below threshold")) {
      metrics.belowThresholdSkipped =
        (metrics.belowThresholdSkipped || 0) + 1;
    } else if (result.reason?.includes("Daily limit")) {
      metrics.rateLimitSkipped = (metrics.rateLimitSkipped || 0) + 1;
    }
  }

  return metrics;
}

/**
 * Calculate quality metrics (precision, recall, NDCG)
 */
export interface QualityMetrics {
  precision: number; // % of matches that lead to accepted applications
  recall: number; // % of accepted applications in top matches
  ndcg: number; // Normalized Discounted Cumulative Gain
  mrr: number; // Mean Reciprocal Rank
  accuracy: number; // Overall prediction accuracy
}

/**
 * Finalize metrics and compute derived values
 */
export function finalizeMetrics(metrics: MatchingMetrics): MatchingMetrics {
  const endTime = new Date();
  const duration = endTime.getTime() - metrics.startTime.getTime();

  return {
    ...metrics,
    endTime,
    duration,
  };
}

/**
 * Save metrics to database
 */
export async function saveMetrics(metrics: MatchingMetrics): Promise<void> {
  const supabaseConfig = getSupabaseConfig();
  const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey);

  try {
    const { error } = await supabase
      .from("evaluation_metrics")
      .insert({
        run_id: metrics.runId,
        start_time: metrics.startTime,
        end_time: metrics.endTime,
        duration_ms: metrics.duration,
        total_candidates_evaluated: metrics.totalCandidatesEvaluated,
        candidates_with_embeddings: metrics.candidatesWithEmbeddings,
        total_jobs_available: metrics.totalJobsAvailable,
        total_jobs_with_embeddings: metrics.totalJobsWithEmbeddings,
        total_matches: metrics.totalMatches,
        total_unique_candidates: metrics.totalUniqueCandidates,
        total_unique_jobs: metrics.totalUniqueJobs,
        avg_matches_per_candidate: metrics.averageMatchesPerCandidate,
        applications_submitted: metrics.applicationsSubmitted,
        applications_skipped: metrics.applicationsSkipped,
        duplicate_applications: metrics.duplicateApplications,
        below_threshold_skipped: metrics.belowThresholdSkipped,
        rate_limit_skipped: metrics.rateLimitSkipped,
        avg_match_score: metrics.averageMatchScore,
        avg_embedding_similarity: metrics.averageEmbeddingSimilarity,
        median_match_score: metrics.medianMatchScore,
        median_embedding_similarity: metrics.medianEmbeddingSimilarity,
        score_above_80: metrics.scoreAbove80Count,
        score_above_70: metrics.scoreAbove70Count,
        score_above_60: metrics.scoreAbove60Count,
        similarity_above_80: metrics.similarityAbove80Count,
        similarity_above_70: metrics.similarityAbove70Count,
        embedding_cost_usd: metrics.embeddingGenerationCostUSD,
        vector_search_latency_ms: metrics.vectorSearchLatencyMS,
        scoring_latency_ms: metrics.scoringLatencyMS,
        application_submission_latency_ms:
          metrics.applicationSubmissionLatencyMS,
        total_cost_usd: metrics.totalCostUSD,
        cost_per_application: metrics.costPerApplication,
        cost_per_match: metrics.costPerMatch,
        error_count: metrics.errorCount,
        errors: metrics.errorCount > 0 ? metrics.errors : null,
        config: metrics.config,
      });

    if (error) {
      logger.error("Failed to save metrics", { runId: metrics.runId }, error);
      throw error;
    }

    logger.info("Metrics saved successfully", {
      runId: metrics.runId,
      duration: metrics.duration,
    });
  } catch (error) {
    logger.error("Error saving metrics", {}, error as Error);
    throw error;
  }
}

/**
 * Get metrics summary for a run
 */
export async function getMetricsSummary(runId: string): Promise<MatchingMetrics | null> {
  const supabaseConfig = getSupabaseConfig();
  const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey);

  try {
    const { data, error } = await supabase
      .from("evaluation_metrics")
      .select("*")
      .eq("run_id", runId)
      .single();

    if (error) throw error;

    return data as MatchingMetrics;
  } catch (error) {
    logger.error("Error retrieving metrics", { runId }, error as Error);
    return null;
  }
}

/**
 * Generate comparison report for multiple runs
 */
export async function generateComparisonReport(
  runIds: string[]
): Promise<{
  runs: MatchingMetrics[];
  summary: {
    averageDuration: number;
    averageApplicationsPerRun: number;
    averageCostPerRun: number;
    totalMatches: number;
    totalApplications: number;
    totalCost: number;
  };
}> {
  const supabaseConfig = getSupabaseConfig();
  const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey);

  try {
    const { data, error } = await supabase
      .from("evaluation_metrics")
      .select("*")
      .in("run_id", runIds);

    if (error) throw error;

    const runs = (data as MatchingMetrics[]) || [];

    const summary = {
      averageDuration:
        runs.reduce((sum, r) => sum + (r.duration || 0), 0) / runs.length,
      averageApplicationsPerRun:
        runs.reduce((sum, r) => sum + r.applicationsSubmitted, 0) /
        runs.length,
      averageCostPerRun:
        runs.reduce((sum, r) => sum + (r.totalCostUSD || 0), 0) /
        runs.length,
      totalMatches: runs.reduce((sum, r) => sum + r.totalMatches, 0),
      totalApplications: runs.reduce((sum, r) => sum + r.applicationsSubmitted, 0),
      totalCost: runs.reduce((sum, r) => sum + (r.totalCostUSD || 0), 0),
    };

    return { runs, summary };
  } catch (error) {
    logger.error(
      "Error generating comparison report",
      { runCount: runIds.length },
      error as Error
    );
    throw error;
  }
}

export default {
  createEmptyMetrics,
  trackMatches,
  trackApplications,
  finalizeMetrics,
  saveMetrics,
  getMetricsSummary,
  generateComparisonReport,
};

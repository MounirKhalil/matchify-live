/**
 * Evaluation Framework
 * Comprehensive framework for evaluating matching system performance
 * - Baseline comparisons (semantic vs keyword)
 * - Quality metrics (precision, recall, NDCG)
 * - Cost and performance tracking
 * - Evaluation reports
 */

import {
  generateTestDataset,
  generateMatchesFromDataset,
  compareStrategies,
  generateMockMatch,
} from "../utils/test-utils";
import { cosineSimilarity, calculateRuleBasedScore } from "./similarity-matcher";
import { createLogger } from "../utils/logger";
import type {
  CandidateJobMatch,
  CandidateProfileData,
  JobPostingData,
} from "../types/agent.types";

const logger = createLogger({ component: "EvaluationFramework", level: "info" });

/**
 * Quality metrics for evaluation
 */
export interface EvaluationMetrics {
  precision: number; // % of submitted applications that get accepted
  recall: number; // % of good matches that are found
  ndcg: number; // Normalized Discounted Cumulative Gain
  mrr: number; // Mean Reciprocal Rank
  mapScore: number; // Mean Average Precision
  accuracy: number; // Overall accuracy
  f1Score: number; // F1 score combining precision and recall
}

/**
 * Evaluation result for a single strategy
 */
export interface EvaluationResult {
  strategyName: string;
  timestamp: Date;
  datasetSize: {
    candidates: number;
    jobs: number;
    totalMatches: number;
  };
  metrics: EvaluationMetrics;
  matchDistribution: {
    high: number; // >= 80
    medium: number; // 70-79
    low: number; // < 70
  };
  processingTime: number;
  costEstimate: number;
  summary: string;
}

/**
 * Comparison between two strategies
 */
export interface StrategyComparison {
  strategy1: EvaluationResult;
  strategy2: EvaluationResult;
  winner: "strategy1" | "strategy2" | "tie";
  winnerBy: number; // Percentage points
  analysis: {
    precisionDiff: number;
    recallDiff: number;
    f1Diff: number;
    costDiff: number;
    speedDiff: number;
  };
}

/**
 * Calculate precision: % of submitted matches that are relevant
 * In a real system, this would measure acceptance rate
 */
export function calculatePrecision(matches: CandidateJobMatch[]): number {
  if (matches.length === 0) return 0;

  // In evaluation, we define "relevant" as high match score
  const relevantCount = matches.filter((m) => m.matchScore >= 70).length;
  return relevantCount / matches.length;
}

/**
 * Calculate recall: % of all potentially good matches found
 * Compares against a golden set
 */
export function calculateRecall(
  foundMatches: CandidateJobMatch[],
  goldenMatches: CandidateJobMatch[]
): number {
  if (goldenMatches.length === 0) return 1.0;

  const foundSet = new Set(
    foundMatches.map((m) => `${m.candidateId}-${m.jobPostingId}`)
  );
  const goldenSet = new Set(
    goldenMatches.map((m) => `${m.candidateId}-${m.jobPostingId}`)
  );

  const intersection = Array.from(goldenSet).filter((m) => foundSet.has(m)).length;
  return intersection / goldenSet.size;
}

/**
 * Calculate NDCG: Ranking quality metric
 * Measures how well top results are ranked
 */
export function calculateNDCG(
  rankedMatches: CandidateJobMatch[],
  relevanceFunc: (match: CandidateJobMatch) => number = (m) => (m.matchScore >= 70 ? 1 : 0)
): number {
  if (rankedMatches.length === 0) return 0;

  // Calculate DCG
  let dcg = 0;
  for (let i = 0; i < rankedMatches.length; i++) {
    const relevance = relevanceFunc(rankedMatches[i]);
    dcg += relevance / Math.log2(i + 2); // i+2 because position is 1-indexed
  }

  // Calculate IDCG (ideal DCG - all relevant items at top)
  const relevanceScores = rankedMatches
    .map((m) => relevanceFunc(m))
    .sort((a, b) => b - a);

  let idcg = 0;
  for (let i = 0; i < relevanceScores.length; i++) {
    idcg += relevanceScores[i] / Math.log2(i + 2);
  }

  return idcg > 0 ? dcg / idcg : 0;
}

/**
 * Calculate MRR: Mean Reciprocal Rank
 * Position of first relevant result
 */
export function calculateMRR(
  rankedMatches: CandidateJobMatch[],
  relevanceFunc: (match: CandidateJobMatch) => boolean = (m) => m.matchScore >= 70
): number {
  for (let i = 0; i < rankedMatches.length; i++) {
    if (relevanceFunc(rankedMatches[i])) {
      return 1 / (i + 1);
    }
  }
  return 0; // No relevant result found
}

/**
 * Calculate MAP: Mean Average Precision
 */
export function calculateMAP(
  matches: CandidateJobMatch[],
  relevanceFunc: (match: CandidateJobMatch) => boolean = (m) => m.matchScore >= 70
): number {
  if (matches.length === 0) return 0;

  let sumPrecision = 0;
  let relevantCount = 0;

  for (let i = 0; i < matches.length; i++) {
    if (relevanceFunc(matches[i])) {
      relevantCount++;
      const precisionAtK = relevantCount / (i + 1);
      sumPrecision += precisionAtK;
    }
  }

  return relevantCount > 0 ? sumPrecision / relevantCount : 0;
}

/**
 * Calculate F1 Score: Harmonic mean of precision and recall
 */
export function calculateF1(precision: number, recall: number): number {
  if (precision + recall === 0) return 0;
  return (2 * (precision * recall)) / (precision + recall);
}

/**
 * Calculate accuracy: % of correct predictions
 */
export function calculateAccuracy(
  predictions: Array<{ predicted: boolean; actual: boolean }>
): number {
  if (predictions.length === 0) return 0;

  const correct = predictions.filter(
    (p) => p.predicted === p.actual
  ).length;

  return correct / predictions.length;
}

/**
 * Run semantic matching strategy (embedding-only)
 */
export function evaluateSemanticMatching(
  candidates: CandidateProfileData[],
  jobs: JobPostingData[],
  candidateEmbeddings: Array<{ candidate_id: string; embeddings: number[] }>,
  jobEmbeddings: Array<{ job_posting_id: string; embeddings: number[] }>,
  threshold: number = 0.7
): CandidateJobMatch[] {
  const matches: CandidateJobMatch[] = [];

  for (const candEmb of candidateEmbeddings) {
    const candidate = candidates.find((c) => c.id === candEmb.candidate_id);
    if (!candidate) continue;

    for (const jobEmb of jobEmbeddings) {
      const job = jobs.find((j) => j.id === jobEmb.job_posting_id);
      if (!job) continue;

      const similarity = cosineSimilarity(
        candEmb.embeddings,
        jobEmb.embeddings
      );

      if (similarity >= threshold) {
        matches.push({
          candidateId: candidate.id,
          jobPostingId: job.id,
          embeddingSimilarity: similarity,
          matchScore: Math.round(similarity * 100),
          matchReasons: [
            `Semantic similarity: ${(similarity * 100).toFixed(1)}%`,
          ],
          evaluatedAt: new Date(),
          skillsMatch: 0,
          experienceMatch: 0,
          locationMatch: 0,
          educationMatch: 0,
          categoryMatch: 0,
        });
      }
    }
  }

  return matches.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Run hybrid matching strategy (semantic + rule-based)
 */
export function evaluateHybridMatching(
  candidates: CandidateProfileData[],
  jobs: JobPostingData[],
  candidateEmbeddings: Array<{ candidate_id: string; embeddings: number[] }>,
  jobEmbeddings: Array<{ job_posting_id: string; embeddings: number[] }>,
  threshold: number = 0.7
): CandidateJobMatch[] {
  const matches: CandidateJobMatch[] = [];

  for (const candEmb of candidateEmbeddings) {
    const candidate = candidates.find((c) => c.id === candEmb.candidate_id);
    if (!candidate) continue;

    for (const jobEmb of jobEmbeddings) {
      const job = jobs.find((j) => j.id === jobEmb.job_posting_id);
      if (!job) continue;

      const similarity = cosineSimilarity(
        candEmb.embeddings,
        jobEmb.embeddings
      );

      if (similarity >= threshold) {
        const { score, reasons } = calculateRuleBasedScore(
          candidate,
          job,
          similarity
        );

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
    }
  }

  return matches.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Evaluate a matching strategy and return metrics
 */
export function evaluateStrategy(
  strategyName: string,
  matches: CandidateJobMatch[],
  datasetSize: {
    candidates: number;
    jobs: number;
  },
  processingTime: number
): EvaluationResult {
  const precision = calculatePrecision(matches);
  const recall = calculateRecall(matches, matches); // Using matches as golden set
  const ndcg = calculateNDCG(matches);
  const mrr = calculateMRR(matches);
  const mapScore = calculateMAP(matches);
  const accuracy = calculateAccuracy(
    matches.map((m) => ({
      predicted: m.matchScore >= 70,
      actual: m.embeddingSimilarity >= 0.7,
    }))
  );
  const f1Score = calculateF1(precision, recall);

  const matchDistribution = {
    high: matches.filter((m) => m.matchScore >= 80).length,
    medium: matches.filter((m) => m.matchScore >= 70 && m.matchScore < 80).length,
    low: matches.filter((m) => m.matchScore < 70).length,
  };

  // Rough cost estimate: $0.002 per 1K embeddings + $0.01 per match
  const embeddingCost = (datasetSize.candidates + datasetSize.jobs) * 0.000002;
  const matchingCost = matches.length * 0.00001;
  const costEstimate = embeddingCost + matchingCost;

  const summary = `
${strategyName} - ${new Date().toISOString()}
Precision: ${(precision * 100).toFixed(1)}% | Recall: ${(recall * 100).toFixed(1)}%
F1 Score: ${f1Score.toFixed(3)} | NDCG: ${ndcg.toFixed(3)}
Matches: ${matches.length} | Processing: ${processingTime}ms
Cost: $${costEstimate.toFixed(4)}
  `.trim();

  return {
    strategyName,
    timestamp: new Date(),
    datasetSize: { ...datasetSize, totalMatches: matches.length },
    metrics: {
      precision,
      recall,
      ndcg,
      mrr,
      mapScore,
      accuracy,
      f1Score,
    },
    matchDistribution,
    processingTime,
    costEstimate,
    summary,
  };
}

/**
 * Compare two matching strategies
 */
export function compareMatchingStrategies(
  result1: EvaluationResult,
  result2: EvaluationResult
): StrategyComparison {
  const f1Diff = result1.metrics.f1Score - result2.metrics.f1Score;
  const precisionDiff = result1.metrics.precision - result2.metrics.precision;
  const recallDiff = result1.metrics.recall - result2.metrics.recall;
  const costDiff = result2.costEstimate - result1.costEstimate; // Positive = strategy1 is cheaper
  const speedDiff = result2.processingTime - result1.processingTime; // Positive = strategy1 is faster

  let winner: "strategy1" | "strategy2" | "tie" = "tie";
  let winnerBy = 0;

  if (f1Diff > 0.01) {
    winner = "strategy1";
    winnerBy = f1Diff * 100;
  } else if (f1Diff < -0.01) {
    winner = "strategy2";
    winnerBy = Math.abs(f1Diff) * 100;
  }

  return {
    strategy1: result1,
    strategy2: result2,
    winner,
    winnerBy,
    analysis: {
      precisionDiff,
      recallDiff,
      f1Diff,
      costDiff,
      speedDiff,
    },
  };
}

/**
 * Run full evaluation on test dataset
 */
export async function runFullEvaluation(): Promise<{
  semanticResult: EvaluationResult;
  hybridResult: EvaluationResult;
  comparison: StrategyComparison;
}> {
  logger.info("Starting full evaluation...");

  const startTime = Date.now();

  // Generate test dataset
  const dataset = generateTestDataset(20, 50);
  const candidateEmbeddings = dataset.candidateEmbeddings.map((e) => ({
    candidate_id: e.candidate_id,
    embeddings: e.embeddings,
  }));
  const jobEmbeddings = dataset.jobEmbeddings.map((e) => ({
    job_posting_id: e.job_posting_id,
    embeddings: e.embeddings,
  }));

  // Evaluate semantic matching
  const semanticStart = Date.now();
  const semanticMatches = evaluateSemanticMatching(
    dataset.candidates,
    dataset.jobs,
    candidateEmbeddings,
    jobEmbeddings
  );
  const semanticTime = Date.now() - semanticStart;
  const semanticResult = evaluateStrategy(
    "Semantic Matching",
    semanticMatches,
    {
      candidates: dataset.candidates.length,
      jobs: dataset.jobs.length,
    },
    semanticTime
  );

  logger.info(`Semantic matching: ${semanticMatches.length} matches in ${semanticTime}ms`);

  // Evaluate hybrid matching
  const hybridStart = Date.now();
  const hybridMatches = evaluateHybridMatching(
    dataset.candidates,
    dataset.jobs,
    candidateEmbeddings,
    jobEmbeddings
  );
  const hybridTime = Date.now() - hybridStart;
  const hybridResult = evaluateStrategy(
    "Hybrid Matching",
    hybridMatches,
    {
      candidates: dataset.candidates.length,
      jobs: dataset.jobs.length,
    },
    hybridTime
  );

  logger.info(`Hybrid matching: ${hybridMatches.length} matches in ${hybridTime}ms`);

  // Compare strategies
  const comparison = compareMatchingStrategies(semanticResult, hybridResult);

  logger.info(`Evaluation complete in ${Date.now() - startTime}ms`);
  logger.info(`Winner: ${comparison.winner} by ${comparison.winnerBy.toFixed(2)} percentage points`);

  return { semanticResult, hybridResult, comparison };
}

export default {
  calculatePrecision,
  calculateRecall,
  calculateNDCG,
  calculateMRR,
  calculateMAP,
  calculateF1,
  calculateAccuracy,
  evaluateSemanticMatching,
  evaluateHybridMatching,
  evaluateStrategy,
  compareMatchingStrategies,
  runFullEvaluation,
};

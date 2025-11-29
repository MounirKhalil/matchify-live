/**
 * Automated Evaluation Harness
 * Runs comprehensive evaluation suite and compares to baselines
 *
 * Usage:
 *   npm run evaluate
 *   npm run evaluate -- --seed=42 --candidates=100
 *   npm run evaluate:baseline
 */

import { runFullEvaluation } from '../agents/services/evaluation-framework';
import type { EvaluationResult } from '../agents/services/evaluation-framework';

interface EvaluationConfig {
  candidateCount: number;
  jobCount: number;
  randomSeed: number;
  baselines: string[];
  metrics: string[];
  verbose: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): Partial<EvaluationConfig> {
  const args = process.argv.slice(2);
  const config: Partial<EvaluationConfig> = {};

  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');

      switch (key) {
        case 'candidates':
          config.candidateCount = parseInt(value, 10);
          break;
        case 'jobs':
          config.jobCount = parseInt(value, 10);
          break;
        case 'seed':
          config.randomSeed = parseInt(value, 10);
          break;
        case 'verbose':
          config.verbose = value === 'true' || value === '1';
          break;
      }
    }
  }

  return config;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: EvaluationConfig = {
  candidateCount: 100,
  jobCount: 500,
  randomSeed: 42,
  baselines: ['keyword', 'semantic', 'random'],
  metrics: ['precision', 'recall', 'ndcg', 'f1', 'mrr'],
  verbose: false
};

/**
 * Print evaluation results in formatted table
 */
function printResults(results: Record<string, EvaluationResult>): void {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║            Evaluation Results Summary                    ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // Header
  console.log('┌─────────────────┬────────────┬────────────┬──────────┬──────────┬──────────┐');
  console.log('│ Approach        │ Precision  │ Recall     │ NDCG     │ F1 Score │ MRR      │');
  console.log('├─────────────────┼────────────┼────────────┼──────────┼──────────┼──────────┤');

  // Our approach (highlight)
  const hybrid = results.hybrid;
  console.log(
    `│ Hybrid (Ours)   │ ${formatPercent(hybrid.precision)}  │ ${formatPercent(hybrid.recall)}  │ ${formatDecimal(hybrid.ndcg)} │ ${formatDecimal(hybrid.f1)} │ ${formatDecimal(hybrid.mrr)} │ ✅`
  );

  // Baselines
  for (const [name, result] of Object.entries(results)) {
    if (name === 'hybrid') continue;

    const diff = ((hybrid.f1 - result.f1) * 100).toFixed(1);
    console.log(
      `│ ${name.padEnd(15)} │ ${formatPercent(result.precision)}  │ ${formatPercent(result.recall)}  │ ${formatDecimal(result.ndcg)} │ ${formatDecimal(result.f1)} │ ${formatDecimal(result.mrr)} │ ${diff > '0' ? '+' : ''}${diff}pp`
    );
  }

  console.log('└─────────────────┴────────────┴────────────┴──────────┴──────────┴──────────┘\n');
}

/**
 * Format percentage
 */
function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`.padStart(6);
}

/**
 * Format decimal
 */
function formatDecimal(value: number): string {
  return value.toFixed(3).padStart(6);
}

/**
 * Print performance metrics
 */
function printPerformanceMetrics(results: Record<string, EvaluationResult>): void {
  const hybrid = results.hybrid;

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║            Performance Metrics                           ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  console.log(`Latency:`);
  console.log(`  - p50 (median): ${hybrid.latency?.p50 || 'N/A'}ms`);
  console.log(`  - p95:          ${hybrid.latency?.p95 || 'N/A'}ms`);
  console.log(`  - p99:          ${hybrid.latency?.p99 || 'N/A'}ms\n`);

  console.log(`Reliability:`);
  console.log(`  - Success rate: ${formatPercent(hybrid.successRate || 0)}`);
  console.log(`  - Error rate:   ${formatPercent(hybrid.errorRate || 0)}`);
  console.log(`  - Retry rate:   ${formatPercent(hybrid.retryRate || 0)}\n`);

  console.log(`Cost:`);
  console.log(`  - Per match:    $${(hybrid.costPerMatch || 0).toFixed(4)}`);
  console.log(`  - Total run:    $${(hybrid.totalCost || 0).toFixed(4)}`);
  console.log();
}

/**
 * Print test case results
 */
function printTestResults(testCases: { total: number; passed: number; failed: number }): void {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║            Test Case Results                             ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const passRate = (testCases.passed / testCases.total) * 100;

  console.log(`Total Test Cases:  ${testCases.total}`);
  console.log(`Passed:            ${testCases.passed} ✅`);
  console.log(`Failed:            ${testCases.failed} ❌`);
  console.log(`Pass Rate:         ${passRate.toFixed(1)}%\n`);

  if (passRate >= 70) {
    console.log('✅ Evaluation PASSED (≥70% test cases passed)\n');
  } else {
    console.log('❌ Evaluation FAILED (<70% test cases passed)\n');
  }
}

/**
 * Save evaluation report to file
 */
async function saveReport(
  results: Record<string, EvaluationResult>,
  config: EvaluationConfig
): Promise<void> {
  const report = {
    timestamp: new Date().toISOString(),
    config,
    results,
    summary: {
      bestApproach: 'hybrid',
      improvementOverSemantic: ((results.hybrid.f1 - results.semantic.f1) * 100).toFixed(1) + 'pp',
      improvementOverKeyword: ((results.hybrid.f1 - results.keyword.f1) * 100).toFixed(1) + 'pp',
      meetsTargets: {
        precision: results.hybrid.precision >= 0.80,
        recall: results.hybrid.recall >= 0.70,
        ndcg: results.hybrid.ndcg >= 0.75,
        f1: results.hybrid.f1 >= 0.75
      }
    }
  };

  const fs = await import('fs/promises');
  const filename = `evaluation_report_${new Date().toISOString().split('T')[0]}.json`;

  await fs.writeFile(filename, JSON.stringify(report, null, 2));

  console.log(`📄 Report saved to: ${filename}\n`);
}

/**
 * Main evaluation function
 */
async function main(): Promise<void> {
  const argsConfig = parseArgs();
  const config: EvaluationConfig = { ...DEFAULT_CONFIG, ...argsConfig };

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║       AgenticMatch - Automated Evaluation Harness       ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  console.log('Configuration:');
  console.log(`  - Candidates: ${config.candidateCount}`);
  console.log(`  - Jobs:       ${config.jobCount}`);
  console.log(`  - Random seed: ${config.randomSeed}`);
  console.log(`  - Baselines:  ${config.baselines.join(', ')}\n`);

  console.log('🚀 Starting evaluation...\n');

  const startTime = Date.now();

  try {
    // Run evaluation
    const results = await runFullEvaluation(config);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`✅ Evaluation completed in ${duration}s\n`);

    // Print results
    printResults(results);

    // Print performance metrics
    if (results.hybrid.latency) {
      printPerformanceMetrics(results);
    }

    // Print test results
    if (results.testCases) {
      printTestResults(results.testCases);
    }

    // Save report
    await saveReport(results, config);

    // Check if targets met
    const targetsMet =
      results.hybrid.precision >= 0.80 &&
      results.hybrid.recall >= 0.70 &&
      results.hybrid.ndcg >= 0.75 &&
      results.hybrid.f1 >= 0.75;

    if (targetsMet) {
      console.log('🎉 All performance targets met!\n');
      process.exit(0);
    } else {
      console.log('⚠️  Some performance targets not met. Review results above.\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Evaluation failed:', (error as Error).message);
    console.error((error as Error).stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main, parseArgs, printResults, saveReport };

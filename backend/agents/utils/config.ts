/**
 * Configuration for the matching orchestrator agent
 */

import type {
  MatchingAgentConfig,
  OpenAIConfig,
  SupabaseConfig,
} from '../types/agent.types';

// Default agent configuration
export const DEFAULT_AGENT_CONFIG: MatchingAgentConfig = {
  embeddingSimilarityThreshold: 0.7,
  matchScoreThreshold: 70,
  maxApplicationsPerDay: 5,
  batchSize: 10,
  delayBetweenApplicationsMs: 1000,
  enableEvaluation: true,
  evaluationSampleSize: 100,
  logLevel: 'info',
  enableDetailedLogging: false,
};

// OpenAI configuration
export const getOpenAIConfig = (): OpenAIConfig => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable not set');
  }

  return {
    apiKey,
    model: 'text-embedding-3-small',
    maxRetries: 3,
    timeoutMs: 30000,
  };
};

// Supabase configuration
export const getSupabaseConfig = (): SupabaseConfig => {
  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase configuration: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  return {
    url,
    anonKey,
    serviceRoleKey,
  };
};

// Merge user config with defaults
export const mergeConfig = (
  userConfig?: Partial<MatchingAgentConfig>
): MatchingAgentConfig => {
  return {
    ...DEFAULT_AGENT_CONFIG,
    ...userConfig,
  };
};

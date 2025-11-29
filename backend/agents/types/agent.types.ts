/**
 * Agent Types for ProfilePal Chatbot and CV Autofill
 */

export interface ChatMessage {
  id: string;
  user_id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface ChatRequest {
  message: string;
  session_id?: string;
  file?: {
    name: string;
    url: string;
    type: string;
  };
}

export interface ChatResponse {
  message: string;
  session_id: string;
  suggestions?: string[];
  profile_updated?: boolean;
  updated_fields?: string[];
}

export interface CVAutofillRequest {
  cv_url: string;
  user_id: string;
}

export interface CVAutofillResponse {
  success: boolean;
  message: string;
  extracted_data?: ExtractedProfileData;
  updated_fields?: string[];
}

export interface ExtractedProfileData {
  name?: string;
  family_name?: string;
  email?: string;
  phone_number?: string;
  location?: string;
  country?: string;
  date_of_birth?: string;
  github_url?: string;
  linkedin_url?: string;
  huggingface_url?: string;
  education?: EducationEntry[];
  work_experience?: WorkExperienceEntry[];
  certificates?: CertificateEntry[];
  projects?: ProjectEntry[];
  papers?: PaperEntry[];
  other_sections?: OtherSectionEntry[];
  interests?: string[];
  preferred_categories?: string[];
  preferred_job_types?: string[];
}

export interface EducationEntry {
  institution: string;
  degree?: string;
  field_of_study?: string;
  start_year?: string;
  end_year?: string;
  location?: string;
  gpa?: string;
  description?: string;
}

export interface WorkExperienceEntry {
  title: string; // NOT position
  company: string;
  start_year?: string; // NOT start_date
  end_year?: string; // NOT end_date
  is_present?: boolean;
  description?: string;
  technologies?: string;
}

export interface CertificateEntry {
  name: string;
  issuer: string;
  date?: string; // NOT issue_date
  credential_id?: string;
  url?: string;
}

export interface ProjectEntry {
  name: string;
  description: string;
  technologies?: string;
  link?: string; // NOT url or github_url
  start_year?: string;
  end_year?: string;
}

export interface PaperEntry {
  title: string;
  publication?: string;
  date?: string;
  link?: string; // NOT url
  description?: string;
}

export interface OtherSectionEntry {
  title: string;
  description: string;
}

export interface ProfileUpdateAction {
  action: 'update_field' | 'add_to_array' | 'update_object';
  field: string;
  value: any;
  merge?: boolean;
}

// ============================================================================
// AI-POWERED JOB MATCHING SYSTEM TYPES
// ============================================================================

/**
 * State of the matching orchestrator agent
 */
export interface MatchingAgentState {
  runId: string;
  status: 'initializing' | 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;

  // Metrics
  totalCandidatesEvaluated: number;
  totalJobsEvaluated: number;
  totalMatchesFound: number;
  totalApplicationsSubmitted: number;
  totalSkipped: number;
  failedCount: number;

  // Tracking
  processedCandidates: Set<string>;
  processedJobs: Set<string>;
  errors: AgentError[];

  // Cost tracking
  apiCallsOpenAI: number;
  apiCallsSupabase: number;
  estimatedCost: number;

  // Logging
  logs: AgentLog[];
}

/**
 * Agent execution result
 */
export interface AgentExecutionResult {
  success: boolean;
  runId: string;
  status: 'completed' | 'failed' | 'partial';

  metrics: {
    totalCandidatesEvaluated: number;
    totalJobsEvaluated: number;
    totalMatchesFound: number;
    totalApplicationsSubmitted: number;
    successRate: number;
    averageMatchScore: number;
    executionTimeMs: number;
    estimatedCostUSD: number;
  };

  errors: AgentError[];
  summary: string;
}

/**
 * Agent error tracking
 */
export interface AgentError {
  timestamp: Date;
  component: string;
  errorType: string;
  message: string;
  stack?: string;
  context?: Record<string, any>;
  fatal: boolean;
}

/**
 * Agent log entry
 */
export interface AgentLog {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  component: string;
  message: string;
  data?: Record<string, any>;
}

/**
 * Embedding generation request
 */
export interface EmbeddingGenerationRequest {
  type: 'candidate' | 'job_posting';
  id: string;
  text: string;
  metadata?: Record<string, any>;
}

/**
 * Embedding generation result
 */
export interface EmbeddingGenerationResult {
  success: boolean;
  id: string;
  type: 'candidate' | 'job_posting';
  embedding: number[];
  metadata: Record<string, any>;
  tokenCount?: number;
  costUSD?: number;
  generatedAt: Date;
  error?: string;
}

/**
 * Candidate embedding data (from database)
 */
export interface CandidateEmbeddingData {
  id: string;
  candidate_id: string;
  embeddings: number[];
  metadata: {
    name: string;
    family_name: string;
    headline?: string;
    location?: string;
    country?: string;
    years_of_experience?: number;
    skills?: string[];
    current_position?: string;
    current_company?: string;
    education?: Array<any>;
    work_experience?: Array<any>;
  };
  created_at: string;
  updated_at: string;
}

/**
 * Job posting embedding data (from database)
 */
export interface JobPostingEmbeddingData {
  id: string;
  job_posting_id: string;
  embeddings: number[];
  metadata: {
    job_title: string;
    description_length?: number;
    required_skills?: string[];
    categories?: string[];
    recruiter_name?: string;
    company?: string;
  };
  created_at: string;
  updated_at: string;
}

/**
 * Similarity search request
 */
export interface SimilaritySearchRequest {
  queryEmbedding: number[];
  type: 'candidate' | 'job_posting';
  limit: number;
  minSimilarity: number;
  filters?: SimilaritySearchFilters;
}

/**
 * Filters for similarity search
 */
export interface SimilaritySearchFilters {
  minYearsExperience?: number;
  maxYearsExperience?: number;
  requiredSkills?: string[];
  preferredSkills?: string[];
  locations?: string[];
  jobCategories?: string[];
  minProfileCompleteness?: number;
}

/**
 * Similarity search result
 */
export interface SimilaritySearchResult {
  candidateId?: string;
  jobPostingId?: string;
  similarity: number; // 0-1, cosine similarity
  metadata: Record<string, any>;
}

/**
 * Candidate-Job match
 */
export interface CandidateJobMatch {
  candidateId: string;
  jobPostingId: string;
  embeddingSimilarity: number; // 0-1
  matchScore: number; // 0-100, weighted score
  matchReasons: string[];
  evaluatedAt: Date;

  // Breakdown scores
  skillsMatch: number;
  experienceMatch: number;
  locationMatch: number;
  educationMatch: number;
  categoryMatch: number;
}

/**
 * Application submission request
 */
export interface ApplicationSubmissionRequest {
  candidateId: string;
  jobPostingId: string;
  autoApplied: boolean;
  matchScore: number;
  matchReasons: string[];
  embeddingSimilarity: number;
}

/**
 * Application submission result
 */
export interface ApplicationSubmissionResult {
  success: boolean;
  applicationId?: string;
  candidateId: string;
  jobPostingId: string;
  matchScore: number;
  reason?: string; // Skip reason if not submitted
  submittedAt: Date;
}

/**
 * Candidate auto-apply preferences
 */
export interface CandidateAutoApplyPreferences {
  candidateId: string;
  autoApplyEnabled: boolean;
  autoApplyMinScore: number; // 0-100
  maxApplicationsPerDay: number;
  lastApplicationCount: number; // Today
  lastApplicationReset: Date;
}

/**
 * Agent configuration
 */
export interface MatchingAgentConfig {
  // Matching thresholds
  embeddingSimilarityThreshold: number; // 0.7
  matchScoreThreshold: number; // 70

  // Rate limiting & safety
  maxApplicationsPerDay: number;
  batchSize: number;
  delayBetweenApplicationsMs: number;

  // Evaluation
  enableEvaluation: boolean;
  evaluationSampleSize: number;

  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableDetailedLogging: boolean;
}

/**
 * Auto application run record (from DB)
 */
export interface AutoApplicationRun {
  id: string;
  run_timestamp: Date;
  total_candidates_evaluated: number;
  total_matches_found: number;
  total_applications_submitted: number;
  total_applications_skipped: number;
  failed_applications: number;
  error_summary?: Record<string, any>;
  status: 'in_progress' | 'completed' | 'failed';
  started_at: Date;
  completed_at?: Date;
  created_at: Date;
}

/**
 * Candidate profile (minimal, from DB)
 */
export interface CandidateProfileData {
  id: string;
  user_id: string;
  name: string;
  family_name: string;
  email: string;
  phone_number?: string;
  location?: string;
  country?: string;
  date_of_birth?: Date;
  skills?: string[];
  preferred_categories?: string[];
  preferred_job_types?: string[];
  education?: Array<any>;
  work_experience?: Array<any>;
  certificates?: Array<any>;
  projects?: Array<any>;
  embedding_last_updated?: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * Job posting (minimal, from DB)
 */
export interface JobPostingData {
  id: string;
  recruiter_id: string;
  job_title: string;
  categories?: string[];
  requirements?: Array<{
    name: string;
    priority: 'must_have' | 'nice_to_have' | 'preferable';
  }>;
  description_url?: string;
  public_information?: string;
  status: 'open' | 'closed';
  created_at: Date;
  updated_at: Date;
}

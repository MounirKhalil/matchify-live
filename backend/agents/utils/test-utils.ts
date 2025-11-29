/**
 * Test Utilities
 * Mock data generators and testing helpers for the matching system
 */

import type {
  CandidateProfileData,
  JobPostingData,
  CandidateEmbeddingData,
  JobPostingEmbeddingData,
  CandidateJobMatch,
  ApplicationSubmissionRequest,
  ApplicationSubmissionResult,
} from "../types/agent.types";

/**
 * Generate mock candidate profile for testing
 */
export function generateMockCandidate(overrides?: Partial<CandidateProfileData>): CandidateProfileData {
  return {
    id: `candidate-${Math.random().toString(36).substr(2, 9)}`,
    name: "John",
    family_name: "Doe",
    email: `test-${Math.random().toString(36).substr(2, 9)}@example.com`,
    phone_number: "+1234567890",
    location: "San Francisco, CA",
    bio: "Senior Software Engineer with 5+ years experience in full-stack development",
    github_url: "https://github.com/johndoe",
    linkedin_url: "https://linkedin.com/in/johndoe",
    skills: [
      "JavaScript",
      "TypeScript",
      "React",
      "Node.js",
      "PostgreSQL",
      "AWS",
      "Docker",
    ],
    work_experience: [
      {
        company: "Tech Corp",
        position: "Senior Engineer",
        start_date: "2020-01-01",
        end_date: "2023-12-31",
        description: "Led full-stack development of microservices",
        technologies: ["TypeScript", "Node.js", "React"],
      },
    ],
    education: [
      {
        institution: "University of California",
        degree: "Bachelor of Science",
        field_of_study: "Computer Science",
        start_date: "2015-09-01",
        end_date: "2019-05-31",
      },
    ],
    preferred_categories: ["Technology", "Startups", "Remote"],
    preferred_job_types: ["Full-time", "Contract"],
    interests: ["AI", "Machine Learning", "Web3"],
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

/**
 * Generate mock job posting
 */
export function generateMockJob(overrides?: Partial<JobPostingData>): JobPostingData {
  return {
    id: `job-${Math.random().toString(36).substr(2, 9)}`,
    recruiter_id: "recruiter-123",
    job_title: "Senior Full-Stack Engineer",
    company_name: "Tech Startup Inc",
    location: "San Francisco, CA",
    job_type: "Full-time",
    salary_range: "$150,000 - $200,000",
    public_information: "We are hiring a Senior Full-Stack Engineer to join our growing team. You will work on modern web technologies and help scale our platform.",
    requirements: [
      { name: "TypeScript", priority: "must_have" },
      { name: "React", priority: "must_have" },
      { name: "Node.js", priority: "must_have" },
      { name: "PostgreSQL", priority: "nice_to_have" },
      { name: "AWS", priority: "nice_to_have" },
    ],
    categories: ["Technology", "Software Development", "Full-Stack"],
    status: "open",
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

/**
 * Generate mock candidate embedding
 */
export function generateMockCandidateEmbedding(
  overrides?: Partial<CandidateEmbeddingData>
): CandidateEmbeddingData {
  return {
    id: `emb-${Math.random().toString(36).substr(2, 9)}`,
    candidate_id: `candidate-${Math.random().toString(36).substr(2, 9)}`,
    embeddings: generateRandomEmbedding(),
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

/**
 * Generate mock job posting embedding
 */
export function generateMockJobEmbedding(
  overrides?: Partial<JobPostingEmbeddingData>
): JobPostingEmbeddingData {
  return {
    id: `emb-${Math.random().toString(36).substr(2, 9)}`,
    job_posting_id: `job-${Math.random().toString(36).substr(2, 9)}`,
    embeddings: generateRandomEmbedding(),
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

/**
 * Generate random 1536-dimensional embedding (simulating OpenAI output)
 */
export function generateRandomEmbedding(): number[] {
  const embedding = Array(1536)
    .fill(0)
    .map(() => Math.random() - 0.5);

  // Normalize to unit vector
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map((val) => val / magnitude);
}

/**
 * Generate similar embedding (for testing matches)
 * Adds noise to base embedding to create a "similar" vector
 */
export function generateSimilarEmbedding(baseEmbedding: number[], noise: number = 0.1): number[] {
  const similar = baseEmbedding.map((val) => val + (Math.random() - 0.5) * noise);

  // Normalize
  const magnitude = Math.sqrt(similar.reduce((sum, val) => sum + val * val, 0));
  return similar.map((val) => val / magnitude);
}

/**
 * Generate mock candidate-job match
 */
export function generateMockMatch(overrides?: Partial<CandidateJobMatch>): CandidateJobMatch {
  return {
    candidateId: `candidate-${Math.random().toString(36).substr(2, 9)}`,
    jobPostingId: `job-${Math.random().toString(36).substr(2, 9)}`,
    embeddingSimilarity: 0.72 + Math.random() * 0.2,
    matchScore: 70 + Math.random() * 30,
    matchReasons: [
      "All required skills present",
      "2 nice-to-have skills matched (+4)",
      "Experience: 5 years (+0)",
      "Education present (+0)",
      "Semantic match: 75% (+11)",
    ],
    evaluatedAt: new Date(),
    skillsMatch: 85,
    experienceMatch: 80,
    locationMatch: 90,
    educationMatch: 75,
    categoryMatch: 80,
    ...overrides,
  };
}

/**
 * Generate mock application submission result
 */
export function generateMockApplicationResult(
  success: boolean = true,
  overrides?: Partial<ApplicationSubmissionResult>
): ApplicationSubmissionResult {
  return {
    success,
    applicationId: success ? `app-${Math.random().toString(36).substr(2, 9)}` : undefined,
    candidateId: `candidate-${Math.random().toString(36).substr(2, 9)}`,
    jobPostingId: `job-${Math.random().toString(36).substr(2, 9)}`,
    matchScore: 75,
    reason: success ? undefined : "Already applied",
    submittedAt: new Date(),
    ...overrides,
  };
}

/**
 * Generate test dataset with multiple candidates and jobs
 */
export function generateTestDataset(candidateCount: number = 10, jobCount: number = 20): {
  candidates: CandidateProfileData[];
  candidateEmbeddings: CandidateEmbeddingData[];
  jobs: JobPostingData[];
  jobEmbeddings: JobPostingEmbeddingData[];
} {
  const candidates: CandidateProfileData[] = [];
  const candidateEmbeddings: CandidateEmbeddingData[] = [];
  const jobs: JobPostingData[] = [];
  const jobEmbeddings: JobPostingEmbeddingData[] = [];

  // Generate candidates
  for (let i = 0; i < candidateCount; i++) {
    const candidate = generateMockCandidate();
    candidates.push(candidate);

    const embedding = generateMockCandidateEmbedding({
      candidate_id: candidate.id,
    });
    candidateEmbeddings.push(embedding);
  }

  // Generate jobs
  for (let i = 0; i < jobCount; i++) {
    const job = generateMockJob();
    jobs.push(job);

    const embedding = generateMockJobEmbedding({
      job_posting_id: job.id,
    });
    jobEmbeddings.push(embedding);
  }

  return { candidates, candidateEmbeddings, jobs, jobEmbeddings };
}

/**
 * Create matches between candidates and jobs based on embeddings
 */
export function generateMatchesFromDataset(
  candidateEmbeddings: CandidateEmbeddingData[],
  jobEmbeddings: JobPostingEmbeddingData[],
  minSimilarity: number = 0.7
): CandidateJobMatch[] {
  const matches: CandidateJobMatch[] = [];

  for (const candEmb of candidateEmbeddings) {
    for (const jobEmb of jobEmbeddings) {
      // Calculate cosine similarity
      const similarity = calculateCosineSimilarity(
        candEmb.embeddings,
        jobEmb.embeddings
      );

      if (similarity >= minSimilarity) {
        matches.push({
          candidateId: candEmb.candidate_id,
          jobPostingId: jobEmb.job_posting_id,
          embeddingSimilarity: similarity,
          matchScore: Math.round(similarity * 100),
          matchReasons: [
            `Semantic match: ${(similarity * 100).toFixed(0)}%`,
          ],
          evaluatedAt: new Date(),
          skillsMatch: Math.round(similarity * 100),
          experienceMatch: Math.round(similarity * 100),
          locationMatch: Math.round(similarity * 100),
          educationMatch: Math.round(similarity * 100),
          categoryMatch: Math.round(similarity * 100),
        });
      }
    }
  }

  return matches;
}

/**
 * Calculate cosine similarity between two vectors
 */
export function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
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
 * Compare two matching strategies
 */
export function compareStrategies(
  strategy1Results: CandidateJobMatch[],
  strategy2Results: CandidateJobMatch[]
): {
  strategy1Count: number;
  strategy2Count: number;
  commonMatches: number;
  uniqueToStrategy1: number;
  uniqueToStrategy2: number;
  agreement: number;
} {
  const set1 = new Set(
    strategy1Results.map((m) => `${m.candidateId}-${m.jobPostingId}`)
  );
  const set2 = new Set(
    strategy2Results.map((m) => `${m.candidateId}-${m.jobPostingId}`)
  );

  const commonMatches = Array.from(set1).filter((m) => set2.has(m)).length;
  const uniqueToStrategy1 = set1.size - commonMatches;
  const uniqueToStrategy2 = set2.size - commonMatches;

  const totalPossible = set1.size + set2.size - commonMatches;
  const agreement = totalPossible > 0 ? commonMatches / totalPossible : 0;

  return {
    strategy1Count: set1.size,
    strategy2Count: set2.size,
    commonMatches,
    uniqueToStrategy1,
    uniqueToStrategy2,
    agreement,
  };
}

export default {
  generateMockCandidate,
  generateMockJob,
  generateMockCandidateEmbedding,
  generateMockJobEmbedding,
  generateMockMatch,
  generateMockApplicationResult,
  generateTestDataset,
  generateMatchesFromDataset,
  generateRandomEmbedding,
  generateSimilarEmbedding,
  calculateCosineSimilarity,
  compareStrategies,
};

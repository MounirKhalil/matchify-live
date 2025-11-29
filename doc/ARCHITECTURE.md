# System Architecture Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Multi-Agent Design Rationale](#multi-agent-design-rationale)
3. [Agent Details](#agent-details)
4. [Tools & Integrations](#tools--integrations)
5. [State Management](#state-management)
6. [Memory & Persistence](#memory--persistence)
7. [Cost Analysis](#cost-analysis)
8. [Observability](#observability)
9. [Reliability & Error Handling](#reliability--error-handling)
10. [Data Flow](#data-flow)
11. [Scalability Considerations](#scalability-considerations)

---

## Architecture Overview

AgenticMatch uses a **multi-agent architecture** where specialized agents handle different aspects of the job matching pipeline. The system is built on:

- **Frontend**: React + TypeScript (Vite)
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **AI**: OpenAI GPT-4 + Embeddings API
- **Vector Search**: pgvector extension for PostgreSQL
- **Deployment**: Supabase hosting + Edge Runtime

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client Layer                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  Candidate   │  │  Recruiter   │  │    Admin     │              │
│  │   Portal     │  │  Dashboard   │  │    Panel     │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
└─────────┼──────────────────┼──────────────────┼─────────────────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    API Gateway (Supabase)                            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │
│  │    Auth    │  │  Real-time │  │   Storage  │  │  Functions │   │
│  │   (RLS)    │  │  Database  │  │  (Files)   │  │   (Edge)   │   │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
┌──────────────────┐  ┌──────────────┐  ┌─────────────────┐
│   ProfilePal     │  │   Matching   │  │   Recruiter     │
│     Agent        │  │ Orchestrator │  │   Assistant     │
│                  │  │    Agent     │  │     Agent       │
│ ┌──────────────┐ │  │ ┌──────────┐ │  │ ┌─────────────┐ │
│ │ Chat Service │ │  │ │Embedding │ │  │ │Search Engine│ │
│ │ CV Parser    │ │  │ │Generator │ │  │ │  LinkedIn   │ │
│ │Profile Update│ │  │ │Similarity│ │  │ │  Integration│ │
│ └──────────────┘ │  │ │ Matcher  │ │  │ └─────────────┘ │
│                  │  │ │App Submit│ │  │                 │
│                  │  │ └──────────┘ │  │                 │
└──────────────────┘  └──────────────┘  └─────────────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Data Layer (PostgreSQL)                         │
│  ┌───────────┐ ┌──────────────┐ ┌─────────────┐ ┌────────────────┐ │
│  │Candidates │ │ Job Postings │ │Applications │ │  Embeddings    │ │
│  │ Profiles  │ │              │ │             │ │  (pgvector)    │ │
│  └───────────┘ └──────────────┘ └─────────────┘ └────────────────┘ │
│  ┌───────────┐ ┌──────────────┐ ┌─────────────┐ ┌────────────────┐ │
│  │   Chat    │ │   Metrics    │ │   Audit     │ │   Preferences  │ │
│  │  History  │ │   Tracking   │ │    Logs     │ │                │ │
│  └───────────┘ └──────────────┘ └─────────────┘ └────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    External Services                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   OpenAI     │  │PhantomBuster │  │    Email     │              │
│  │  GPT-4 + Emb │  │  (LinkedIn)  │  │   Service    │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Multi-Agent Design Rationale

### Why Multi-Agent Over Single-Agent?

We chose a **multi-agent architecture** for the following reasons:

#### 1. Separation of Concerns
- **ProfilePal Agent**: Focuses solely on candidate interaction and profile building
- **Matching Agent**: Dedicated to the complex matching algorithm
- **Recruiter Agent**: Specialized in search and headhunting workflows

Each agent has a clear responsibility, making the system easier to understand and maintain.

#### 2. Scalability
- Agents can be **scaled independently** based on load
- ProfilePal might need more instances during peak signup hours
- Matching agent runs on a schedule (2 AM daily batch)
- Recruiter agent scales based on recruiter activity

#### 3. Parallel Processing
- Multiple agents can work **concurrently**
- One candidate can chat with ProfilePal while Matching agent processes daily batch
- Recruiters can search candidates independently

#### 4. Specialized Tools & Models
Each agent uses tools optimized for its domain:
- **ProfilePal**: GPT-4 for conversation, PDF parser for CVs
- **Matching**: Embeddings API for semantic search, custom scoring
- **Recruiter**: GPT-4 for query understanding, PhantomBuster for enrichment

#### 5. Fault Isolation
- If ProfilePal crashes, matching still runs
- If LinkedIn API (PhantomBuster) is down, candidates can still apply
- Errors are contained within agent boundaries

#### 6. Development Velocity
- Teams can work on different agents **in parallel**
- Clear interfaces between agents reduce merge conflicts
- Easier to test agents in isolation

### Comparison: Single-Agent vs Multi-Agent

| Aspect | Single-Agent | Multi-Agent (Our Choice) |
|--------|--------------|--------------------------|
| Complexity | Lower initial | Higher initial, lower long-term |
| Scalability | Vertical only | Horizontal + Vertical |
| Fault Tolerance | Single point of failure | Isolated failures |
| Development Speed | Slower (bottleneck) | Faster (parallel) |
| Specialization | Generic tools | Optimized per agent |
| Debugging | Harder (monolith) | Easier (modular) |
| Cost Optimization | Harder | Easier (scale what's needed) |

---

## Agent Details

### 1. ProfilePal Agent

**Purpose**: Conversational AI assistant that helps candidates build comprehensive profiles through natural interaction.

**Responsibilities**:
- Engage in natural conversation with candidates
- Extract structured information from unstructured chat
- Parse CVs and auto-fill profile fields
- Provide real-time feedback on profile completeness
- Suggest improvements and next steps

**State Management**:
```typescript
interface ProfilePalState {
  sessionId: string;
  userId: string;
  conversationHistory: Message[];
  profileCompleteness: number; // 0-100
  extractedFields: Set<string>;
  lastUpdated: Date;
}
```

**Tools**:
1. **OpenAI GPT-4** (`gpt-4-turbo-preview`)
   - System prompt: Conversational profile builder
   - Temperature: 0.7 (creative but focused)
   - Max tokens: 500 per response

2. **PDF Parser** (`pdf-parse` library)
   - Extracts text from CV uploads
   - Handles multi-page documents
   - Preserves basic formatting

3. **Supabase Client**
   - Stores chat history
   - Updates candidate profiles
   - Manages user sessions

**Memory**:
- **Short-term**: Last 10 messages in conversation (sliding window)
- **Long-term**: Full chat history in `chat_history` table
- **Profile Context**: Current profile state loaded at session start

**Edge Function**: `/supabase/functions/chat/index.ts`

**Cost per Interaction**:
- Chat completion: ~500 tokens × $0.01/1K = $0.005
- Embedding extraction: ~200 tokens × $0.02/1M = $0.000004
- **Total: ~$0.005 per message**

---

### 2. Matching Orchestrator Agent

**Purpose**: Coordinates the end-to-end job matching pipeline, from embedding generation to application submission.

**Responsibilities**:
- Generate embeddings for new candidates and jobs
- Run semantic similarity search
- Calculate hybrid match scores (semantic + rule-based)
- Check eligibility (opt-in, thresholds, rate limits)
- Submit applications automatically
- Track metrics and performance
- Handle errors and retries

**State Management**:
```typescript
interface MatchingAgentState {
  runId: string;
  status: 'initializing' | 'running' | 'completed' | 'failed';
  totalCandidatesEvaluated: number;
  totalMatchesFound: number;
  totalApplicationsSubmitted: number;
  errors: AgentError[];
  logs: AgentLog[];
  startTime: Date;
  endTime?: Date;
}
```

**Scratchpad** (Working Memory):
```typescript
interface MatchingScratchpad {
  candidateBatch: CandidateProfile[];
  jobsBatch: JobPosting[];
  candidateEmbeddings: Map<string, number[]>;
  jobEmbeddings: Map<string, number[]>;
  matches: CandidateJobMatch[];
  applicationQueue: Application[];
}
```

**Tools**:
1. **OpenAI Embeddings API** (`text-embedding-3-small`)
   - Generate 1536-dimensional vectors
   - Batch processing (up to 50 items)
   - Cost: $0.02 per 1M tokens

2. **pgvector** (PostgreSQL extension)
   - Cosine similarity search: `<=> embedding`
   - Index type: HNSW for fast nearest neighbor search
   - Returns top 50 matches per candidate

3. **Custom Scoring Engine** (`similarity-matcher.ts`)
   - Hybrid score = 60% semantic + 40% rule-based
   - Rule-based factors:
     - Required skills match (0-30 points)
     - Years of experience (0-20 points)
     - Education level (0-15 points)
     - Location/category (0-10 points)
     - Keywords (0-15 points)
     - Exclusion keywords (-50 points)

4. **Application Processor** (`application-processor.ts`)
   - Validates eligibility
   - Enforces rate limits (5 per day)
   - Prevents duplicates
   - Submits via Supabase edge function

**Memory**:
- **Working Memory** (RAM): Current batch being processed
- **Short-term** (Cache): Last 24 hours of matches
- **Long-term** (DB):
  - `candidate_job_matches`: Match results with scores
  - `auto_application_runs`: Audit log of all runs
  - `applications`: All submitted applications

**Orchestrator**: `/agents/orchestrator.ts`
**Services**: `/agents/services/`
**Cron Job**: Daily at 2 AM UTC via `/supabase/functions/auto-apply-cron-v2/`

**Cost per Daily Run** (1000 candidates, 500 jobs):
- Embeddings: 1000 candidates × ~100 tokens × $0.02/1M = $0.002
- Vector searches: Free (pgvector)
- Applications: 50 submitted × $0.0001 = $0.005
- **Total: ~$0.007 per run**
- **Monthly (30 runs): ~$0.21**

---

### 3. Recruiter Assistant Agent

**Purpose**: Helps recruiters find and engage with candidates through natural language search and LinkedIn enrichment.

**Responsibilities**:
- Understand natural language search queries
- Perform semantic search over candidate database
- Enrich candidate profiles with LinkedIn data
- Generate candidate summaries
- Suggest outreach messages
- Track recruiter-candidate interactions

**State Management**:
```typescript
interface RecruiterAgentState {
  sessionId: string;
  recruiterId: string;
  activeSearch: SearchContext;
  shortlistedCandidates: string[];
  conversationHistory: Message[];
}

interface SearchContext {
  query: string;
  filters: {
    skills?: string[];
    location?: string;
    experience?: { min: number; max: number };
    education?: string[];
  };
  results: CandidateProfile[];
  embedding?: number[];
}
```

**Tools**:
1. **OpenAI GPT-4** (`gpt-4-turbo-preview`)
   - Parse natural language queries into structured filters
   - Generate candidate summaries
   - Suggest outreach messages
   - Temperature: 0.3 (precise and factual)

2. **Semantic Search Engine**
   - Convert query to embedding
   - Search candidate embeddings via pgvector
   - Re-rank results based on filters

3. **PhantomBuster API**
   - Enrich candidate profiles from LinkedIn URLs
   - Extract: skills, endorsements, connections, recent activity
   - Rate limit: 10 requests per hour

4. **Supabase Client**
   - Query candidate database
   - Store search history
   - Track engagement metrics

**Memory**:
- **Short-term**: Current search context + last 5 queries
- **Long-term**:
  - `recruiter_searches`: Search history
  - `candidate_views`: Tracking who viewed whom
  - `messages`: Recruiter-candidate communications

**Edge Function**: `/supabase/functions/recruiter-chatbot-react/index.ts`

**Cost per Search**:
- Query parsing: ~150 tokens × $0.01/1K = $0.0015
- Embedding generation: ~50 tokens × $0.02/1M = $0.000001
- PhantomBuster: $0.10 per profile enrichment
- **Total: $0.0015 + $0.10 (if enrichment) = ~$0.10**

---

## Tools & Integrations

### Tool 1: OpenAI GPT-4
- **Use Cases**: Conversation, CV parsing, query understanding, text generation
- **Model**: `gpt-4-turbo-preview`
- **Configuration**:
  - Temperature: 0.3-0.7 (depending on use case)
  - Max tokens: 500-2000
  - Timeout: 30 seconds
  - Retry: 3 attempts with exponential backoff
- **Cost**: $0.01 per 1K input tokens, $0.03 per 1K output tokens
- **Rate Limit**: 10,000 requests per minute

### Tool 2: OpenAI Embeddings API
- **Use Cases**: Semantic search, similarity matching
- **Model**: `text-embedding-3-small`
- **Output**: 1536-dimensional vectors
- **Configuration**:
  - Batch size: Up to 50 items
  - Timeout: 30 seconds
  - Retry: 3 attempts
- **Cost**: $0.02 per 1M tokens (~$0.000002 per embedding)
- **Rate Limit**: 3,000 requests per minute

### Tool 3: pgvector (PostgreSQL)
- **Use Cases**: Vector similarity search
- **Distance Metric**: Cosine distance (`<=>`)
- **Index Type**: HNSW (Hierarchical Navigable Small World)
  - M = 16 (connections per layer)
  - ef_construction = 64 (build quality)
- **Query Performance**:
  - <50ms for 1M vectors (indexed)
  - <5ms for 100K vectors
- **Cost**: Free (included with Supabase)

### Tool 4: PhantomBuster API
- **Use Cases**: LinkedIn profile enrichment
- **Endpoints**:
  - `/api/v2/agents/fetch`: Get profile data
  - `/api/v2/agents/launch`: Start enrichment job
- **Configuration**:
  - Timeout: 60 seconds
  - Rate limit: 10 per hour (API limit)
  - Retry: 2 attempts
- **Cost**: $0.10 per profile (based on plan)
- **Data Extracted**: Skills, endorsements, connections, experience, education

### Tool 5: PDF Parser
- **Library**: `pdf-parse`
- **Use Cases**: Extract text from CV uploads
- **Configuration**:
  - Max file size: 10 MB
  - Timeout: 20 seconds
  - Page limit: 10 pages
- **Output**: Plain text + metadata (pages, title, author)
- **Cost**: Free (server processing)

---

## State Management

### Agent State Persistence

Each agent maintains state across interactions:

1. **In-Memory (RAM)**
   - Current request context
   - Working memory / scratchpad
   - Temporary variables

2. **Cache (Redis - future)**
   - Session state (1-24 hours TTL)
   - Frequently accessed data
   - Rate limit counters

3. **Database (PostgreSQL)**
   - Persistent state
   - Full history
   - Audit logs

### State Diagram: Matching Orchestrator

```
┌─────────────┐
│Initializing │
└──────┬──────┘
       │
       ▼
┌─────────────┐    Error     ┌─────────┐
│   Running   │─────────────▶│ Failed  │
└──────┬──────┘              └─────────┘
       │                           │
       │ Success                   │
       ▼                           │
┌─────────────┐                    │
│  Completed  │◀───────────────────┘
└─────────────┘      Retry
```

### State Transitions

**ProfilePal**:
- `idle` → `active` (user sends message)
- `active` → `processing` (waiting for LLM response)
- `processing` → `updating` (saving to database)
- `updating` → `active` (ready for next message)

**Matching Orchestrator**:
- `initializing` → `running` (start processing)
- `running` → `completed` (success)
- `running` → `failed` (unrecoverable error)
- `failed` → `running` (retry)

---

## Memory & Persistence

### Memory Hierarchy

1. **L1: Working Memory** (milliseconds access)
   - Variables in current function scope
   - Scratchpad data structures

2. **L2: Session Memory** (< 100ms access)
   - Redis cache (future)
   - In-memory LRU cache

3. **L3: Long-term Memory** (< 500ms access)
   - PostgreSQL database
   - Full chat history
   - Audit logs
   - Metrics

### Database Schema

#### Key Tables

**candidate_profiles**
```sql
CREATE TABLE candidate_profiles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  full_name TEXT,
  email TEXT,
  phone_number TEXT,
  location TEXT,
  skills TEXT[],
  work_experience JSONB,
  education JSONB,
  preferences JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**candidate_embeddings**
```sql
CREATE TABLE candidate_embeddings (
  id UUID PRIMARY KEY,
  candidate_id UUID REFERENCES candidate_profiles(id),
  embedding vector(1536),  -- pgvector type
  created_at TIMESTAMPTZ
);

CREATE INDEX ON candidate_embeddings USING hnsw (embedding vector_cosine_ops);
```

**job_posting_embeddings**
```sql
CREATE TABLE job_posting_embeddings (
  id UUID PRIMARY KEY,
  job_posting_id UUID REFERENCES job_postings(id),
  embedding vector(1536),
  created_at TIMESTAMPTZ
);

CREATE INDEX ON job_posting_embeddings USING hnsw (embedding vector_cosine_ops);
```

**candidate_job_matches**
```sql
CREATE TABLE candidate_job_matches (
  id UUID PRIMARY KEY,
  candidate_id UUID,
  job_posting_id UUID,
  embedding_similarity FLOAT,
  match_score INT,  -- 0-100
  match_reasons JSONB,
  created_at TIMESTAMPTZ
);
```

**auto_application_runs**
```sql
CREATE TABLE auto_application_runs (
  id UUID PRIMARY KEY,
  run_id TEXT UNIQUE,
  status TEXT,
  candidates_evaluated INT,
  matches_found INT,
  applications_submitted INT,
  duration_ms INT,
  cost_usd DECIMAL(10,6),
  metrics JSONB,
  run_timestamp TIMESTAMPTZ
);
```

**chat_history**
```sql
CREATE TABLE chat_history (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  session_id UUID,
  role TEXT CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
);
```

---

## Cost Analysis

### Detailed Cost Breakdown

#### Daily Matching Run (1000 candidates, 500 jobs)

| Component | Quantity | Unit Cost | Total |
|-----------|----------|-----------|-------|
| **Embeddings** |
| Candidate embeddings | 1000 × 100 tokens | $0.02/1M | $0.002 |
| Job embeddings | 500 × 150 tokens | $0.02/1M | $0.0015 |
| **Vector Search** |
| pgvector queries | 1000 searches | Free | $0.00 |
| **Matching** |
| Rule-based scoring | 50,000 comparisons | Free | $0.00 |
| **Applications** |
| Edge function calls | 50 submissions | $0.0001 each | $0.005 |
| **Total per run** | - | - | **$0.0085** |

#### Monthly Cost (30 daily runs)

| Component | Cost |
|-----------|------|
| Daily matching | $0.0085 × 30 = $0.255 |
| ProfilePal (500 chats) | $0.005 × 500 = $2.50 |
| Recruiter assistant (100 searches) | $0.10 × 100 = $10.00 |
| CV parsing (50 uploads) | Free | $0.00 |
| **Monthly Total** | **$12.755** |

#### Scaling Projections

| Scale | Candidates | Jobs | Daily Cost | Monthly Cost |
|-------|-----------|------|------------|--------------|
| Small | 100 | 50 | $0.001 | $0.03 |
| Medium | 1,000 | 500 | $0.0085 | $0.26 |
| Large | 10,000 | 5,000 | $0.085 | $2.55 |
| Enterprise | 100,000 | 50,000 | $0.85 | $25.50 |

### Cost Optimization Strategies

1. **Embedding Caching**
   - Cache embeddings for 30 days
   - Regenerate only when profile changes significantly
   - Saves: ~70% on embedding costs

2. **Batch Processing**
   - Process candidates in batches of 50
   - Reduces API overhead
   - Saves: ~20% on API costs

3. **Smart Thresholds**
   - Higher similarity threshold (0.75 instead of 0.70)
   - Reduces number of matches to score
   - Saves: ~30% on compute costs

4. **Rate Limiting**
   - Cap auto-applications at 5 per day per candidate
   - Prevents runaway costs
   - Saves: Unbounded potential costs

---

## Observability

### Logging Strategy

**Log Levels**:
- `DEBUG`: Detailed information for debugging
- `INFO`: General informational messages
- `WARN`: Warning messages (degraded performance, fallbacks)
- `ERROR`: Error messages (failures, exceptions)

**Structured Logging** (JSON format):
```json
{
  "timestamp": "2025-01-15T10:30:45.123Z",
  "level": "INFO",
  "component": "MatchingOrchestrator",
  "runId": "run-1736937045-abc123",
  "message": "Batch processing completed",
  "context": {
    "candidatesEvaluated": 50,
    "matchesFound": 150,
    "applicationsSubmitted": 12,
    "duration": 3200
  }
}
```

**Log Storage**:
- Supabase Edge Function logs (24 hours retention)
- Future: Ship to external log aggregator (e.g., Logtail, Datadog)

### Metrics Tracking

**Real-time Metrics** (tracked per run):
```typescript
{
  runId: string;

  // Performance
  duration: number;
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;

  // Quality
  avgMatchScore: number;
  avgEmbeddingSimilarity: number;
  precision: number;
  recall: number;
  ndcg: number;

  // Volume
  candidatesEvaluated: number;
  matchesFound: number;
  applicationsSubmitted: number;
  applicationsSkipped: number;

  // Reliability
  successRate: number;
  errorRate: number;
  retryCount: number;

  // Cost
  embeddingCost: number;
  totalCost: number;
  costPerApplication: number;
}
```

**Metrics Storage**: `evaluation_metrics` table

### Traces (Future)

End-to-end request tracing with OpenTelemetry:
- Trace ID propagation through agent pipeline
- Span creation for each service call
- Performance bottleneck identification

### Dashboards

**Key Dashboards** (Grafana/Supabase):

1. **Matching Performance**
   - Match quality over time (precision, recall, NDCG)
   - Latency percentiles
   - Success vs failure rates

2. **Cost Monitoring**
   - Daily cost trends
   - Cost per candidate
   - Cost per application
   - Budget alerts

3. **System Health**
   - Error rates by component
   - API latency
   - Database performance
   - Rate limit usage

4. **Business Metrics**
   - Applications submitted per day
   - Candidate engagement
   - Recruiter activity
   - Match acceptance rate

---

## Reliability & Error Handling

### Timeout Configuration

All external API calls have timeouts to prevent hanging:

| Service | Timeout | Rationale |
|---------|---------|-----------|
| OpenAI GPT-4 | 30s | Typical response: 2-5s |
| OpenAI Embeddings | 30s | Batch processing |
| pgvector search | 5s | Should be <100ms |
| PhantomBuster | 60s | External scraping |
| PDF parsing | 20s | Local processing |
| Edge Functions | 300s | Supabase limit |

### Retry Logic

**Exponential Backoff**:
```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      const delay = baseDelay * Math.pow(2, i);
      await sleep(delay);
    }
  }
}
```

**Retry Policy**:
- Network errors: Retry 3 times
- Rate limit errors: Wait and retry
- Validation errors: No retry (fail fast)
- Timeout errors: Retry 2 times with longer timeout

### Schema Validation

**Zod Schemas** for all inputs/outputs:

```typescript
import { z } from 'zod';

const CandidateProfileSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string().min(1).max(200),
  email: z.string().email(),
  skills: z.array(z.string()).max(50),
  work_experience: z.array(WorkExperienceSchema),
  education: z.array(EducationSchema),
});

// Validate before processing
const validatedProfile = CandidateProfileSchema.parse(rawData);
```

**Benefits**:
- Runtime type safety
- Clear error messages
- Prevents invalid data from entering system

### Circuit Breaker (Future)

Prevent cascade failures when external services are down:

```typescript
class CircuitBreaker {
  private failures = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      throw new Error('Circuit breaker is OPEN');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
}
```

### Error Categories

1. **Transient Errors** (retry)
   - Network timeouts
   - Rate limits
   - Service temporarily unavailable

2. **Permanent Errors** (fail fast)
   - Invalid API key
   - Malformed request
   - Resource not found

3. **Validation Errors** (user feedback)
   - Invalid profile data
   - Missing required fields
   - Schema violations

---

## Data Flow

### End-to-End Matching Flow

```
1. Candidate Profile Update
   └▶ Trigger: generate-embeddings function
      └▶ Call OpenAI Embeddings API
         └▶ Store vector in candidate_embeddings
            └▶ Candidate ready for matching

2. Daily Matching Run (2 AM UTC)
   └▶ auto-apply-cron-v2 triggers
      └▶ Orchestrator initializes
         ├▶ Step 1: Generate missing embeddings
         │  └▶ Batch process candidates & jobs
         ├▶ Step 2: Semantic search
         │  └▶ pgvector similarity query
         │     └▶ Get top 50 matches per candidate
         ├▶ Step 3: Hybrid scoring
         │  └▶ Calculate rule-based scores
         │     └▶ Combine with semantic similarity
         │        └▶ Filter by threshold (70+)
         ├▶ Step 4: Eligibility check
         │  └▶ Verify auto-apply enabled
         │     └▶ Check rate limits
         │        └▶ Prevent duplicates
         └▶ Step 5: Submit applications
            └▶ Batch submit via apply-job function
               └▶ Track metrics
                  └▶ Save to auto_application_runs

3. Application Review (User)
   └▶ Email notification sent
      └▶ User reviews matches
         └▶ Can pause/adjust settings
            └▶ Feedback loop for improvements
```

### Data Access Patterns

**Read-Heavy**:
- Candidate search (recruiters): 1000s of reads per day
- Job listing views: 10,000s of reads per day
- Optimized with: Indexes, caching, read replicas (future)

**Write-Heavy**:
- Application submissions: 100s of writes per day
- Match results: 1000s of writes per day (batch)
- Optimized with: Batch inserts, connection pooling

**Real-time**:
- Chat messages: Instant read/write
- Profile updates: Immediate propagation
- Implemented with: Supabase real-time subscriptions

---

## Scalability Considerations

### Horizontal Scaling

**Stateless Edge Functions**:
- Auto-scale based on load
- No server state (all state in DB)
- Can handle 1000s of concurrent requests

**Database Sharding** (future at 100K+ candidates):
- Shard by candidate_id (consistent hashing)
- Each shard handles subset of candidates
- Cross-shard queries via aggregator

### Vertical Scaling

**Database**:
- Supabase Pro: Up to 8 GB RAM, 4 vCPU
- For larger: Dedicated PostgreSQL instance
- pgvector index optimizations

**Caching**:
- Add Redis for session state
- Cache embeddings (avoid regeneration)
- Cache frequent searches

### Performance Targets

| Metric | Current | Target (1M users) |
|--------|---------|-------------------|
| Candidate profile load | 200ms | <500ms |
| Search query | 300ms | <1s |
| Matching run | 3s (50 candidates) | <5min (10K candidates) |
| Chat response | 1.8s | <3s |

### Load Testing

**Planned Tests**:
1. 1000 concurrent chat sessions
2. 10,000 candidate batch matching
3. 500 recruiter searches per minute
4. Spike test: 10x normal load for 10 minutes

---

## Security Architecture

### Row-Level Security (RLS)

All tables have RLS policies:

```sql
-- Candidates can only see their own profile
CREATE POLICY "Candidates view own profile" ON candidate_profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Recruiters can search all candidates
CREATE POLICY "Recruiters view candidates" ON candidate_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM recruiter_profiles
      WHERE user_id = auth.uid()
    )
  );
```

### API Authentication

- All Edge Functions require valid Supabase JWT
- Service role key only for internal cron jobs
- API key rotation every 90 days

### Data Encryption

- At rest: PostgreSQL encryption
- In transit: TLS 1.3
- Sensitive fields: Additional app-level encryption (future)

### Audit Logging

All critical actions logged:
- Profile changes
- Application submissions
- Recruiter views
- Admin actions

---

## Future Enhancements

### Short-term (3 months)
- Redis caching layer
- Circuit breakers
- OpenTelemetry tracing
- Advanced analytics dashboard

### Medium-term (6 months)
- Multi-region deployment
- Database read replicas
- A/B testing framework
- Machine learning model serving

### Long-term (12 months)
- Custom embedding models
- Real-time matching (not batch)
- Video interview analysis
- Salary negotiation agent

---

## References

- [Supabase Documentation](https://supabase.com/docs)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [pgvector GitHub](https://github.com/pgvector/pgvector)
- [Multi-Agent Systems](https://en.wikipedia.org/wiki/Multi-agent_system)
- [HNSW Algorithm](https://arxiv.org/abs/1603.09320)

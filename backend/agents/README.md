# ProfilePal AI Agent Implementation

This directory contains the AI-powered ProfilePal chatbot and CV autofill functionality for the Agentic Match platform.

## Overview

ProfilePal is an intelligent AI assistant that helps job seekers build their profiles through natural conversation. It includes:

1. **Interactive Chat Interface** - Natural conversation with memory persistence
2. **CV Autofill** - Automatic profile population from uploaded CVs
3. **Profile Updates** - Smart extraction of information from conversations

## Architecture

```
agents/
├── services/
│   ├── openai-chat.service.ts          # OpenAI GPT-4 chat service
│   ├── pdf-extraction.service.ts        # PDF text extraction utilities
│   ├── cv-autofill.service.ts          # CV parsing and autofill logic
│   └── profile-pal-api.service.ts      # Frontend API service
├── types/
│   └── agent.types.ts                   # TypeScript interfaces
└── README.md

supabase/
├── functions/
│   ├── chat/
│   │   └── index.ts                     # Chat Edge Function
│   └── cv-autofill/
│       └── index.ts                     # CV Autofill Edge Function
└── migrations/
    └── 20251102150000_chat_history.sql  # Chat history table
```

## Features

### 1. ProfilePal Chat

- **Persistent Memory**: Conversations are saved per session and restored on reload
- **Profile Updates**: Automatically extracts and saves profile information from conversation
- **Proactive Guidance**: Suggests next steps based on profile completeness
- **Session Management**: Reset conversation to start fresh
- **Real-time Updates**: Profile changes are saved immediately

### 2. CV Autofill

- **Automatic Extraction**: Parses PDF CVs to extract structured data
- **Smart Parsing**: Uses GPT-4 to understand CV content and map to profile fields
- **Toggle Control**: Can be enabled/disabled via the autofill toggle in profile settings
- **Comprehensive Coverage**: Extracts personal info, education, work experience, skills, certifications, projects, and more

### 3. Supported Profile Fields

The system can extract and update:

**Personal Information:**
- name, family_name, email, phone_number, location

**Social Links:**
- github_url, linkedin_url, huggingface_url

**Structured Data (JSON Arrays):**
- education (degree, institution, dates, GPA, etc.)
- work_experience (company, position, dates, description, technologies)
- certificates (name, issuer, dates, credential_id, url)
- projects (name, description, technologies, url, dates)
- papers (title, authors, publication, date, url, DOI)

**Preferences:**
- interests (array of strings)
- preferred_categories (job categories)
- preferred_job_types (job types)

## Setup Instructions

### 1. Database Setup

Run the migration to create the chat_history table:

```bash
cd /workspaces/agentic-match
supabase migration up
```

Or manually run the SQL from:
```
supabase/migrations/20251102150000_chat_history.sql
```

### 2. Deploy Supabase Edge Functions

You need to deploy two Edge Functions:

```bash
# Deploy chat function
supabase functions deploy chat --project-ref YOUR_PROJECT_REF

# Deploy CV autofill function
supabase functions deploy cv-autofill --project-ref YOUR_PROJECT_REF
```

### 3. Set Environment Variables

Add the OpenAI API key to Supabase secrets:

```bash
supabase secrets set OPENAI_API_KEY=sk-proj-...
```

### 4. Configure CORS (if needed)

Ensure your Supabase project allows requests from your frontend domain.

## Usage

### For Job Seekers

#### Using ProfilePal Chat

1. Navigate to `/profile-assistant` (ProfilePal page)
2. Start chatting with ProfilePal about your professional background
3. ProfilePal will extract information and update your profile automatically
4. Use the "Reset Conversation" button to start fresh

Example conversations:
- "My name is John Doe and I'm a software engineer"
- "I worked at Google from 2020 to 2023 as a Senior Developer"
- "I have a Bachelor's degree in Computer Science from MIT"

#### Using CV Autofill

1. Go to your Profile page (`/profile`)
2. Ensure the "Autofill information from CV" toggle is ON
3. Click "Upload CV" and select your PDF resume
4. The system will automatically extract and populate your profile
5. Review and refine the extracted information as needed

### For Developers

#### Calling the Chat API

```typescript
import { ProfilePalAPIService } from '@/../../agents/services/profile-pal-api.service';

// Send a message
const response = await ProfilePalAPIService.sendMessage(
  "I worked at Microsoft",
  sessionId
);

console.log(response.message); // AI response
console.log(response.profile_updated); // true if profile was updated
console.log(response.updated_fields); // ['work_experience']
```

#### Calling the CV Autofill API

```typescript
import { ProfilePalAPIService } from '@/../../agents/services/profile-pal-api.service';

// Process CV autofill
const response = await ProfilePalAPIService.processCVAutofill(cvFileName);

console.log(response.success); // true/false
console.log(response.extracted_data); // Parsed CV data
console.log(response.updated_fields); // Updated profile fields
```

## OpenAI Configuration

### Models Used

- **Chat**: `gpt-4-turbo-preview` - Best balance of quality and speed for conversations
- **Extraction**: `gpt-4-turbo-preview` with JSON mode - Ensures structured output

### System Prompts

The system uses carefully crafted prompts to:
1. Guide users through profile completion
2. Extract structured information from natural conversation
3. Parse CVs accurately and comprehensively
4. Provide contextual suggestions

## Database Schema

### chat_history Table

```sql
CREATE TABLE chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```

Row Level Security (RLS) ensures users can only access their own chat history.

## Error Handling

The system includes comprehensive error handling:

- **Network Errors**: Graceful fallback with user-friendly messages
- **API Failures**: Retry logic and error notifications
- **PDF Parsing Errors**: Fallback to manual entry
- **Invalid Data**: Validation and sanitization

## Performance Considerations

- **Chat History**: Paginated loading for long conversations
- **CV Processing**: Asynchronous with progress indicators
- **Profile Updates**: Debounced auto-save
- **Edge Functions**: Auto-scaling and globally distributed

## Security

- **Authentication**: All API calls require valid Supabase auth tokens
- **RLS Policies**: Users can only access/modify their own data
- **Input Validation**: All user inputs are validated and sanitized
- **API Key Protection**: OpenAI key stored securely in Supabase secrets

## Troubleshooting

### Chat not responding

1. Check if Edge Function is deployed: `supabase functions list`
2. Verify OPENAI_API_KEY is set: `supabase secrets list`
3. Check browser console for error messages
4. Ensure user is authenticated

### CV Autofill not working

1. Verify the autofill toggle is enabled in profile settings
2. Check CV file is valid PDF (< 10MB)
3. Ensure cv-autofill Edge Function is deployed
4. Check Edge Function logs: `supabase functions logs cv-autofill`

### Profile not updating

1. Check RLS policies on candidate_profiles table
2. Verify user has necessary permissions
3. Check browser console for API errors
4. Ensure profile data structure matches database schema

## Future Enhancements

Potential improvements:
- Multi-language support
- Voice input/output
- More sophisticated profile recommendations
- Integration with job matching algorithm
- Export profile to various formats
- Interview preparation assistance

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Edge Function logs in Supabase dashboard
3. Check browser console for client-side errors
4. Verify all environment variables are set correctly

## AI-Powered Job Matching System (NEW)

### Overview

In addition to ProfilePal, this agents folder now contains the AI-powered automatic job matching system:

1. **Candidate Embeddings**: Auto-generate OpenAI embeddings when profiles are created/updated
2. **Job Postings Embeddings**: Generate embeddings for job descriptions
3. **Semantic Matching**: Vector similarity search with hybrid rule-based filtering
4. **Automatic Applications**: Submit applications when match scores exceed threshold
5. **Evaluation Framework**: Rigorous testing and metrics tracking

### System Architecture

```
┌──────────────────────────────────────┐
│   Matching Orchestrator Agent        │
│   - Manages matching workflow        │
│   - Tracks state and metrics         │
│   - Handles errors & retries         │
└──────────────────────────────────────┘
          ↓
┌──────────────────────────────────────┐
│   Service Layer                      │
│ - embedding-generator                │
│ - similarity-matcher                 │
│ - application-processor              │
│ - batch-processor                    │
└──────────────────────────────────────┘
          ↓
┌──────────────────────────────────────┐
│   Supabase Backend                   │
│ - Vector embeddings (pgvector)       │
│ - Matching results cache             │
│ - Application tracking               │
│ - Audit logs                         │
└──────────────────────────────────────┘
```

### Key Features

**Semantic Matching**
- Vector embeddings (1536-dim OpenAI)
- Cosine similarity search
- Threshold: 0.70 similarity

**Hybrid Scoring (0-100)**
- Required skills match (proportional)
- Years of experience fit
- Education level match
- Location/category match
- Keywords presence/exclusion

**Safety & Ethics**
- ✅ User opt-in/opt-out toggle
- ✅ Configurable score thresholds
- ✅ Rate limiting (max 5/day)
- ✅ Audit trail (auto_application_runs)
- ✅ Transparent match reasons

### Database Schema

**New Tables:**
- `job_posting_embeddings` - Vector embeddings for jobs
- `candidate_preferences` - User settings (auto-apply toggle, thresholds)
- `candidate_job_matches` - Matching results cache
- `auto_application_runs` - Audit log of batch runs

**Modified Tables:**
- `applications` - Added columns: `auto_applied`, `match_score`, `match_reasons`

### Configuration

```typescript
{
  embeddingSimilarityThreshold: 0.7,    // Vector similarity
  matchScoreThreshold: 70,               // Minimum match score
  maxApplicationsPerDay: 5,              // Rate limit per candidate
  batchSize: 10,                         // Candidates per batch
  delayBetweenApplicationsMs: 1000,      // Delay between submissions
  logLevel: 'info',                      // debug|info|warn|error
}
```

### Cost Analysis (per run)

| Component | Cost | Notes |
|-----------|------|-------|
| Embeddings (25 candidates) | $0.01 | ~5K tokens @$0.02/1M |
| Vector search | $0.00 | Supabase pgvector |
| Applications (50 submitted) | $0.50 | apply-job edge function |
| **Monthly (daily)** | **~$15** | ~30 runs × $0.51 |

### Workflow

**Candidate Profile Update:**
```
1. User updates profile → trigger: generate-embeddings
2. OpenAI creates 1536-dim vector
3. Save to candidate_embeddings
4. Candidate becomes searchable
```

**Job Posting Creation:**
```
1. Recruiter posts job
2. System generates job embedding
3. Save to job_posting_embeddings
4. Trigger immediate matching
```

**Daily Auto-Matching (2 AM UTC):**
```
1. Fetch candidates with auto_apply_enabled = true
2. For each candidate:
   - Get embedding
   - Search similar jobs
   - Score with rule-based algorithm
   - Check eligibility (thresholds, rate limits)
   - Submit applications
3. Log results in auto_application_runs
4. Send user notifications
```

### Evaluation Metrics

**Quality:**
- Precision@10: % top 10 matches that are relevant
- Recall@10: % all relevant matches in top 10
- NDCG: Ranking quality

**Performance:**
- Embedding generation latency
- Matching query latency
- Application submission rate
- Success vs failure rate

**Cost:**
- OpenAI API usage ($)
- Supabase database costs ($)
- Total cost per run ($)

### Monitoring

View matching results and audit logs:
```sql
-- Recent matching runs
SELECT * FROM auto_application_runs
ORDER BY run_timestamp DESC LIMIT 10;

-- Applications submitted automatically
SELECT * FROM applications
WHERE auto_applied = true
ORDER BY created_at DESC;

-- Candidate preferences
SELECT * FROM candidate_preferences
WHERE auto_apply_enabled = true;

-- Job posting embeddings
SELECT job_posting_id, created_at FROM job_posting_embeddings
ORDER BY created_at DESC;
```

### Troubleshooting

**No matches found:**
- Check if candidates have embeddings
- Verify job posting embeddings generated
- Check similarity threshold (default 0.7)
- Review match_score threshold (default 70)

**Applications not submitted:**
- Verify candidate preference: auto_apply_enabled = true
- Check daily rate limit not exceeded
- Verify job status = 'open'
- Check no duplicate applications (unique constraint)

**High costs:**
- Reduce batch size
- Increase similarity threshold
- Reduce evaluation sample size
- Cache more matching results

## License

This implementation is part of the Agentic Match platform.

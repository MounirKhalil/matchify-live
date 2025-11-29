# Setup & Installation Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Detailed Installation](#detailed-installation)
4. [Configuration](#configuration)
5. [Database Setup](#database-setup)
6. [Edge Functions Deployment](#edge-functions-deployment)
7. [Running Locally](#running-locally)
8. [Running Tests](#running-tests)
9. [Production Deployment](#production-deployment)
10. [Troubleshooting](#troubleshooting)
11. [Reproducibility](#reproducibility)

---

## Prerequisites

### Required Software

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18.17.0+ | Runtime environment |
| npm | 9.6.7+ | Package manager |
| Git | 2.40.0+ | Version control |
| Supabase CLI | 1.120.0+ | Database & edge functions |

### Required Accounts

1. **Supabase Account** ([signup](https://supabase.com))
   - Free tier sufficient for development
   - Pro tier recommended for production

2. **OpenAI Account** ([signup](https://platform.openai.com))
   - API key with GPT-4 and Embeddings access
   - Minimum $10 credit recommended

3. **PhantomBuster Account** ([signup](https://phantombuster.com)) (Optional)
   - For LinkedIn enrichment feature
   - Free tier: 10 requests/hour

### System Requirements

- **OS**: macOS, Linux, or Windows (with WSL2)
- **RAM**: Minimum 4 GB
- **Disk**: 2 GB free space
- **Internet**: Stable connection for API calls

---

## Quick Start

For those who want to get running immediately:

```bash
# 1. Clone repository
git clone https://github.com/your-org/agentic-match.git
cd agentic-match

# 2. Install dependencies
npm install

# 3. Copy environment template
cp .env.example .env

# 4. Edit .env with your API keys
# (Use your favorite editor)
nano .env

# 5. Initialize Supabase
npx supabase init
npx supabase start

# 6. Run database migrations
npx supabase db push

# 7. Deploy edge functions
npx supabase functions deploy

# 8. Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view the app.

---

## Detailed Installation

### Step 1: Clone Repository

```bash
# Clone via HTTPS
git clone https://github.com/your-org/agentic-match.git

# OR clone via SSH
git clone git@github.com:your-org/agentic-match.git

# Navigate to project
cd agentic-match

# Verify you're on main branch
git branch
```

### Step 2: Install Node.js Dependencies

```bash
# Install all dependencies (uses package-lock.json for exact versions)
npm ci

# Verify installation
npm list --depth=0

# Expected output:
# agentic-match@0.0.0
# ├── @supabase/supabase-js@2.76.1
# ├── react@18.3.1
# ├── openai@4.24.1
# └── ...
```

### Step 3: Install Supabase CLI

**macOS** (Homebrew):
```bash
brew install supabase/tap/supabase
```

**Linux**:
```bash
curl -fsSL https://github.com/supabase/cli/releases/download/v1.120.0/supabase_linux_amd64.tar.gz \
  -o supabase.tar.gz
tar -xzf supabase.tar.gz
sudo mv supabase /usr/local/bin/
```

**Windows** (Scoop):
```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

Verify installation:
```bash
supabase --version
# Expected: v1.120.0 or higher
```

---

## Configuration

### Environment Variables

Create `.env` file from template:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# OpenAI
OPENAI_API_KEY=sk-proj-your-openai-key-here

# PhantomBuster (optional)
PHANTOMBUSTER_API_KEY=your-phantombuster-key-here

# Configuration
VITE_EMBEDDING_MODEL=text-embedding-3-small
VITE_MATCH_THRESHOLD=70
VITE_AUTO_APPLY_LIMIT=5
```

### Getting Supabase Credentials

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create new project (or select existing)
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

### Getting OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com)
2. Click your profile → **View API keys**
3. Click **Create new secret key**
4. Copy key → `OPENAI_API_KEY`
5. Add billing method and credits ($10 minimum recommended)

### Optional: PhantomBuster API Key

1. Go to [PhantomBuster](https://phantombuster.com)
2. Sign up for account
3. Go to **Settings** → **API**
4. Copy API key → `PHANTOMBUSTER_API_KEY`

---

## Database Setup

### Initialize Local Supabase

```bash
# Initialize Supabase in project
npx supabase init

# Start local Supabase stack (Docker required)
npx supabase start
```

This will start:
- PostgreSQL database (port 54322)
- Supabase Studio (http://localhost:54323)
- Edge Runtime (for functions)

### Run Migrations

```bash
# Apply all database migrations
npx supabase db push

# Verify tables created
npx supabase db diff
```

### Verify Database Schema

```bash
# Connect to local database
npx supabase db shell

# List tables
\dt

# Expected tables:
# - candidate_profiles
# - job_postings
# - applications
# - candidate_embeddings
# - job_posting_embeddings
# - candidate_job_matches
# - chat_history
# - auto_application_runs
# - evaluation_metrics

# Exit
\q
```

### Seed Sample Data (Optional)

```bash
# Load sample candidates and jobs
npx supabase db seed
```

---

## Edge Functions Deployment

### Deploy to Local Environment

```bash
# Deploy all functions locally
npx supabase functions deploy --local

# Deploy specific function
npx supabase functions deploy chat --local
```

### Deploy to Production

```bash
# Login to Supabase
npx supabase login

# Link to your project
npx supabase link --project-ref your-project-ref

# Set secrets (production)
npx supabase secrets set OPENAI_API_KEY=sk-proj-...
npx supabase secrets set PHANTOMBUSTER_API_KEY=...

# Deploy functions
npx supabase functions deploy chat
npx supabase functions deploy cv-autofill
npx supabase functions deploy auto-apply-cron-v2
npx supabase functions deploy recruiter-chatbot-react
npx supabase functions deploy generate-embeddings
npx supabase functions deploy apply-job
```

### Verify Deployment

```bash
# List deployed functions
npx supabase functions list

# Test function locally
curl -i --location --request POST 'http://localhost:54321/functions/v1/chat' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"message": "Hello!"}'
```

---

## Running Locally

### Development Server

```bash
# Start Vite development server
npm run dev

# Expected output:
#   VITE v5.4.19  ready in 1234 ms
#
#   ➜  Local:   http://localhost:5173/
#   ➜  Network: use --host to expose
```

Open [http://localhost:5173](http://localhost:5173)

### Background Services

In separate terminals:

```bash
# Terminal 1: Supabase
npx supabase start

# Terminal 2: Frontend
npm run dev

# Terminal 3: Watch Edge Functions
npx supabase functions serve
```

### Hot Reload

Changes to code will automatically reload:
- Frontend: Instant hot module replacement
- Edge Functions: Restart function runtime (~2s)

---

## Running Tests

### Unit Tests

```bash
# Run all unit tests
npm test

# Run specific test file
npm test -- similarity-matcher.test.ts

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

### Integration Tests

```bash
# Run integration tests
npm run test:integration

# Run end-to-end tests
npm run test:e2e
```

### Evaluation Harness

```bash
# Run full evaluation suite
npm run evaluate

# Run specific evaluation
npm run evaluate:matching
npm run evaluate:cv-parsing

# Compare to baselines
npm run evaluate:baseline

# Generate report
npm run evaluate:report
```

---

## Production Deployment

### Deploy Frontend

**Option 1: Vercel (Recommended)**

```bash
# Deploy via Vercel platform
# Visit: https://vercel.com
# Click "Share" → "Publish"
```

**Option 2: Vercel**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

**Option 3: Netlify**

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod

# Set environment variables in Netlify dashboard
```

### Deploy Edge Functions

```bash
# Already done in "Edge Functions Deployment" section
npx supabase functions deploy
```

### Setup Cron Jobs

Configure cron triggers in Supabase:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily matching at 2 AM UTC
SELECT cron.schedule(
  'daily-auto-match',
  '0 2 * * *',
  $$
    SELECT net.http_post(
      url:='https://your-project.supabase.co/functions/v1/auto-apply-cron-v2',
      headers:='{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
    );
  $$
);
```

### Monitor Production

```bash
# View edge function logs
npx supabase functions logs auto-apply-cron-v2

# View database logs
npx supabase logs db

# View all logs
npx supabase logs
```

---

## Troubleshooting

### Common Issues

#### 1. "Cannot find module '@supabase/supabase-js'"

**Solution**:
```bash
rm -rf node_modules package-lock.json
npm install
```

#### 2. "Supabase command not found"

**Solution**:
```bash
# Reinstall Supabase CLI
npm install -g supabase

# Or use npx
npx supabase --version
```

#### 3. "Docker not running" (Supabase local)

**Solution**:
- Install Docker Desktop
- Start Docker
- Run `npx supabase start` again

#### 4. "OpenAI API rate limit exceeded"

**Solution**:
- Check usage at platform.openai.com
- Add billing method
- Increase rate limits (requires paid plan)

#### 5. "pgvector extension not found"

**Solution**:
```bash
# Ensure latest Supabase
npx supabase db reset

# Manually enable
npx supabase db shell
CREATE EXTENSION IF NOT EXISTS vector;
\q
```

#### 6. "CORS error" (API calls fail)

**Solution**:
```javascript
// Add to edge function
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

return new Response(JSON.stringify(data), {
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});
```

### Debug Mode

Enable verbose logging:

```bash
# Frontend
export VITE_LOG_LEVEL=debug
npm run dev

# Supabase
export SUPABASE_LOG_LEVEL=debug
npx supabase start
```

### Getting Help

1. Check [Issues](https://github.com/your-org/agentic-match/issues)
2. Search [Discussions](https://github.com/your-org/agentic-match/discussions)
3. Ask in Discord: [Join here](https://discord.gg/your-server)
4. Email: support@agenticmatch.com

---

## Reproducibility

### Exact Dependency Versions

```bash
# Install exact versions from lockfile
npm ci

# Verify versions
npm list --depth=0
```

### Fixed Random Seeds

```bash
# Set in environment
export RANDOM_SEED=42

# Used in evaluation
npm run evaluate -- --seed=42
```

### Versioned Test Data

```bash
# Test data in git
git clone https://github.com/your-org/agentic-match.git
cd agentic-match/test_data/v1/

# Exact test cases
ls -la
# - candidates.json
# - jobs.json
# - expected_matches.json
```

### Docker Environment (Future)

```bash
# Build reproducible environment
docker build -t agentic-match:v1.0.0 .

# Run in container
docker run -p 5173:5173 agentic-match:v1.0.0
```

### Verification Script

```bash
# Verify installation matches expected
npm run verify-setup

# Expected output:
# ✅ Node.js version: 18.17.0
# ✅ npm version: 9.6.7
# ✅ Supabase CLI: 1.120.0
# ✅ All dependencies installed
# ✅ Environment variables set
# ✅ Database connected
# ✅ Edge functions deployed
# ✅ All checks passed!
```

---

## Next Steps

After successful setup:

1. **Explore the UI**: Visit http://localhost:5173
2. **Create Test Account**: Sign up as candidate
3. **Upload CV**: Test ProfilePal agent
4. **Run Matching**: Trigger batch job manually
5. **View Results**: Check applications table
6. **Read Documentation**: See [docs/](../docs/)

---

## Appendix

### Useful Commands

```bash
# Update dependencies
npm update

# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Clean install
rm -rf node_modules package-lock.json && npm install

# Reset database
npx supabase db reset

# View database in browser
npx supabase studio

# Stop all services
npx supabase stop
```

### Environment Templates

**.env.example**:
```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=sk-proj-your-key

# Optional
PHANTOMBUSTER_API_KEY=your-key
VITE_LOG_LEVEL=info
```

**.env.production**:
```env
# Production environment
NODE_ENV=production
VITE_SUPABASE_URL=https://production-project.supabase.co
VITE_SUPABASE_ANON_KEY=production-anon-key
SUPABASE_SERVICE_ROLE_KEY=production-service-role-key
OPENAI_API_KEY=sk-proj-production-key
```

### Version Compatibility Matrix

| Package | Minimum | Recommended | Maximum |
|---------|---------|-------------|---------|
| Node.js | 18.17.0 | 18.19.0 | 20.x |
| npm | 9.6.7 | 9.8.0 | 10.x |
| Supabase CLI | 1.120.0 | 1.127.0 | 2.x |
| React | 18.3.0 | 18.3.1 | 18.x |
| TypeScript | 5.5.0 | 5.8.3 | 5.x |

---

**Last Updated**: January 2025
**Maintained By**: AgenticMatch Team
**License**: MIT

/**
 * PhantomBuster API Client
 *
 * Integrates with PhantomBuster's LinkedIn Search Export agent
 * to find external candidates for headhunting.
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface LinkedInHeadhuntingParams {
  role: string;
  location?: string;
  seniority?: string;
  skills?: string[];
  limit?: number;
}

export interface PhantomBusterLaunchResult {
  containerId: string;
  agentId: string;
  queuedAt: string;
}

export interface PhantomBusterLinkedInProfile {
  profileUrl: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  headline?: string;
  location?: string;
  company?: string;
  companyUrl?: string;
  jobTitle?: string;
  imgUrl?: string;
  connectionDegree?: string;
  description?: string;
  raw: Record<string, unknown>;
}

export interface PhantomBusterFetchResult {
  status: 'idle' | 'running' | 'success' | 'error';
  profiles: PhantomBusterLinkedInProfile[];
  errorMessage?: string;
  progress?: number;
}

interface PhantomBusterLaunchResponse {
  data: {
    containerId: string;
    agentId: string;
    queuedAt: string;
  };
}

interface PhantomBusterFetchResponse {
  status: string;
  progress?: number;
  container?: {
    exitCode?: number;
    resultObject?: any;
  };
}

// ============================================================================
// Configuration
// ============================================================================

const PB_BASE_URL = 'https://api.phantombuster.com/api/v2';

/**
 * Maximum expected results from PhantomBuster on free/trial plan
 *
 * FREE TIER CONSTRAINT: PhantomBuster's free/trial plan limits LinkedIn Search Export
 * to approximately 10 profiles per search. The CSV/JSON may contain additional rows
 * like "Export limit reached - Get more with our premium plans" which we filter out.
 *
 * TODO: When upgrading to a paid PhantomBuster plan (Professional $69/month or higher),
 * this limit can be increased. The parsing logic will still work correctly as long as
 * we continue to filter out non-profile rows (upgrade messages, empty rows, etc.).
 *
 * Paid plan limits:
 * - Professional: ~100-1000 profiles per search
 * - Business: ~1000-5000 profiles per search
 * - Enterprise: Custom limits
 */
const MAX_HEADHUNTING_RESULTS = 10;

function getConfig() {
  const apiKey = Deno.env.get('PHANTOMBUSTER_API_KEY');
  const agentId = Deno.env.get('PB_LINKEDIN_SEARCH_AGENT_ID');
  const argumentBaseJson = Deno.env.get('PB_LINKEDIN_ARGUMENT_BASE_JSON');

  if (!apiKey) {
    throw new Error('PHANTOMBUSTER_API_KEY environment variable not set');
  }

  if (!agentId) {
    throw new Error('PB_LINKEDIN_SEARCH_AGENT_ID environment variable not set');
  }

  return {
    apiKey,
    agentId,
    argumentBase: argumentBaseJson ? JSON.parse(argumentBaseJson) : {},
  };
}

// ============================================================================
// Query Building
// ============================================================================

/**
 * Builds a LinkedIn search query string from structured parameters
 *
 * Example output: "Senior TypeScript Developer React Node.js Lebanon"
 */
function buildLinkedInQuery(params: LinkedInHeadhuntingParams): string {
  const parts: string[] = [];

  // Add seniority
  if (params.seniority && params.seniority !== 'Any') {
    parts.push(params.seniority);
  }

  // Add role (required)
  parts.push(params.role);

  // Add skills
  if (params.skills && params.skills.length > 0) {
    parts.push(...params.skills);
  }

  // Add location
  if (params.location) {
    parts.push(params.location);
  }

  return parts.join(' ');
}

// ============================================================================
// API Client Functions
// ============================================================================

/**
 * Launches a LinkedIn search on PhantomBuster
 *
 * @param params - Search parameters (role, location, seniority, skills)
 * @returns Launch result with container ID for polling
 */
export async function launchLinkedInSearch(
  params: LinkedInHeadhuntingParams
): Promise<PhantomBusterLaunchResult> {
  const config = getConfig();
  const queryString = buildLinkedInQuery(params);

  console.log('[PhantomBuster] Launching LinkedIn search:', {
    query: queryString,
    params,
  });

  // Build the argument object
  const argument = {
    ...config.argumentBase,
    searchKeywords: queryString,
    resultsPerSearch: params.limit || 100,
  };

  // Launch the agent
  const response = await fetch(
    `${PB_BASE_URL}/agents/launch?id=${config.agentId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Phantombuster-Key': config.apiKey,
      },
      body: JSON.stringify({
        output: 'first-result-object',
        argument,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[PhantomBuster] Launch failed:', {
      status: response.status,
      error: errorText,
    });
    throw new Error(
      `PhantomBuster launch failed: ${response.status} - ${errorText}`
    );
  }

  const data: PhantomBusterLaunchResponse = await response.json();

  console.log('[PhantomBuster] Launch successful:', {
    containerId: data.data.containerId,
    agentId: data.data.agentId,
  });

  return {
    containerId: data.data.containerId,
    agentId: data.data.agentId,
    queuedAt: data.data.queuedAt,
  };
}

/**
 * Fetches results from a PhantomBuster agent
 *
 * @returns Fetch result with status and profiles (if completed)
 */
export async function fetchLinkedInSearchResults(): Promise<PhantomBusterFetchResult> {
  const config = getConfig();

  console.log('[PhantomBuster] Fetching results for agent:', config.agentId);

  const response = await fetch(
    `${PB_BASE_URL}/agents/fetch?id=${config.agentId}`,
    {
      method: 'GET',
      headers: {
        'X-Phantombuster-Key': config.apiKey,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[PhantomBuster] Fetch failed:', {
      status: response.status,
      error: errorText,
    });
    throw new Error(
      `PhantomBuster fetch failed: ${response.status} - ${errorText}`
    );
  }

  const data: PhantomBusterFetchResponse = await response.json();

  console.log('[PhantomBuster] Fetch response:', {
    status: data.status,
    progress: data.progress,
    hasContainer: !!data.container,
  });

  // Map PhantomBuster status to our status
  let status: PhantomBusterFetchResult['status'] = 'idle';

  if (data.status === 'running' || data.status === 'launching') {
    status = 'running';
  } else if (data.status === 'finished' && data.container?.exitCode === 0) {
    status = 'success';
  } else if (data.status === 'finished' && data.container?.exitCode !== 0) {
    status = 'error';
  } else if (data.status === 'error') {
    status = 'error';
  }

  // Parse profiles if completed successfully
  let profiles: PhantomBusterLinkedInProfile[] = [];
  let errorMessage: string | undefined;

  if (status === 'success' && data.container?.resultObject) {
    profiles = parseLinkedInProfiles(data.container.resultObject);
    console.log('[PhantomBuster] Parsed profiles:', profiles.length);
  } else if (status === 'error') {
    errorMessage = 'PhantomBuster agent execution failed';
    console.error('[PhantomBuster] Agent failed:', {
      exitCode: data.container?.exitCode,
      status: data.status,
    });
  }

  return {
    status,
    profiles,
    errorMessage,
    progress: data.progress,
  };
}

/**
 * Polls PhantomBuster until results are ready or timeout
 *
 * @param maxWaitMs - Maximum time to wait (default: 60 seconds)
 * @param pollIntervalMs - Time between polls (default: 5 seconds)
 * @returns Final fetch result
 */
export async function pollForResults(
  maxWaitMs: number = 60000,
  pollIntervalMs: number = 5000
): Promise<PhantomBusterFetchResult> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const result = await fetchLinkedInSearchResults();

    if (result.status === 'success' || result.status === 'error') {
      return result;
    }

    console.log('[PhantomBuster] Still running, waiting...', {
      elapsed: Math.round((Date.now() - startTime) / 1000),
      progress: result.progress,
    });

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  // Timeout reached
  console.warn('[PhantomBuster] Polling timeout reached');
  return {
    status: 'error',
    profiles: [],
    errorMessage: 'PhantomBuster polling timeout - results may still be processing',
  };
}

// ============================================================================
// Data Parsing
// ============================================================================

/**
 * Parses LinkedIn profiles from PhantomBuster result object
 *
 * Handles various response formats from different LinkedIn scrapers
 */
function parseLinkedInProfiles(
  resultObject: any
): PhantomBusterLinkedInProfile[] {
  const profiles: PhantomBusterLinkedInProfile[] = [];

  // Handle array response
  let rawProfiles: any[] = [];
  if (Array.isArray(resultObject)) {
    rawProfiles = resultObject;
  } else if (resultObject.data && Array.isArray(resultObject.data)) {
    rawProfiles = resultObject.data;
  } else if (resultObject.profiles && Array.isArray(resultObject.profiles)) {
    rawProfiles = resultObject.profiles;
  } else {
    console.warn('[PhantomBuster] Unexpected result format:', resultObject);
    return profiles;
  }

  // Parse each profile and filter out invalid rows
  let filteredCount = 0;
  for (const raw of rawProfiles) {
    try {
      const profile = parseLinkedInProfile(raw);
      if (profile) {
        profiles.push(profile);
      } else {
        filteredCount++;
      }
    } catch (error) {
      console.error('[PhantomBuster] Error parsing profile:', error, raw);
      filteredCount++;
    }
  }

  console.log('[PhantomBuster] Parsing complete:', {
    totalRows: rawProfiles.length,
    validProfiles: profiles.length,
    filteredOut: filteredCount,
  });

  // Log warning if we're hitting the free tier limit
  if (profiles.length >= MAX_HEADHUNTING_RESULTS) {
    console.warn(
      `[PhantomBuster] Reached free tier limit of ~${MAX_HEADHUNTING_RESULTS} profiles. ` +
      'Consider upgrading to a paid plan for more results.'
    );
  }

  return profiles;
}

/**
 * Checks if a row is a valid LinkedIn profile
 *
 * Filters out:
 * - Empty rows
 * - Upgrade messages ("Export limit reached...", "Upgrade to export...")
 * - Rows with only upgrade links
 * - Rows missing essential data
 */
function isValidProfileRow(raw: any): boolean {
  // Check if row is completely empty or null
  if (!raw || typeof raw !== 'object') {
    return false;
  }

  // Get profile URL candidates
  const profileUrl =
    raw.profileUrl ||
    raw.url ||
    raw.linkedinUrl ||
    raw.linkedinProfileUrl ||
    raw.linkedin_url ||
    raw.profile_url;

  // No profile URL = not a valid profile
  if (!profileUrl || typeof profileUrl !== 'string') {
    return false;
  }

  // Filter out upgrade messages and phantom URLs
  const invalidPatterns = [
    /export.*limit.*reached/i,
    /upgrade.*to.*export/i,
    /get.*more.*with.*premium/i,
    /phbuster\.io/i,
    /phantombuster\.com\/pricing/i,
  ];

  if (invalidPatterns.some(pattern => pattern.test(profileUrl))) {
    return false;
  }

  // Must be a valid LinkedIn URL
  if (!profileUrl.includes('linkedin.com/in/')) {
    return false;
  }

  // Check if all essential fields are empty (indicates a junk row)
  const hasName = !!(
    raw.fullName ||
    raw.name ||
    raw.full_name ||
    (raw.firstName && raw.lastName)
  );

  const hasHeadline = !!(
    raw.headline ||
    raw.title ||
    raw.linkedinHeadline ||
    raw.description
  );

  // At least one of name or headline should be present
  if (!hasName && !hasHeadline) {
    return false;
  }

  return true;
}

/**
 * Parses a single LinkedIn profile
 *
 * Handles multiple field name variations
 */
function parseLinkedInProfile(raw: any): PhantomBusterLinkedInProfile | null {
  // Validate the row first
  if (!isValidProfileRow(raw)) {
    return null;
  }

  // Must have at least a profile URL
  const profileUrl =
    raw.profileUrl ||
    raw.url ||
    raw.linkedinUrl ||
    raw.linkedinProfileUrl ||
    raw.linkedin_url ||
    raw.profile_url;

  if (!profileUrl) {
    return null;
  }

  // Extract name
  const fullName =
    raw.fullName ||
    raw.name ||
    raw.full_name ||
    (raw.firstName && raw.lastName
      ? `${raw.firstName} ${raw.lastName}`
      : undefined);

  const firstName = raw.firstName || raw.first_name;
  const lastName = raw.lastName || raw.last_name;

  // Extract job info
  const headline = raw.headline || raw.title || raw.description;
  const company =
    raw.company ||
    raw.companyName ||
    raw.company_name ||
    raw.currentCompany ||
    raw.current_company;

  const companyUrl =
    raw.companyUrl || raw.companyLinkedinUrl || raw.company_url;

  const jobTitle =
    raw.jobTitle ||
    raw.job_title ||
    raw.title ||
    raw.occupation ||
    raw.currentPosition;

  // Extract location
  const location = raw.location || raw.locationName || raw.location_name;

  // Extract other info
  const imgUrl = raw.imgUrl || raw.photoUrl || raw.profilePicture || raw.image;
  const connectionDegree = raw.connectionDegree || raw.degree;
  const description = raw.description || raw.summary || raw.about;

  return {
    profileUrl,
    fullName,
    firstName,
    lastName,
    headline,
    location,
    company,
    companyUrl,
    jobTitle,
    imgUrl,
    connectionDegree,
    description,
    raw,
  };
}

// ============================================================================
// High-Level Helper
// ============================================================================

/**
 * Complete workflow: Launch search, poll, and return results
 *
 * @param params - Search parameters
 * @param maxWaitMs - Maximum time to wait for results (default: 60 seconds)
 * @returns Profiles found
 */
export async function searchLinkedIn(
  params: LinkedInHeadhuntingParams,
  maxWaitMs: number = 60000
): Promise<PhantomBusterLinkedInProfile[]> {
  console.log('[PhantomBuster] Starting LinkedIn search workflow:', params);

  // Launch the search
  const launchResult = await launchLinkedInSearch(params);

  console.log('[PhantomBuster] Agent launched, polling for results...');

  // Poll for results
  const fetchResult = await pollForResults(maxWaitMs);

  if (fetchResult.status === 'error') {
    throw new Error(
      fetchResult.errorMessage || 'PhantomBuster search failed'
    );
  }

  console.log(
    '[PhantomBuster] Search completed:',
    fetchResult.profiles.length,
    'profiles found'
  );

  return fetchResult.profiles;
}

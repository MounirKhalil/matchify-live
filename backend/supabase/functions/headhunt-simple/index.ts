/**
 * Headhunt Simple - Platform-Managed PhantomBuster Integration
 *
 * This endpoint provides simplified headhunting using the platform's
 * PhantomBuster account. Recruiters don't need to provide API keys.
 *
 * Flow:
 * 1. Recruiter submits search criteria (role, location, seniority, skills)
 * 2. Backend launches PhantomBuster LinkedIn Search Export
 * 3. Polls for results (up to 60 seconds)
 * 4. Stores candidates in database
 * 5. Returns results to frontend
 * 
 * Last updated: 2025-11-29
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  searchLinkedIn,
  type PhantomBusterLinkedInProfile,
  type LinkedInHeadhuntingParams,
} from '../_shared/phantombuster.ts';

// ============================================================================
// CORS Headers
// ============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// Request/Response Types
// ============================================================================

interface CreateHeadhuntingRunRequest {
  provider: 'linkedin';
  role: string;
  location?: string;
  seniority?: string;
  skills?: string | string[]; // Can be comma-separated string or array
  limit?: number;
}

interface HeadhuntingCandidateDTO {
  id: string;
  full_name: string | null;
  headline: string | null;
  profile_url: string;
  location: string | null;
  company: string | null;
  job_title: string | null;
  source: 'linkedin';
  raw: Record<string, unknown>;
}

interface CreateHeadhuntingRunResponse {
  run: {
    id: string;
    status: 'completed' | 'failed';
    provider: 'linkedin';
    role: string;
    location?: string;
    seniority?: string;
    skills?: string[];
    query_string: string;
    created_at: string;
    error_message?: string;
  };
  candidates: HeadhuntingCandidateDTO[];
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ========================================================================
    // 1. Authentication
    // ========================================================================

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[HeadhuntSimple] Request from user:', user.id);

    // ========================================================================
    // 2. Parse & Validate Request
    // ========================================================================

    const requestBody: CreateHeadhuntingRunRequest = await req.json();

    if (!requestBody.role || requestBody.role.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Role is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (requestBody.provider !== 'linkedin') {
      return new Response(
        JSON.stringify({
          error: 'Only LinkedIn provider is currently supported',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse skills (can be comma-separated string or array)
    let skills: string[] = [];
    if (typeof requestBody.skills === 'string') {
      skills = requestBody.skills
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    } else if (Array.isArray(requestBody.skills)) {
      skills = requestBody.skills;
    }

    // Build query string for logging/storage
    const queryParts = [
      requestBody.seniority,
      requestBody.role,
      ...skills,
      requestBody.location,
    ].filter(Boolean);
    const queryString = queryParts.join(' ');

    console.log('[HeadhuntSimple] Search criteria:', {
      role: requestBody.role,
      location: requestBody.location,
      seniority: requestBody.seniority,
      skills,
      queryString,
    });

    // ========================================================================
    // 3. Create Headhunting Run Record
    // ========================================================================

    const { data: run, error: runError } = await supabaseClient
      .from('headhunt_searches')
      .insert({
        recruiter_id: user.id,
        provider: 'linkedin',
        role: requestBody.role,
        location: requestBody.location || null,
        seniority: requestBody.seniority || null,
        skills: skills.length > 0 ? skills : null,
        query_string: queryString,
        status: 'running',
      })
      .select()
      .single();

    if (runError || !run) {
      console.error('[HeadhuntSimple] Error creating run:', runError);
      return new Response(
        JSON.stringify({ error: 'Failed to create headhunting run' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[HeadhuntSimple] Run created:', run.id);

    // ========================================================================
    // 4. Launch PhantomBuster Search
    // ========================================================================

    let profiles: PhantomBusterLinkedInProfile[] = [];
    let errorMessage: string | undefined;

    try {
      // FREE TIER NOTE: PhantomBuster free/trial plan limits to ~10 profiles per search
      // The limit parameter is sent to PhantomBuster but will be capped by their free tier
      const pbParams: LinkedInHeadhuntingParams = {
        role: requestBody.role,
        location: requestBody.location,
        seniority: requestBody.seniority,
        skills,
        limit: requestBody.limit || 100, // Will be capped at ~10 on free tier
      };

      console.log('[HeadhuntSimple] Launching PhantomBuster search...');

      // This will launch, poll, and return results (or throw on error)
      profiles = await searchLinkedIn(pbParams, 60000); // 60 second timeout

      console.log(
        '[HeadhuntSimple] PhantomBuster returned',
        profiles.length,
        'profiles'
      );
    } catch (error) {
      console.error('[HeadhuntSimple] PhantomBuster error:', error);
      errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Update run status to failed
      await supabaseClient
        .from('headhunt_searches')
        .update({
          status: 'failed',
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
        })
        .eq('id', run.id);

      return new Response(
        JSON.stringify({
          error: 'PhantomBuster search failed',
          details: errorMessage,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ========================================================================
    // 5. Store Candidates in Database
    // ========================================================================

    const candidatesData = profiles.map((profile) => ({
      run_id: run.id,
      source: 'linkedin' as const,
      full_name: profile.fullName || null,
      headline: profile.headline || null,
      profile_url: profile.profileUrl,
      location: profile.location || null,
      company: profile.company || null,
      job_title: profile.jobTitle || null,
      email: null, // Can be enriched later
      raw: profile.raw,
    }));

    let insertedCandidates: any[] = [];

    if (candidatesData.length > 0) {
      const { data: candidates, error: candidatesError } =
        await supabaseClient
          .from('external_candidates')
          .insert(candidatesData)
          .select();

      if (candidatesError) {
        console.error(
          '[HeadhuntSimple] Error inserting candidates:',
          candidatesError
        );
        // Don't fail the whole request, just log
      } else {
        insertedCandidates = candidates || [];
        console.log(
          '[HeadhuntSimple] Inserted',
          insertedCandidates.length,
          'candidates'
        );
      }
    }

    // ========================================================================
    // 6. Update Run Status to Completed
    // ========================================================================

    const { data: updatedRun } = await supabaseClient
      .from('headhunt_searches')
      .update({
        status: 'completed',
        results: profiles.map((p) => p.raw),
        completed_at: new Date().toISOString(),
      })
      .eq('id', run.id)
      .select()
      .single();

    console.log('[HeadhuntSimple] Run completed successfully');

    // ========================================================================
    // 7. Return Response
    // ========================================================================

    const response: CreateHeadhuntingRunResponse = {
      run: {
        id: updatedRun?.id || run.id,
        status: 'completed',
        provider: 'linkedin',
        role: requestBody.role,
        location: requestBody.location,
        seniority: requestBody.seniority,
        skills,
        query_string: queryString,
        created_at: updatedRun?.created_at || run.created_at,
      },
      candidates: insertedCandidates.map((c) => ({
        id: c.id,
        full_name: c.full_name,
        headline: c.headline,
        profile_url: c.profile_url,
        location: c.location,
        company: c.company,
        job_title: c.job_title,
        source: 'linkedin' as const,
        raw: c.raw,
      })),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[HeadhuntSimple] Unexpected error:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

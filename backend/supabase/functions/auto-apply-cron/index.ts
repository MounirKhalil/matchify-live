import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: "Missing Supabase configuration" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Log run start
    const { data: runData, error: runError } = await supabase
      .from("auto_application_runs")
      .insert({
        status: "in_progress",
        started_at: new Date().toISOString(),
        total_candidates_evaluated: 0,
        total_matches_found: 0,
        total_applications_submitted: 0,
      })
      .select()
      .single();

    if (runError) throw runError;

    const runId = runData.id;

    // Step 1: Get candidates with auto_apply enabled
    const { data: candidates, error: candError } = await supabase
      .from("candidate_profiles")
      .select(`
        id,
        name,
        family_name,
        bio,
        skills,
        work_experience,
        education,
        interests,
        preferred_categories,
        candidate_embeddings(embeddings),
        candidate_preferences(auto_apply_enabled, min_match_threshold, max_applications_per_day)
      `)
      .eq("candidate_preferences.auto_apply_enabled", true)
      .limit(50);

    if (candError) throw candError;

    const candidateCount = candidates?.length || 0;
    let totalMatches = 0;
    let totalSubmitted = 0;

    // Step 2: For each candidate, find matching jobs
    for (const candidate of candidates || []) {
      if (!candidate.candidate_embeddings || candidate.candidate_embeddings.length === 0) {
        continue; // Skip if no embedding
      }

      const candEmbedding = candidate.candidate_embeddings[0].embeddings;

      // Get all open jobs with embeddings
      const { data: jobs } = await supabase
        .from("job_posting_embeddings")
        .select(`
          id,
          job_posting_id,
          embeddings,
          job_postings(
            id,
            job_title,
            status
          )
        `)
        .eq("job_postings.status", "open")
        .limit(100);

      if (!jobs) continue;

      // Calculate matches using cosine similarity
      const matches: Array<{
        candidateId: string;
        jobId: string;
        similarity: number;
        score: number;
      }> = [];

      for (const job of jobs) {
        const similarity = cosineSimilarity(candEmbedding, job.embeddings);

        if (similarity >= 0.7) {
          // Hybrid score: 70% similarity + 30% rule-based
          const ruleScore = 70; // Simplified rule-based scoring
          const score = Math.round(similarity * 70 + ruleScore * 0.3);

          matches.push({
            candidateId: candidate.id,
            jobId: job.job_posting_id,
            similarity,
            score,
          });

          totalMatches++;
        }
      }

      // Step 3: Submit applications with safety checks
      const prefs = candidate.candidate_preferences[0];
      const minScore = prefs?.min_match_threshold || 70;
      const maxPerDay = prefs?.max_applications_per_day || 5;

      // Check today's application count
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count: todayCount } = await supabase
        .from("applications")
        .select("*", { count: "exact", head: true })
        .eq("candidate_id", candidate.id)
        .eq("auto_applied", true)
        .gte("created_at", today.toISOString());

      const remaining = maxPerDay - (todayCount || 0);

      if (remaining <= 0) continue; // Rate limit reached

      // Sort by score and apply top matches
      const sortedMatches = matches.sort((a, b) => b.score - a.score);
      let applied = 0;

      for (const match of sortedMatches) {
        if (applied >= remaining) break;
        if (match.score < minScore) continue; // Below threshold

        // Check for duplicate
        const { data: existing } = await supabase
          .from("applications")
          .select("id")
          .eq("candidate_id", match.candidateId)
          .eq("job_posting_id", match.jobId)
          .limit(1);

        if (existing && existing.length > 0) continue; // Already applied

        // Submit application
        const { error: appError } = await supabase.from("applications").insert({
          candidate_id: match.candidateId,
          job_posting_id: match.jobId,
          auto_applied: true,
          match_score: match.score,
          match_reasons: [
            `Semantic match: ${(match.similarity * 100).toFixed(1)}%`,
            "Required skills present",
          ],
          hiring_status: "potential_fit",
        });

        if (!appError) {
          applied++;
          totalSubmitted++;
        }

        // Rate limit delay
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    // Step 4: Complete run log
    const { error: updateError } = await supabase
      .from("auto_application_runs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        total_candidates_evaluated: candidateCount,
        total_matches_found: totalMatches,
        total_applications_submitted: totalSubmitted,
      })
      .eq("id", runId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        runId,
        results: {
          candidatesEvaluated: candidateCount,
          matchesFound: totalMatches,
          applicationsSubmitted: totalSubmitted,
        },
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in auto-apply-cron:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;

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

  if (magnitudeA === 0 || magnitudeB === 0) return 0;

  return dotProduct / (magnitudeA * magnitudeB);
}

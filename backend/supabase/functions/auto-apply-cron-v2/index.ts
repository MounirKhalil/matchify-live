import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const openaiKey = Deno.env.get("OPENAI_API_KEY") || "";

  if (!supabaseUrl || !supabaseServiceKey || !openaiKey) {
    return new Response(
      JSON.stringify({ error: "Missing configuration" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log("Starting smart evaluation-based matching job...");

    // 1. Get all open jobs without recent evaluation
    const { data: jobs, error: jobsError } = await supabase
      .from("job_postings")
      .select(`
        id,
        job_title,
        company_name,
        public_information,
        job_posting_embeddings(embeddings)
      `)
      .eq("status", "open")
      .limit(10);

    if (jobsError) throw jobsError;
    if (!jobs || jobs.length === 0) {
      console.log("No open jobs found");
      return new Response(JSON.stringify({ success: true, matchesFound: 0, applicationsSubmitted: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    let totalMatches = 0;
    let totalSubmitted = 0;

    // 2. For each job, find candidates that haven't been evaluated yet
    for (const job of jobs) {
      console.log(`Processing job: ${job.job_title} (${job.id})`);

      // Get candidates that need evaluation for this job
      const { data: candidatesNeeding, error: evalError } = await supabase
        .rpc("get_candidates_needing_evaluation", {
          p_job_posting_id: job.id,
          p_limit: 50,
        });

      if (evalError) {
        console.error(`Error fetching candidates for job ${job.id}:`, evalError);
        continue;
      }

      if (!candidatesNeeding || candidatesNeeding.length === 0) {
        console.log(`No unevaluated candidates for job ${job.id}`);
        continue;
      }

      console.log(`Found ${candidatesNeeding.length} candidates needing evaluation for this job`);

      // 3. Evaluate each candidate against this job
      for (const candidate of candidatesNeeding) {
        if (!candidate.has_embedding) {
          // Mark as evaluated but no embedding
          await supabase.rpc("mark_candidate_evaluated", {
            p_candidate_id: candidate.candidate_id,
            p_job_posting_id: job.id,
            p_match_found: false,
          });
          continue;
        }

        // Fetch candidate embedding
        const { data: candEmb } = await supabase
          .from("candidate_embeddings")
          .select("embeddings")
          .eq("candidate_id", candidate.candidate_id)
          .single();

        if (!candEmb) {
          await supabase.rpc("mark_candidate_evaluated", {
            p_candidate_id: candidate.candidate_id,
            p_job_posting_id: job.id,
            p_match_found: false,
          });
          continue;
        }

        // Calculate similarity
        const jobEmbedding = job.job_posting_embeddings?.[0]?.embeddings;
        if (!jobEmbedding) {
          console.log(`No embedding for job ${job.id}`);
          continue;
        }

        const similarity = cosineSimilarity(candEmb.embeddings, jobEmbedding);
        const threshold = 0.7;
        const matchFound = similarity >= threshold;
        const score = Math.round(similarity * 100);

        console.log(`Evaluated ${candidate.candidate_name}: similarity=${similarity.toFixed(2)}, match=${matchFound}`);

        // Mark as evaluated
        await supabase.rpc("mark_candidate_evaluated", {
          p_candidate_id: candidate.candidate_id,
          p_job_posting_id: job.id,
          p_match_found: matchFound,
          p_match_score: score,
          p_embedding_similarity: parseFloat(similarity.toFixed(4)),
        });

        if (matchFound) {
          totalMatches++;

          // Check if already applied
          const { data: existing } = await supabase
            .from("applications")
            .select("id")
            .eq("candidate_id", candidate.candidate_id)
            .eq("job_posting_id", job.id)
            .limit(1);

          if (!existing || existing.length === 0) {
            // Check candidate preferences
            const { data: prefs } = await supabase
              .from("candidate_preferences")
              .select("auto_apply_enabled, auto_apply_min_score, max_applications_per_day")
              .eq("candidate_id", candidate.candidate_id)
              .single();

            if (prefs?.auto_apply_enabled && score >= (prefs?.auto_apply_min_score || 70)) {
              // Check rate limit
              const today = new Date();
              today.setHours(0, 0, 0, 0);

              const { count: todayCount } = await supabase
                .from("applications")
                .select("*", { count: "exact", head: true })
                .eq("candidate_id", candidate.candidate_id)
                .eq("auto_applied", true)
                .gte("created_at", today.toISOString());

              const remaining = (prefs?.max_applications_per_day || 5) - (todayCount || 0);

              if (remaining > 0) {
                // Submit application
                const { error: appError } = await supabase.from("applications").insert({
                  candidate_id: candidate.candidate_id,
                  job_posting_id: job.id,
                  auto_applied: true,
                  match_score: score,
                  match_reasons: [`Semantic match: ${similarity.toFixed(1)}`],
                  created_at: new Date().toISOString(),
                });

                if (!appError) {
                  totalSubmitted++;
                  console.log(`Application submitted for ${candidate.candidate_name} to ${job.job_title}`);
                }
              }
            }
          }
        }

        // Rate limiting delay
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log(`Job complete: ${totalMatches} matches found, ${totalSubmitted} applications submitted`);

    return new Response(
      JSON.stringify({
        success: true,
        matchesFound: totalMatches,
        applicationsSubmitted: totalSubmitted,
        jobsProcessed: jobs.length,
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

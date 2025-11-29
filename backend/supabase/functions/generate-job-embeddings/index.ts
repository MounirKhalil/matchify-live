import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
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
    const { job_posting_id } = await req.json();

    if (!job_posting_id) {
      return new Response(
        JSON.stringify({ error: "job_posting_id required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch job posting
    const { data: job, error: jobError } = await supabase
      .from("job_postings")
      .select("*")
      .eq("id", job_posting_id)
      .single();

    if (jobError || !job) {
      throw new Error(`Job not found: ${job_posting_id}`);
    }

    // Extract text for embedding
    const parts = [];
    if (job.job_title) parts.push(job.job_title);
    if (job.public_information) parts.push(job.public_information);
    if (job.categories) parts.push(`Categories: ${job.categories.join(", ")}`);
    
    if (job.requirements && Array.isArray(job.requirements)) {
      const skills = job.requirements.map((r: any) => r.name).join(", ");
      if (skills) parts.push(`Required skills: ${skills}`);
    }

    const embeddingText = parts.filter(Boolean).join(" | ");

    if (!embeddingText) {
      throw new Error("No content to generate embedding");
    }

    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        input: embeddingText,
        model: "text-embedding-3-small",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    const embedding = data.data[0].embedding;

    // Save embedding
    const { error: saveError } = await supabase
      .from("job_posting_embeddings")
      .upsert({
        job_posting_id: job_posting_id,
        embeddings: embedding,
        metadata: {
          job_title: job.job_title,
          text_length: embeddingText.length,
          generated_at: new Date().toISOString(),
        },
      });

    if (saveError) throw saveError;

    return new Response(
      JSON.stringify({
        success: true,
        job_posting_id,
        embeddingDimensions: embedding.length,
        textLength: embeddingText.length,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating job embedding:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

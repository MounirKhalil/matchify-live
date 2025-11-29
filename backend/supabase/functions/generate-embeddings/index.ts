// Edge Function: Generate embeddings for candidates using OpenAI
// Purpose: Convert candidate profile data into semantic embeddings for vector search
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateEmbeddingsRequest {
  candidate_id: string;
  candidate_data: {
    name?: string;
    headline?: string;
    current_position?: string;
    current_company?: string;
    location?: string;
    country?: string;
    skills?: string[];
    years_of_experience?: number;
    certifications?: string[];
    languages?: string[];
    bio?: string;
    work_experience?: Array<{
      title?: string;
      company?: string;
      description?: string;
      duration?: string;
    }>;
    education?: Array<{
      school?: string;
      field?: string;
      degree?: string;
    }>;
  };
}

interface OpenAIEmbeddingResponse {
  data: Array<{
    embedding: number[];
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
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
      throw new Error('Unauthorized');
    }

    const { candidate_id, candidate_data } = (await req.json()) as GenerateEmbeddingsRequest;

    if (!candidate_id || !candidate_data) {
      throw new Error('candidate_id and candidate_data are required');
    }

    console.log(`Generating embeddings for candidate ${candidate_id}`);

    // 1. Create semantic text representation of candidate
    const candidateText = buildCandidateText(candidate_data);
    console.log('Candidate text:', candidateText);

    // 2. Get embedding from OpenAI
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: candidateText,
      }),
    });

    if (!embeddingResponse.ok) {
      const errorData = await embeddingResponse.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${embeddingResponse.statusText}`);
    }

    const embeddingData = (await embeddingResponse.json()) as OpenAIEmbeddingResponse;
    const embedding = embeddingData.data[0].embedding;

    if (!embedding || embedding.length === 0) {
      throw new Error('Failed to generate embedding from OpenAI');
    }

    console.log(`Generated embedding with ${embedding.length} dimensions`);

    // 3. Prepare metadata for storage
    const metadata = {
      name: candidate_data.name,
      headline: candidate_data.headline,
      current_position: candidate_data.current_position,
      current_company: candidate_data.current_company,
      location: candidate_data.location,
      country: candidate_data.country,
      skills: candidate_data.skills || [],
      years_of_experience: candidate_data.years_of_experience,
      certifications: candidate_data.certifications || [],
      languages: candidate_data.languages || [],
      embedding_generated_at: new Date().toISOString(),
    };

    // 4. Store or update embedding in database
    const { data: existingEmbedding, error: fetchError } = await supabaseClient
      .from('candidate_embeddings')
      .select('id')
      .eq('candidate_id', candidate_id)
      .single();

    let result;
    if (existingEmbedding) {
      // Update existing embedding
      const { data: updateData, error: updateError } = await supabaseClient
        .from('candidate_embeddings')
        .update({
          embeddings: embedding,
          metadata,
          updated_at: new Date().toISOString(),
        })
        .eq('candidate_id', candidate_id)
        .select();

      if (updateError) {
        throw updateError;
      }
      result = updateData;
      console.log(`Updated embedding for candidate ${candidate_id}`);
    } else {
      // Insert new embedding
      const { data: insertData, error: insertError } = await supabaseClient
        .from('candidate_embeddings')
        .insert({
          candidate_id,
          embeddings: embedding,
          metadata,
        })
        .select();

      if (insertError) {
        throw insertError;
      }
      result = insertData;
      console.log(`Created new embedding for candidate ${candidate_id}`);
    }

    // 5. Update embedding_last_updated in candidate_profiles
    await supabaseClient
      .from('candidate_profiles')
      .update({ embedding_last_updated: new Date().toISOString() })
      .eq('id', candidate_id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Embedding generated successfully',
        candidate_id,
        embedding_dimension: embedding.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error generating embeddings:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

/**
 * Build semantic text representation of candidate
 * This text will be converted to an embedding
 */
function buildCandidateText(data: GenerateEmbeddingsRequest['candidate_data']): string {
  const parts: string[] = [];

  if (data.name) parts.push(`Name: ${data.name}`);
  if (data.headline) parts.push(`Headline: ${data.headline}`);
  if (data.current_position) parts.push(`Current Position: ${data.current_position}`);
  if (data.current_company) parts.push(`Company: ${data.current_company}`);

  if (data.years_of_experience) {
    parts.push(`Years of Experience: ${data.years_of_experience} years`);
  }

  if (data.location) parts.push(`Location: ${data.location}`);
  if (data.country) parts.push(`Country: ${data.country}`);

  if (data.skills && data.skills.length > 0) {
    parts.push(`Skills: ${data.skills.join(', ')}`);
  }

  if (data.languages && data.languages.length > 0) {
    parts.push(`Languages: ${data.languages.join(', ')}`);
  }

  if (data.certifications && data.certifications.length > 0) {
    parts.push(`Certifications: ${data.certifications.join(', ')}`);
  }

  if (data.bio) {
    parts.push(`Bio: ${data.bio}`);
  }

  if (data.work_experience && data.work_experience.length > 0) {
    const workExperienceText = data.work_experience
      .map((exp) => {
        const expParts: string[] = [];
        if (exp.title) expParts.push(exp.title);
        if (exp.company) expParts.push(`at ${exp.company}`);
        if (exp.duration) expParts.push(`(${exp.duration})`);
        if (exp.description) expParts.push(exp.description);
        return expParts.join(' ');
      })
      .join('. ');
    parts.push(`Work Experience: ${workExperienceText}`);
  }

  if (data.education && data.education.length > 0) {
    const educationText = data.education
      .map((edu) => {
        const eduParts: string[] = [];
        if (edu.degree) eduParts.push(edu.degree);
        if (edu.field) eduParts.push(`in ${edu.field}`);
        if (edu.school) eduParts.push(`from ${edu.school}`);
        return eduParts.join(' ');
      })
      .join('. ');
    parts.push(`Education: ${educationText}`);
  }

  return parts.join('. ');
}

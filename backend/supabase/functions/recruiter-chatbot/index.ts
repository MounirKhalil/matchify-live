// Edge Function: Recruiter Chatbot with Semantic Search
// Purpose: Allow recruiters to find candidates using natural language queries with vector search
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatbotRequest {
  recruiter_id: string;
  conversation_id?: string;
  user_message: string;
  conversation_history?: Array<{ role: 'recruiter' | 'bot'; content: string }>;
}

interface ExtractedFilters {
  position?: string;
  years_experience?: { min?: number; max?: number; range?: string };
  skills?: string[];
  location?: string;
  country?: string;
  languages?: string[];
  specific_experience?: string;
  num_results?: number;
  is_query_complete?: boolean;
}

interface CandidateResult {
  id: string;
  name?: string;
  headline?: string;
  location?: string;
  years_of_experience?: number;
  skills?: string[];
  current_position?: string;
  current_company?: string;
  relevance_score: number;
  specific_experience?: string;
  cv_url?: string;
}

/**
 * Detect prompt injection attempts
 */
function detectPromptInjection(message: string): boolean {
  const maliciousPatterns = [
    /ignore\s+(previous|above|all|prior)\s+(instructions?|prompts?|commands?)/i,
    /disregard\s+(previous|above|all|prior|everything)/i,
    /forget\s+(everything|all|previous|instructions?)/i,
    /you\s+are\s+now/i,
    /new\s+(instructions?|role|character|personality)/i,
    /act\s+as\s+(?!a\s+recruiter)/i, // Allow "act as a recruiter" but block other roles
    /pretend\s+(?:to\s+be|you)/i,
    /system\s*prompt/i,
    /\[SYSTEM\]/i,
    /<system>/i,
    /\{\{system\}\}/i,
    /reveal\s+your\s+(prompt|instructions?)/i,
    /show\s+me\s+your\s+(prompt|instructions?)/i,
    /<script>/i,
    /javascript:/i,
    /onerror=/i,
    /onclick=/i,
  ];

  return maliciousPatterns.some(pattern => pattern.test(message));
}

/**
 * Sanitize output to prevent information leaks
 */
function sanitizeOutput(text: string): string {
  const forbiddenTerms = [
    { pattern: /SUPABASE_URL/gi, replacement: '[REDACTED]' },
    { pattern: /SUPABASE_SERVICE_ROLE_KEY/gi, replacement: '[REDACTED]' },
    { pattern: /OPENAI_API_KEY/gi, replacement: '[REDACTED]' },
    { pattern: /api[_-]?key/gi, replacement: '[REDACTED]' },
    { pattern: /secret[_-]?key/gi, replacement: '[REDACTED]' },
    { pattern: /password/gi, replacement: '[REDACTED]' },
  ];

  let sanitized = text;
  forbiddenTerms.forEach(({ pattern, replacement }) => {
    sanitized = sanitized.replace(pattern, replacement);
  });

  return sanitized;
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

    const { recruiter_id, conversation_id, user_message, conversation_history } =
      (await req.json()) as ChatbotRequest;

    if (!recruiter_id || !user_message) {
      throw new Error('recruiter_id and user_message are required');
    }

    // Security check: Detect prompt injection
    if (detectPromptInjection(user_message)) {
      console.warn('Prompt injection attempt detected:', {
        recruiter_id,
        message_preview: user_message.substring(0, 100)
      });
      return new Response(
        JSON.stringify({
          bot_response: "I can only help with candidate searches. Please rephrase your request.",
          candidates: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing chatbot message from recruiter ${recruiter_id}`);

    // 1. Extract filters from user message
    const extractedFilters = await extractFiltersFromMessage(user_message, conversation_history);
    console.log('Extracted filters:', extractedFilters);

    // Check if this is a casual/greeting message
    const casualMessages = ['hi', 'hello', 'hey', 'thanks', 'thank you', 'ok', 'okay', 'yes', 'no'];
    const isCasualMessage = casualMessages.includes(user_message.toLowerCase().trim());

    let botResponse = '';
    let candidates: CandidateResult[] = [];

    // 2. Check if we have enough information for a search
    if (extractedFilters.is_query_complete) {
      // Perform semantic search
      candidates = await performSemanticSearch(
        supabaseClient,
        recruiter_id,
        user_message,
        extractedFilters
      );

      if (candidates.length === 0) {
        botResponse = `No candidates found matching your criteria. Try adjusting your filters or ask for candidates with different requirements.`;
      } else {
        botResponse = `Found ${candidates.length} candidate${candidates.length !== 1 ? 's' : ''} matching your criteria.`;
      }
    } else if (isCasualMessage) {
      // Handle casual messages
      const greetings = ['hi', 'hello', 'hey'];
      if (greetings.includes(user_message.toLowerCase().trim())) {
        botResponse = "Hello! I'm here to help you find the perfect candidates. What position or role are you looking for?";
      } else if (['thanks', 'thank you'].includes(user_message.toLowerCase().trim())) {
        botResponse = "You're welcome! Let me know if you need to search for more candidates.";
      } else if (['ok', 'okay', 'yes'].includes(user_message.toLowerCase().trim())) {
        botResponse = "Great! How can I assist you with your candidate search?";
      } else {
        botResponse = "I can help you find candidates. What position or role are you looking for?";
      }
    } else {
      // Ask for missing information
      botResponse = generateFollowUpQuestion(extractedFilters);
    }

    // 3. Save conversation
    let saved_conversation_id = conversation_id;

    if (!conversation_id) {
      const { data: newConversation, error: createError } = await supabaseClient
        .from('chatbot_conversations')
        .insert({
          recruiter_id,
          conversation_history: [
            { role: 'recruiter', content: user_message, timestamp: new Date().toISOString() },
            { role: 'bot', content: botResponse, timestamp: new Date().toISOString() },
          ],
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating conversation:', createError);
      } else if (newConversation) {
        saved_conversation_id = newConversation.id;
      }
    } else {
      // Update existing conversation
      const newHistory = [
        ...(conversation_history || []),
        { role: 'recruiter', content: user_message, timestamp: new Date().toISOString() },
        { role: 'bot', content: botResponse, timestamp: new Date().toISOString() },
      ];

      const { error: updateError } = await supabaseClient
        .from('chatbot_conversations')
        .update({
          conversation_history: newHistory,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversation_id);

      if (updateError) {
        console.error('Error updating conversation:', updateError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        bot_response: sanitizeOutput(botResponse),
        candidates,
        extracted_filters: extractedFilters,
        candidates_count: candidates.length,
        conversation_id: saved_conversation_id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error processing chatbot message:', error);
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
 * Extract filters from user message using pattern matching and Claude AI
 */
async function extractFiltersFromMessage(
  userMessage: string,
  conversationHistory?: Array<{ role: 'recruiter' | 'bot'; content: string }>
): Promise<ExtractedFilters> {
  const filters: ExtractedFilters = {};

  // Pattern matching for common queries
  const messageLC = userMessage.toLowerCase();

  // Extract position/role
  const positionPatterns = [
    // Pattern 1: "find project manager", "find senior developer", etc.
    /(?:give me|find|show me|looking for|need|search|want)\s+(?:a\s+)?(?:\d+\s+)?(?:candidates?\s+)?(?:for\s+)?(?:a\s+)?(\w+(?:\s+\w+)*?)\s*$/i,
    // Pattern 2: "find a senior React developer"
    /(?:give me|find|show me|looking for|need|search|want)\s+(?:a\s+)?(?:\d+\s+)?(?:candidates?\s+)?(?:for\s+)?(?:a\s+)?(.+?)\s+(?:with|in|who|having)/i,
    // Pattern 3: Position with specific titles
    /(?:give me|find|show me|looking for|need|search|want)\s+(?:a\s+)?(?:\d+\s+)?(?:candidates?\s+)?(?:for\s+)?(?:a\s+)?([a-z\s]+?)\s+(?:developer|engineer|analyst|specialist|manager|lead|architect|designer|consultant)/i,
  ];

  for (const pattern of positionPatterns) {
    const match = userMessage.match(pattern);
    if (match) {
      const position = match[1].trim();
      // Validate position is not too long and contains meaningful content
      if (position.length > 2 && position.length < 100) {
        filters.position = position;
        break;
      }
    }
  }

  // Extract years of experience
  const yearsPatterns = [
    /(\d+)\+?\s+years?(?:\s+of\s+)?experience/i,
    /(\d+)\s*-\s*(\d+)\s+years?(?:\s+of\s+)?experience/i,
    /at\s+least\s+(\d+)\s+years?/i,
    /(\d+)\+\s+years?/i,
  ];

  for (const pattern of yearsPatterns) {
    const match = userMessage.match(pattern);
    if (match) {
      if (match[2]) {
        // Range found
        filters.years_experience = {
          min: parseInt(match[1]),
          max: parseInt(match[2]),
          range: `${match[1]}-${match[2]}`,
        };
      } else {
        // Single number
        const years = parseInt(match[1]);
        filters.years_experience = {
          min: years,
          range: `${years}+`,
        };
      }
      break;
    }
  }

  // Extract skills
  const skillsKeywords = [
    'skills?',
    'technologies?',
    'stacks?',
    'experienced in',
    'expertise in',
    'proficient in',
    'knows?',
    'programming languages?',
  ];

  let skillsText = '';
  for (const keyword of skillsKeywords) {
    const pattern = new RegExp(`(?:${keyword})\\s*:?\\s*([^.]+?)(?:\\.|,|\\s+and\\s+|$)`, 'i');
    const match = userMessage.match(pattern);
    if (match) {
      skillsText = match[1];
      break;
    }
  }

  // Parse skills from text
  if (skillsText) {
    const skillsList = skillsText
      .split(/[,;]/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0 && s.length < 50);

    filters.skills = [...new Set(skillsList)];
  }

  // Extract location
  const locationPatterns = [
    /(?:in|from|based in|based at|located in)\s+([A-Za-z\s]+?)(?:,|$|\.|;)/i,
    /\b([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+(?:based|located|candidates?)/i,
  ];

  for (const pattern of locationPatterns) {
    const match = userMessage.match(pattern);
    if (match) {
      const location = match[1].trim();
      if (location.length > 2 && location.length < 50) {
        filters.location = location;
        break;
      }
    }
  }

  // Extract number of results
  const numPattern = /(?:give me|show me|find)\s+(\d+)\s+(?:candidates?|people|results?)/i;
  const numMatch = userMessage.match(numPattern);
  if (numMatch) {
    filters.num_results = Math.min(parseInt(numMatch[1]), 50); // Cap at 50
  } else {
    filters.num_results = 5; // Default
  }

  // Extract specific experience
  const experiencePatterns = [
    /(?:experience|experience with|worked on|responsible for|led)\s+([^.]+?)(?:\.|,|$)/i,
    /(?:projects?|achievements?|responsibilities?)\s*:?\s*([^.]+?)(?:\.|,|$)/i,
  ];

  for (const pattern of experiencePatterns) {
    const match = userMessage.match(pattern);
    if (match) {
      const experience = match[1].trim();
      if (experience.length > 5 && experience.length < 200) {
        filters.specific_experience = experience;
        break;
      }
    }
  }

  // Check if this is a casual/greeting message
  const casualMessages = ['hi', 'hello', 'hey', 'thanks', 'thank you', 'ok', 'okay', 'yes', 'no'];
  const isCasualMessage = casualMessages.includes(userMessage.toLowerCase().trim());

  // Determine if query is complete enough for search
  const hasSearchIntent =
    userMessage.toLowerCase().includes('give') ||
    userMessage.toLowerCase().includes('find') ||
    userMessage.toLowerCase().includes('show') ||
    userMessage.toLowerCase().includes('search') ||
    userMessage.toLowerCase().includes('looking for') ||
    userMessage.toLowerCase().includes('need') ||
    userMessage.toLowerCase().includes('want');

  // Check if user just stated a position (like answering a question)
  // If they provide a position without explicit search intent, assume they want to search
  // This handles cases like "project manager" or "React developer" without "find"
  const isPositionResponse = filters.position && !isCasualMessage;

  // Mark query as complete if we have enough information
  // Accept position-only queries even without explicit search intent keywords
  filters.is_query_complete = !!(
    (filters.position || (filters.skills && filters.skills.length >= 2)) && (hasSearchIntent || isPositionResponse)
  );

  // If it's a casual message and no filters found, mark as incomplete
  if (isCasualMessage && !filters.position && !filters.skills?.length) {
    filters.is_query_complete = false;
  }

  return filters;
}

/**
 * Perform semantic search using vector similarity
 */
async function performSemanticSearch(
  supabaseClient: any,
  recruiter_id: string,
  userMessage: string,
  filters: ExtractedFilters
): Promise<CandidateResult[]> {
  try {
    // 1. Generate embedding for user query using OpenAI
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
        input: userMessage,
      }),
    });

    if (!embeddingResponse.ok) {
      throw new Error(`OpenAI embedding failed: ${embeddingResponse.statusText}`);
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // 2. Perform vector similarity search using RPC function
    // Since Supabase doesn't allow direct vector queries in SDK, we'll use a custom RPC
    const { data: candidates, error: searchError } = await supabaseClient.rpc(
      'search_candidates_by_embedding',
      {
        query_embedding: queryEmbedding,
        similarity_threshold: 0.5,
        limit: filters.num_results || 5,
      }
    );

    if (searchError) {
      console.log('RPC not available, using keyword search fallback');
      return performKeywordSearch(supabaseClient, recruiter_id, filters);
    }

    // 3. Apply additional filters to results
    let filtered = candidates || [];

    if (filters.years_experience?.min) {
      filtered = filtered.filter(
        (c: any) => (c.metadata?.years_of_experience || 0) >= filters.years_experience!.min!
      );
    }

    if (filters.skills && filters.skills.length > 0) {
      filtered = filtered.filter((c: any) => {
        const candidateSkills = (c.metadata?.skills || []).map((s: string) => s.toLowerCase());
        return filters.skills!.some((skill) => candidateSkills.includes(skill.toLowerCase()));
      });
    }

    if (filters.location) {
      filtered = filtered.filter((c: any) =>
        (c.metadata?.location || '').toLowerCase().includes(filters.location!.toLowerCase())
      );
    }

    if (filters.country) {
      filtered = filtered.filter((c: any) =>
        (c.metadata?.country || '').toLowerCase().includes(filters.country!.toLowerCase())
      );
    }

    // 4. Map to result format with candidate profile data
    const candidateIds = filtered.map((c: any) => c.candidate_id);

    // Fetch full candidate profiles
    const { data: profiles } = await supabaseClient
      .from('candidate_profiles')
      .select('*')
      .in('id', candidateIds);

    const profilesMap = new Map((profiles || []).map((p: any) => [p.id, p])) as Map<string, any>;

    return filtered.map((c: any) => {
      const profile = profilesMap.get(c.candidate_id);
      return {
        id: c.candidate_id,
        name: profile?.name || c.metadata?.name,
        family_name: profile?.family_name,
        headline: c.metadata?.headline || c.metadata?.current_position,
        location: profile?.location || c.metadata?.location,
        years_of_experience: c.metadata?.years_of_experience,
        skills: c.metadata?.skills || [],
        current_position: c.metadata?.current_position,
        current_company: c.metadata?.current_company,
        specific_experience: filters.specific_experience,
        cv_url: profile?.cv_url,
        relevance_score: Math.round(c.similarity * 100), // Similarity is already 0-1, convert to percentage
      };
    });
  } catch (error) {
    console.error('Error in semantic search:', error);
    // Fallback to keyword search
    return performKeywordSearch(supabaseClient, recruiter_id, filters);
  }
}

/**
 * Fallback keyword search when vector search is unavailable
 */
async function performKeywordSearch(
  supabaseClient: any,
  recruiter_id: string,
  filters: ExtractedFilters
): Promise<CandidateResult[]> {
  try {
    // Search candidate_profiles table (main source of candidates)
    let query = supabaseClient
      .from('candidate_profiles')
      .select('*')
      .limit(filters.num_results || 10);

    // Apply filters
    if (filters.location) {
      query = query.ilike('location', `%${filters.location}%`);
    }

    if (filters.country) {
      query = query.ilike('country', `%${filters.country}%`);
    }

    const { data: candidates, error } = await query;

    if (error) throw error;

    // Apply in-memory filters for JSONB fields
    let filtered = candidates || [];

    // Filter by skills
    if (filters.skills && filters.skills.length > 0) {
      filtered = filtered.filter((c: any) => {
        // Check interests array
        const interests = (c.interests || []).map((s: string) => s.toLowerCase());
        const hasSkillInInterests = filters.skills!.some((skill) =>
          interests.includes(skill.toLowerCase())
        );

        // Check work experience for skills/technologies
        const workExperience = c.work_experience || [];
        const hasSkillInExperience = workExperience.some((exp: any) => {
          const technologies = (exp.technologies || '').toLowerCase();
          const description = (exp.description || '').toLowerCase();
          return filters.skills!.some((skill) =>
            technologies.includes(skill.toLowerCase()) ||
            description.includes(skill.toLowerCase())
          );
        });

        // Check other_sections for skills
        const otherSections = c.other_sections || [];
        const hasSkillInOther = otherSections.some((section: any) => {
          const title = (section.title || '').toLowerCase();
          const desc = (section.description || '').toLowerCase();
          if (title !== 'skills') return false;
          return filters.skills!.some((skill) => desc.includes(skill.toLowerCase()));
        });

        return hasSkillInInterests || hasSkillInExperience || hasSkillInOther;
      });
    }

    // Calculate years of experience from work_experience array
    if (filters.years_experience?.min) {
      filtered = filtered.filter((c: any) => {
        const workExp = c.work_experience || [];
        let totalYears = 0;

        workExp.forEach((exp: any) => {
          const startYear = parseInt(exp.start_year || '0');
          const endYear = exp.is_present ? new Date().getFullYear() : parseInt(exp.end_year || '0');
          if (startYear && endYear) {
            totalYears += (endYear - startYear);
          }
        });

        return totalYears >= filters.years_experience!.min!;
      });
    }

    // Map to result format
    return filtered.slice(0, filters.num_results || 10).map((c: any) => {
      // Calculate total years of experience
      const workExp = c.work_experience || [];
      let totalYears = 0;
      workExp.forEach((exp: any) => {
        const startYear = parseInt(exp.start_year || '0');
        const endYear = exp.is_present ? new Date().getFullYear() : parseInt(exp.end_year || '0');
        if (startYear && endYear) {
          totalYears += (endYear - startYear);
        }
      });

      // Get current position
      const currentJob = workExp.find((exp: any) => exp.is_present);

      // Extract skills from interests and work experience
      const skills = [
        ...(c.interests || []),
        ...workExp.flatMap((exp: any) =>
          (exp.technologies || '').split(',').map((t: string) => t.trim()).filter(Boolean)
        ),
      ];

      return {
        id: c.id,
        name: `${c.name || ''} ${c.family_name || ''}`.trim() || 'Anonymous',
        headline: currentJob?.title || c.work_experience?.[0]?.title,
        location: c.location,
        years_of_experience: totalYears,
        skills: [...new Set(skills)].slice(0, 10),
        current_position: currentJob?.title,
        current_company: currentJob?.company,
        specific_experience: filters.specific_experience,
        cv_url: c.cv_url,
        relevance_score: 70, // Default score for keyword matches
      };
    });
  } catch (error) {
    console.error('Error in keyword search:', error);
    return [];
  }
}

/**
 * Generate follow-up question when filters are incomplete
 */
function generateFollowUpQuestion(filters: ExtractedFilters): string {
  if (!filters.position && !filters.skills?.length) {
    return "What position or role are you looking for? (e.g., 'Senior React Developer')";
  }

  if (!filters.years_experience) {
    return 'How many years of experience are you looking for? (e.g., "5+ years" or "3-7 years")';
  }

  if (!filters.skills?.length) {
    return "What specific skills or technologies should they have? (e.g., 'React, Node.js, PostgreSQL')";
  }

  return 'Any other requirements? (e.g., location, languages, certifications)';
}

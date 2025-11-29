// Edge Function: ReAct Agent for Recruiter Candidate Search
// Purpose: Autonomous agent using Reasoning + Acting loop to find candidates
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  safetyCheck,
  safeLLMCall,
  writeAuditLog,
} from '../_shared/safety-gateway.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface ChatbotRequest {
  recruiter_id: string;
  conversation_id?: string;
  user_message: string;
  conversation_history?: Array<{ role: 'recruiter' | 'bot'; content: string }>;
}

interface Tool {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

interface AgentAction {
  tool: string;
  input: Record<string, any>;
  reasoning: string;
}

interface AgentStep {
  thought: string;
  action: AgentAction | null;
  observation: string;
  timestamp: string;
}

interface AgentResult {
  success: boolean;
  final_answer: string;
  candidates: any[];
  reasoning_trace: AgentStep[];
  tool_calls: number;
  total_tokens: number;
  cost_usd: number;
}

// ============================================================================
// TOOL REGISTRY
// ============================================================================

const AVAILABLE_TOOLS: Tool[] = [
  {
    name: 'semantic_search',
    description: 'Search candidates using vector similarity (semantic). Best for vague queries like "experienced developer" or when matching on overall profile fit. Fast and works well with natural language.',
    parameters: {
      query: 'string - the natural language query',
      limit: 'number - max results (default 5)',
      min_similarity: 'number - 0-1 threshold (default 0.5)',
    },
  },
  {
    name: 'keyword_search',
    description: 'Search candidates using exact keyword matching on skills, location, experience. Best when recruiter specifies exact technologies (e.g., "React", "Python") or locations. More precise but less flexible.',
    parameters: {
      position: 'string - job title or role',
      skills: 'string[] - exact skill names',
      location: 'string - city or country',
      min_years: 'number - minimum years of experience',
      limit: 'number - max results (default 10)',
    },
  },
  {
    name: 'external_search',
    description: 'Search for candidates outside our database using LinkedIn, GitHub, Google, Stack Overflow. Use when internal search returns too few results or recruiter asks to "look outside" or "find on LinkedIn". Slower and costs more.',
    parameters: {
      job_title: 'string - target role',
      skills: 'string[] - required skills',
      location: 'string - location filter',
      platforms: 'string[] - which platforms to search (linkedin, github, google, stackoverflow)',
    },
  },
  {
    name: 'filter_candidates',
    description: 'Apply additional filters to existing candidate list. Use after search to narrow down results by experience, education, certifications, or other criteria.',
    parameters: {
      candidate_ids: 'string[] - list of candidate IDs to filter',
      min_years: 'number - minimum years experience',
      required_skills: 'string[] - must have these skills',
      education_level: 'string - minimum education (bachelors, masters, phd)',
    },
  },
];

// ============================================================================
// TOOL IMPLEMENTATIONS
// ============================================================================

async function executeSemanticSearch(
  supabaseClient: any,
  query: string,
  limit: number = 5,
  minSimilarity: number = 0.5
): Promise<any[]> {
  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) throw new Error('OPENAI_API_KEY not configured');

    // Generate embedding
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: query,
      }),
    });

    if (!embeddingResponse.ok) throw new Error('Embedding generation failed');

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // Vector search
    const { data: candidates, error } = await supabaseClient.rpc(
      'search_candidates_by_embedding',
      {
        query_embedding: queryEmbedding,
        similarity_threshold: minSimilarity,
        limit: limit,
      }
    );

    if (error) throw error;

    // Fetch full profiles
    const candidateIds = (candidates || []).map((c: any) => c.candidate_id);
    const { data: profiles } = await supabaseClient
      .from('candidate_profiles')
      .select('*')
      .in('id', candidateIds);

    const profilesMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    return (candidates || []).map((c: any) => {
      const profile = profilesMap.get(c.candidate_id) as any;
      return {
        id: c.candidate_id,
        name: profile?.name || 'Unknown',
        family_name: profile?.family_name,
        location: profile?.location || c.metadata?.location,
        skills: profile?.interests || c.metadata?.skills || [],
        similarity_score: Math.round(c.similarity * 100),
        cv_url: profile?.cv_url,
        metadata: c.metadata,
      };
    });
  } catch (error) {
    console.error('Semantic search error:', error);
    return [];
  }
}

async function executeKeywordSearch(
  supabaseClient: any,
  position?: string,
  skills?: string[],
  location?: string,
  minYears?: number,
  limit: number = 10
): Promise<any[]> {
  try {
    let query = supabaseClient.from('candidate_profiles').select('*').limit(limit);

    if (location) {
      query = query.ilike('location', `%${location}%`);
    }

    const { data: candidates, error } = await query;
    if (error) throw error;

    let filtered = candidates || [];

    // Filter by skills
    if (skills && skills.length > 0) {
      filtered = filtered.filter((c: any) => {
        const candidateSkills = (c.interests || []).map((s: string) => s.toLowerCase());
        return skills.some((skill) => candidateSkills.includes(skill.toLowerCase()));
      });
    }

    // Filter by years of experience
    if (minYears) {
      filtered = filtered.filter((c: any) => {
        const workExp = c.work_experience || [];
        let totalYears = 0;
        workExp.forEach((exp: any) => {
          const startYear = parseInt(exp.start_year || '0');
          const endYear = exp.is_present ? new Date().getFullYear() : parseInt(exp.end_year || '0');
          if (startYear && endYear) totalYears += endYear - startYear;
        });
        return totalYears >= minYears;
      });
    }

    return filtered.slice(0, limit).map((c: any) => ({
      id: c.id,
      name: c.name || 'Unknown',
      family_name: c.family_name,
      location: c.location,
      skills: c.interests || [],
      similarity_score: 70,
      cv_url: c.cv_url,
    }));
  } catch (error) {
    console.error('Keyword search error:', error);
    return [];
  }
}

async function executeExternalSearch(
  supabaseClient: any,
  recruiterId: string,
  jobTitle: string,
  skills: string[],
  location?: string,
  platforms: string[] = ['linkedin', 'github']
): Promise<any[]> {
  try {
    // Call headhunt function
    const { data, error } = await supabaseClient.functions.invoke('headhunt-external', {
      body: {
        recruiter_id: recruiterId,
        criteria: {
          job_title: jobTitle,
          required_skills: skills,
          location: location,
          platforms: platforms,
        },
      },
    });

    if (error) throw error;

    return (data?.candidates || []).map((c: any) => ({
      id: c.id || `ext_${Date.now()}`,
      name: c.name || 'Unknown',
      location: c.location,
      skills: c.skills || [],
      similarity_score: c.quality_score || 60,
      source: c.source || 'external',
      profile_url: c.profile_url,
    }));
  } catch (error) {
    console.error('External search error:', error);
    return [];
  }
}

// ============================================================================
// REACT AGENT CORE
// ============================================================================

async function runReActAgent(
  supabaseClient: any,
  recruiterId: string,
  userGoal: string,
  conversationHistory: Array<{ role: string; content: string }> = [],
  maxIterations: number = 5,
  safetyContext?: {
    user_id: string;
    ip_address: string;
    user_agent: string;
  }
): Promise<AgentResult> {
  const reasoningTrace: AgentStep[] = [];
  let totalTokens = 0;
  let totalCost = 0;
  let candidates: any[] = [];
  let currentIteration = 0;

  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) throw new Error('OPENAI_API_KEY not configured');

  // Build context
  const conversationContext = conversationHistory.length > 0
    ? `Previous conversation:\n${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')}\n\n`
    : '';

  while (currentIteration < maxIterations) {
    currentIteration++;
    console.log(`\n=== ReAct Iteration ${currentIteration} ===`);

    // Build prompt for reasoning step
    const systemPrompt = `You are an autonomous recruiting agent. Your goal is to help recruiters find the best candidates.

Available tools:
${AVAILABLE_TOOLS.map(t => `- ${t.name}: ${t.description}\n  Parameters: ${JSON.stringify(t.parameters)}`).join('\n\n')}

You must reason step-by-step using this format:

THOUGHT: [Your reasoning about what to do next]
ACTION: [Which tool to use - must be one of: ${AVAILABLE_TOOLS.map(t => t.name).join(', ')}]
ACTION_INPUT: [JSON object with tool parameters]

OR, if you have enough information to answer:

THOUGHT: [Why you have enough information]
FINAL_ANSWER: [Your response to the recruiter with candidate summary]

Previous steps taken:
${reasoningTrace.map((s, i) => `Step ${i + 1}:
THOUGHT: ${s.thought}
${s.action ? `ACTION: ${s.action.tool}\nACTION_INPUT: ${JSON.stringify(s.action.input)}` : ''}
OBSERVATION: ${s.observation}`).join('\n\n')}

Remember:
- Use semantic_search for vague/natural language queries
- Use keyword_search for exact skill/location matching
- Use external_search only if internal searches return <3 results
- Combine tools if needed (e.g., semantic_search then filter_candidates)
- Stop when you have 3+ good candidates or after 5 steps`;

    const userPrompt = `${conversationContext}Recruiter's current request: ${userGoal}

What should you do next?`;

    // Call LLM for reasoning with Safety Gateway
    const llmResult = await safeLLMCall(
      userPrompt,
      async () => {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.3,
            max_tokens: 500,
          }),
        });

        if (!response.ok) {
          throw new Error(`LLM reasoning failed: ${response.statusText}`);
        }

        const responseData = await response.json();
        return {
          output: responseData.choices[0].message.content,
          tokens: responseData.usage.total_tokens,
        };
      },
      {
        supabaseClient,
        openaiApiKey,
        user_id: safetyContext?.user_id || recruiterId,
        user_role: 'recruiter',
        action_type: 'RECRUITER_AGENT_REASONING',
        action_category: 'autonomous_action',
        llm_model: 'gpt-4',
        ip_address: safetyContext?.ip_address || '',
        user_agent: safetyContext?.user_agent || '',
      }
    );

    if (!llmResult.success) {
      throw new Error(llmResult.error || 'LLM reasoning failed');
    }

    const llmOutput = llmResult.result.output;
    const iterationTokens = llmResult.result.tokens;
    totalTokens += iterationTokens;
    totalCost += (iterationTokens / 1000) * 0.03; // GPT-4 pricing

    console.log('LLM Output:', llmOutput);

    // Parse LLM output
    const thoughtMatch = llmOutput.match(/THOUGHT:\s*(.+?)(?=\n(?:ACTION|FINAL_ANSWER):)/s);
    const actionMatch = llmOutput.match(/ACTION:\s*(\w+)/);
    const actionInputMatch = llmOutput.match(/ACTION_INPUT:\s*(\{.+?\})/s);
    const finalAnswerMatch = llmOutput.match(/FINAL_ANSWER:\s*(.+)/s);

    const thought = thoughtMatch ? thoughtMatch[1].trim() : 'Analyzing request...';

    // Check if agent wants to finish
    if (finalAnswerMatch) {
      const finalAnswer = finalAnswerMatch[1].trim();
      reasoningTrace.push({
        thought,
        action: null,
        observation: `Agent decided to finish with answer: ${finalAnswer}`,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        final_answer: finalAnswer,
        candidates,
        reasoning_trace: reasoningTrace,
        tool_calls: reasoningTrace.filter(s => s.action).length,
        total_tokens: totalTokens,
        cost_usd: totalCost,
      };
    }

    // Execute action
    if (actionMatch && actionInputMatch) {
      const toolName = actionMatch[1].trim();
      let toolInput: Record<string, any>;

      try {
        toolInput = JSON.parse(actionInputMatch[1].trim());
      } catch (e) {
        console.error('Failed to parse ACTION_INPUT:', actionInputMatch[1]);
        reasoningTrace.push({
          thought,
          action: { tool: toolName, input: {}, reasoning: thought },
          observation: 'ERROR: Invalid JSON in ACTION_INPUT',
          timestamp: new Date().toISOString(),
        });
        continue;
      }

      // Execute tool
      let observation = '';
      let toolResults: any[] = [];

      try {
        switch (toolName) {
          case 'semantic_search':
            toolResults = await executeSemanticSearch(
              supabaseClient,
              toolInput.query || userGoal,
              toolInput.limit || 5,
              toolInput.min_similarity || 0.5
            );
            observation = `Found ${toolResults.length} candidates via semantic search. Top matches: ${toolResults.slice(0, 3).map(c => `${c.name} (${c.similarity_score}% match)`).join(', ')}`;
            candidates = [...candidates, ...toolResults];
            break;

          case 'keyword_search':
            toolResults = await executeKeywordSearch(
              supabaseClient,
              toolInput.position,
              toolInput.skills,
              toolInput.location,
              toolInput.min_years,
              toolInput.limit || 10
            );
            observation = `Found ${toolResults.length} candidates via keyword search matching: ${toolInput.skills?.join(', ') || 'criteria'}`;
            candidates = [...candidates, ...toolResults];
            break;

          case 'external_search':
            toolResults = await executeExternalSearch(
              supabaseClient,
              recruiterId,
              toolInput.job_title || userGoal,
              toolInput.skills || [],
              toolInput.location,
              toolInput.platforms || ['linkedin', 'github']
            );
            observation = `Found ${toolResults.length} external candidates on ${toolInput.platforms?.join(', ')}`;
            candidates = [...candidates, ...toolResults];
            break;

          case 'filter_candidates':
            // Filter existing candidates
            const filtered = candidates.filter(c => {
              if (toolInput.required_skills) {
                const hasSkills = toolInput.required_skills.every((skill: string) =>
                  c.skills.some((s: string) => s.toLowerCase().includes(skill.toLowerCase()))
                );
                if (!hasSkills) return false;
              }
              return true;
            });
            observation = `Filtered candidates: ${candidates.length} → ${filtered.length} after applying filters`;
            candidates = filtered;
            break;

          default:
            observation = `ERROR: Unknown tool "${toolName}"`;
        }
      } catch (error) {
        observation = `ERROR executing ${toolName}: ${error instanceof Error ? error.message : 'unknown error'}`;
        console.error(observation);
      }

      reasoningTrace.push({
        thought,
        action: { tool: toolName, input: toolInput, reasoning: thought },
        observation,
        timestamp: new Date().toISOString(),
      });

      // Check if we have enough candidates to stop
      if (candidates.length >= 5) {
        const finalAnswer = `I found ${candidates.length} candidates matching your criteria. Here are the top matches based on ${reasoningTrace.map(s => s.action?.tool).filter(Boolean).join(' and ')}.`;
        return {
          success: true,
          final_answer: finalAnswer,
          candidates: candidates.slice(0, 10), // Return top 10
          reasoning_trace: reasoningTrace,
          tool_calls: reasoningTrace.filter(s => s.action).length,
          total_tokens: totalTokens,
          cost_usd: totalCost,
        };
      }
    } else {
      // LLM didn't provide valid action or final answer
      reasoningTrace.push({
        thought,
        action: null,
        observation: 'Agent failed to provide valid ACTION or FINAL_ANSWER',
        timestamp: new Date().toISOString(),
      });
      break;
    }
  }

  // Max iterations reached
  const finalAnswer = candidates.length > 0
    ? `After ${currentIteration} steps, I found ${candidates.length} candidates. Here are the results.`
    : `I couldn't find candidates matching your exact criteria after ${currentIteration} attempts. Try broadening your search or checking external sources.`;

  return {
    success: candidates.length > 0,
    final_answer: finalAnswer,
    candidates: candidates.slice(0, 10),
    reasoning_trace: reasoningTrace,
    tool_calls: reasoningTrace.filter(s => s.action).length,
    total_tokens: totalTokens,
    cost_usd: totalCost,
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

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

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { recruiter_id, conversation_id, user_message, conversation_history } =
      (await req.json()) as ChatbotRequest;

    if (!recruiter_id || !user_message) {
      throw new Error('recruiter_id and user_message are required');
    }

    // Get OpenAI API key for Safety Gateway
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY') ?? '';
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Get IP and user agent for audit logging
    const ip_address = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';
    const user_agent = req.headers.get('user-agent') || '';

    // Safety check on recruiter input
    const inputCheck = await safetyCheck(user_message, openaiApiKey);

    if (inputCheck.blocked) {
      console.warn('Recruiter input blocked by Safety Gateway:', {
        recruiter_id,
        patterns: inputCheck.patterns_triggered,
        moderation: inputCheck.flagged,
      });

      // Log the blocked attempt
      await writeAuditLog(supabaseClient, {
        user_id: user.id,
        user_role: 'recruiter',
        action_type: 'RECRUITER_CHATBOT_BLOCKED',
        action_category: 'security_event',
        resource_type: 'chat_message',
        moderation_result: inputCheck.moderation_result,
        patterns_triggered: inputCheck.patterns_triggered,
        safety_action: 'blocked',
        details: { message_preview: user_message.substring(0, 100) },
        ip_address,
        user_agent,
        severity: 'warning',
        requires_review: inputCheck.flagged,
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: "I'm here to help you find candidates. I can't process that request. Please ask about finding candidates with specific skills or experience.",
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log(`\n========================================`);
    console.log(`ReAct Agent Request from recruiter ${recruiter_id}`);
    console.log(`User message: ${user_message}`);
    console.log(`========================================\n`);

    // Run ReAct agent with safety context
    const result = await runReActAgent(
      supabaseClient,
      recruiter_id,
      user_message,
      conversation_history || [],
      5, // maxIterations
      {
        user_id: user.id,
        ip_address,
        user_agent,
      }
    );

    // Save conversation
    let saved_conversation_id = conversation_id;
    const botResponse = result.final_answer;

    if (!conversation_id) {
      const { data: newConversation } = await supabaseClient
        .from('chatbot_conversations')
        .insert({
          recruiter_id,
          conversation_history: [
            { role: 'recruiter', content: user_message, timestamp: new Date().toISOString() },
            { role: 'bot', content: botResponse, timestamp: new Date().toISOString() },
          ],
          metadata: {
            reasoning_trace: result.reasoning_trace,
            tool_calls: result.tool_calls,
            tokens: result.total_tokens,
            cost: result.cost_usd,
          },
        })
        .select('id')
        .single();

      if (newConversation) saved_conversation_id = newConversation.id;
    } else {
      const newHistory = [
        ...(conversation_history || []),
        { role: 'recruiter', content: user_message, timestamp: new Date().toISOString() },
        { role: 'bot', content: botResponse, timestamp: new Date().toISOString() },
      ];

      await supabaseClient
        .from('chatbot_conversations')
        .update({
          conversation_history: newHistory,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversation_id);
    }

    console.log(`\n========================================`);
    console.log(`Agent completed successfully`);
    console.log(`Tool calls: ${result.tool_calls}`);
    console.log(`Total tokens: ${result.total_tokens}`);
    console.log(`Cost: $${result.cost_usd.toFixed(4)}`);
    console.log(`========================================\n`);

    return new Response(
      JSON.stringify({
        success: true,
        bot_response: result.final_answer,
        candidates: result.candidates,
        candidates_count: result.candidates.length,
        conversation_id: saved_conversation_id,
        // Include reasoning trace for demo/debugging
        agent_trace: result.reasoning_trace,
        metrics: {
          tool_calls: result.tool_calls,
          total_tokens: result.total_tokens,
          cost_usd: result.cost_usd,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in ReAct agent:', error);
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

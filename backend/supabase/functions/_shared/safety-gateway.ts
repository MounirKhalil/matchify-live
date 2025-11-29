// Safety Gateway: Unified security layer combining pattern-based and AI-based moderation
// Protects all LLM interactions with multi-layered defense

export interface SafetyCheckResult {
  safe: boolean;
  blocked: boolean;
  flagged: boolean;
  reasons: string[];
  patterns_triggered: string[];
  moderation_result?: any;
  sanitized_text?: string;
  action: 'allowed' | 'blocked' | 'flagged_for_review' | 'sanitized';
}

export interface AuditLogEntry {
  user_id?: string;
  user_role: 'job_seeker' | 'recruiter' | 'admin' | 'system';
  action_type: string;
  action_category: 'authentication' | 'data_access' | 'data_modification' | 'autonomous_action' | 'security_event' | 'cost_event';
  resource_type?: string;
  resource_id?: string;
  moderation_result?: any;
  patterns_triggered?: string[];
  safety_action: 'allowed' | 'blocked' | 'flagged_for_review' | 'sanitized';
  tool_calls?: string[];
  llm_model?: string;
  total_tokens?: number;
  cost_usd?: number;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  requires_review?: boolean;
}

// Pattern definitions with names for audit trail
const SECURITY_PATTERNS = {
  // System override attempts
  system_override: /ignore\s+(previous|above|all|prior)\s+(instructions?|prompts?|commands?)/i,
  disregard_instructions: /disregard\s+(previous|above|all|prior|everything)/i,
  forget_instructions: /forget\s+(everything|all|previous|instructions?)/i,

  // Role manipulation
  role_change: /you\s+are\s+now/i,
  new_instructions: /new\s+(instructions?|role|character|personality)/i,
  act_as_other: /act\s+as\s+(?!.*(?:ProfilePal|assistant|helper|recruiter))/i,
  pretend_to_be: /pretend\s+(?:to\s+be|you)/i,

  // System prompt extraction
  reveal_prompt: /system\s*prompt/i,
  system_tags: /\[SYSTEM\]|<system>|\{\{system\}\}/i,
  reveal_instructions: /reveal\s+your\s+(prompt|instructions?)/i,
  show_instructions: /show\s+me\s+your\s+(prompt|instructions?)/i,

  // XSS attempts
  script_tag: /<script>/i,
  javascript_protocol: /javascript:/i,
  event_handlers: /onerror=|onclick=/i,

  // SQL injection
  execute_code: /execute\s+(code|command|sql)/i,
  drop_table: /DROP\s+TABLE/i,
  delete_from: /DELETE\s+FROM/i,

  // API key extraction attempts
  reveal_keys: /(?:show|give|reveal|tell).*(?:api|secret|key|password|token)/i,
  env_variables: /process\.env|Deno\.env/i,
};

/**
 * Check text against pattern-based security rules
 */
export function checkPatterns(text: string): { matched: boolean; patterns: string[] } {
  const matched_patterns: string[] = [];

  for (const [name, pattern] of Object.entries(SECURITY_PATTERNS)) {
    if (pattern.test(text)) {
      matched_patterns.push(name);
    }
  }

  return {
    matched: matched_patterns.length > 0,
    patterns: matched_patterns,
  };
}

/**
 * Check text using OpenAI Moderation API
 * Detects: hate, harassment, self-harm, sexual, violence
 */
export async function checkModeration(
  text: string,
  openaiApiKey: string
): Promise<{ flagged: boolean; categories: string[]; result: any }> {
  try {
    const response = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'omni-moderation-latest',  // Latest moderation model
        input: text,
      }),
    });

    if (!response.ok) {
      console.error('Moderation API error:', response.statusText);
      // Fail open (allow) rather than fail closed (block) for availability
      return { flagged: false, categories: [], result: null };
    }

    const data = await response.json();
    const result = data.results[0];

    const flagged_categories: string[] = [];
    if (result.flagged) {
      // Collect which categories were flagged
      for (const [category, isFlagged] of Object.entries(result.categories)) {
        if (isFlagged) {
          flagged_categories.push(category as string);
        }
      }
    }

    return {
      flagged: result.flagged,
      categories: flagged_categories,
      result: result,
    };
  } catch (error) {
    console.error('Moderation check failed:', error);
    // Fail open - allow the request but log the error
    return { flagged: false, categories: [], result: null };
  }
}

/**
 * Sanitize output to prevent information leakage
 */
export function sanitizeOutput(text: string): string {
  const forbiddenTerms = [
    { pattern: /SUPABASE_URL/gi, replacement: '[REDACTED]' },
    { pattern: /SUPABASE_ANON_KEY/gi, replacement: '[REDACTED]' },
    { pattern: /SUPABASE_SERVICE_ROLE_KEY/gi, replacement: '[REDACTED]' },
    { pattern: /OPENAI_API_KEY/gi, replacement: '[REDACTED]' },
    { pattern: /ANTHROPIC_API_KEY/gi, replacement: '[REDACTED]' },
    { pattern: /api[_-]?key[:\s=]+[a-zA-Z0-9\-_]+/gi, replacement: '[REDACTED]' },
    { pattern: /secret[_-]?key[:\s=]+[a-zA-Z0-9\-_]+/gi, replacement: '[REDACTED]' },
    { pattern: /password[:\s=]+[a-zA-Z0-9\-_]+/gi, replacement: '[REDACTED]' },
    { pattern: /Bearer\s+[a-zA-Z0-9\-_\.]+/gi, replacement: 'Bearer [REDACTED]' },
  ];

  let sanitized = text;
  forbiddenTerms.forEach(({ pattern, replacement }) => {
    sanitized = sanitized.replace(pattern, replacement);
  });

  return sanitized;
}

/**
 * Combined safety check: patterns + moderation
 */
export async function safetyCheck(
  text: string,
  openaiApiKey: string,
  context?: { action_type?: string; user_role?: string }
): Promise<SafetyCheckResult> {
  const reasons: string[] = [];
  const patterns_triggered: string[] = [];

  // Step 1: Pattern-based checks
  const patternCheck = checkPatterns(text);
  if (patternCheck.matched) {
    patterns_triggered.push(...patternCheck.patterns);
    reasons.push(`Security patterns triggered: ${patternCheck.patterns.join(', ')}`);
  }

  // Step 2: AI-based moderation
  const moderationCheck = await checkModeration(text, openaiApiKey);
  if (moderationCheck.flagged) {
    reasons.push(`Moderation flagged: ${moderationCheck.categories.join(', ')}`);
  }

  // Step 3: Determine action
  let action: 'allowed' | 'blocked' | 'flagged_for_review' | 'sanitized';
  let safe = true;
  let blocked = false;
  let flagged = false;

  if (patternCheck.matched) {
    // Pattern match = hard block
    blocked = true;
    safe = false;
    action = 'blocked';
  } else if (moderationCheck.flagged) {
    // Moderation flag = depends on severity and context
    const highRiskCategories = ['violence', 'self-harm'];
    const hasHighRisk = moderationCheck.categories.some(cat =>
      highRiskCategories.some(risk => cat.includes(risk))
    );

    if (hasHighRisk) {
      blocked = true;
      safe = false;
      action = 'blocked';
    } else {
      // Medium risk = flag for review but allow
      flagged = true;
      action = 'flagged_for_review';
    }
  } else {
    action = 'allowed';
  }

  return {
    safe,
    blocked,
    flagged,
    reasons,
    patterns_triggered,
    moderation_result: moderationCheck.result,
    sanitized_text: sanitizeOutput(text),
    action,
  };
}

/**
 * Write audit log entry to database
 */
export async function writeAuditLog(
  supabaseClient: any,
  entry: AuditLogEntry
): Promise<void> {
  try {
    const { error } = await supabaseClient.from('audit_logs').insert({
      user_id: entry.user_id || null,
      user_role: entry.user_role,
      action_type: entry.action_type,
      action_category: entry.action_category,
      resource_type: entry.resource_type || null,
      resource_id: entry.resource_id || null,
      moderation_result: entry.moderation_result || null,
      patterns_triggered: entry.patterns_triggered || [],
      safety_action: entry.safety_action,
      tool_calls: entry.tool_calls || [],
      llm_model: entry.llm_model || null,
      total_tokens: entry.total_tokens || null,
      cost_usd: entry.cost_usd || null,
      details: entry.details || {},
      ip_address: entry.ip_address || null,
      user_agent: entry.user_agent || null,
      severity: entry.severity,
      requires_review: entry.requires_review || false,
    });

    if (error) {
      console.error('Failed to write audit log:', error);
      // Don't throw - logging failure shouldn't break the main operation
    }
  } catch (error) {
    console.error('Audit log write exception:', error);
  }
}

/**
 * Safety Gateway wrapper for LLM calls
 * Use this to wrap all OpenAI/Anthropic API calls
 */
export async function safeLLMCall(
  userInput: string,
  llmFunction: () => Promise<any>,
  context: {
    supabaseClient: any;
    openaiApiKey: string;
    user_id?: string;
    user_role: 'job_seeker' | 'recruiter' | 'system';
    action_type: string;
    action_category: AuditLogEntry['action_category'];
    llm_model?: string;
    ip_address?: string;
    user_agent?: string;
  }
): Promise<{ success: boolean; result?: any; error?: string; safety?: SafetyCheckResult }> {
  // Step 1: Input safety check
  const inputCheck = await safetyCheck(userInput, context.openaiApiKey, {
    action_type: context.action_type,
    user_role: context.user_role,
  });

  // Step 2: Log if blocked or flagged
  if (inputCheck.blocked || inputCheck.flagged) {
    await writeAuditLog(context.supabaseClient, {
      user_id: context.user_id,
      user_role: context.user_role,
      action_type: context.action_type,
      action_category: context.action_category,
      moderation_result: inputCheck.moderation_result,
      patterns_triggered: inputCheck.patterns_triggered,
      safety_action: inputCheck.action,
      details: { user_input: userInput.substring(0, 200), reasons: inputCheck.reasons },
      ip_address: context.ip_address,
      user_agent: context.user_agent,
      severity: inputCheck.blocked ? 'error' : 'warning',
      requires_review: inputCheck.flagged,
    });
  }

  // Step 3: Block if necessary
  if (inputCheck.blocked) {
    return {
      success: false,
      error: 'Input blocked by security gateway',
      safety: inputCheck,
    };
  }

  // Step 4: Execute LLM call
  try {
    const result = await llmFunction();

    // Step 5: Output safety check (if result contains text)
    let outputCheck: SafetyCheckResult | undefined;
    if (typeof result === 'string') {
      outputCheck = await safetyCheck(result, context.openaiApiKey, context);
      if (outputCheck.blocked) {
        // Replace output with safe fallback
        await writeAuditLog(context.supabaseClient, {
          user_id: context.user_id,
          user_role: context.user_role,
          action_type: `${context.action_type}_OUTPUT_BLOCKED`,
          action_category: 'security_event',
          moderation_result: outputCheck.moderation_result,
          patterns_triggered: outputCheck.patterns_triggered,
          safety_action: 'blocked',
          details: { original_output: result.substring(0, 200) },
          severity: 'error',
        });

        return {
          success: true,
          result: 'I apologize, but I cannot provide that response. Please rephrase your request.',
          safety: outputCheck,
        };
      }
    }

    // Step 6: Log successful call
    await writeAuditLog(context.supabaseClient, {
      user_id: context.user_id,
      user_role: context.user_role,
      action_type: context.action_type,
      action_category: context.action_category,
      safety_action: 'allowed',
      llm_model: context.llm_model,
      details: { flagged: inputCheck.flagged },
      severity: 'info',
    });

    return {
      success: true,
      result,
      safety: outputCheck || inputCheck,
    };
  } catch (error) {
    // Step 7: Log LLM call failure
    await writeAuditLog(context.supabaseClient, {
      user_id: context.user_id,
      user_role: context.user_role,
      action_type: `${context.action_type}_FAILED`,
      action_category: 'security_event',
      safety_action: 'blocked',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      severity: 'error',
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'LLM call failed',
    };
  }
}

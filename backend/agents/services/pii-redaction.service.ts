/**
 * PII Redaction Service
 * Automatically detects and redacts personally identifiable information (PII)
 * from text to prevent data leakage in logs, errors, and external communications
 *
 * Compliance: GDPR, CCPA, SOC 2
 */

export interface PIIPattern {
  name: string;
  pattern: RegExp;
  replacement: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface RedactionResult {
  original: string;
  redacted: string;
  detectedPII: Array<{
    type: string;
    count: number;
    severity: string;
  }>;
  isClean: boolean;
}

/**
 * Comprehensive PII pattern definitions
 */
export const PII_PATTERNS: Record<string, PIIPattern> = {
  // HIGH SEVERITY - Never log these
  ssn: {
    name: 'Social Security Number',
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    replacement: '[SSN REDACTED]',
    severity: 'HIGH'
  },
  creditCard: {
    name: 'Credit Card',
    pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    replacement: '[CREDIT CARD REDACTED]',
    severity: 'HIGH'
  },
  password: {
    name: 'Password',
    pattern: /password[\s:=]+["']?[\w!@#$%^&*()]+["']?/gi,
    replacement: 'password=[REDACTED]',
    severity: 'HIGH'
  },
  apiKey: {
    name: 'API Key',
    pattern: /(?:api[_-]?key|apikey|access[_-]?token)[\s:=]+["']?[\w-]+["']?/gi,
    replacement: 'api_key=[REDACTED]',
    severity: 'HIGH'
  },

  // MEDIUM SEVERITY - Redact in logs, partial redaction in UI
  email: {
    name: 'Email Address',
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    replacement: '[EMAIL REDACTED]',
    severity: 'MEDIUM'
  },
  phone: {
    name: 'Phone Number',
    pattern: /\b(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
    replacement: '[PHONE REDACTED]',
    severity: 'MEDIUM'
  },
  ipv4: {
    name: 'IPv4 Address',
    pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    replacement: '[IP REDACTED]',
    severity: 'MEDIUM'
  },

  // LOW SEVERITY - Contextual redaction
  dateOfBirth: {
    name: 'Date of Birth',
    pattern: /\b(?:dob|date of birth)[\s:=]+\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/gi,
    replacement: 'dob=[REDACTED]',
    severity: 'LOW'
  }
};

/**
 * Redact PII from text based on mode
 * @param text - Input text to redact
 * @param mode - 'full' for complete redaction (logs), 'partial' for masked display (UI)
 * @returns Redacted text
 */
export function redactPII(text: string, mode: 'full' | 'partial' = 'full'): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  let redacted = text;

  // Always redact HIGH severity items
  for (const [key, pattern] of Object.entries(PII_PATTERNS)) {
    if (pattern.severity === 'HIGH') {
      redacted = redacted.replace(pattern.pattern, pattern.replacement);
    }
  }

  if (mode === 'full') {
    // Full redaction for logs - remove all PII
    redacted = redacted.replace(PII_PATTERNS.email.pattern, PII_PATTERNS.email.replacement);
    redacted = redacted.replace(PII_PATTERNS.phone.pattern, PII_PATTERNS.phone.replacement);
    redacted = redacted.replace(PII_PATTERNS.ipv4.pattern, PII_PATTERNS.ipv4.replacement);
    redacted = redacted.replace(PII_PATTERNS.dateOfBirth.pattern, PII_PATTERNS.dateOfBirth.replacement);
  } else {
    // Partial redaction for user-facing displays
    // Show last 4 digits of phone
    redacted = redacted.replace(PII_PATTERNS.phone.pattern, (match) => {
      const digits = match.replace(/\D/g, '');
      return `***-***-${digits.slice(-4)}`;
    });

    // Show partial email
    redacted = redacted.replace(PII_PATTERNS.email.pattern, (match) => {
      const [local, domain] = match.split('@');
      return `${local.slice(0, 2)}***@${domain}`;
    });

    // Mask middle octets of IP
    redacted = redacted.replace(PII_PATTERNS.ipv4.pattern, (match) => {
      const parts = match.split('.');
      return `${parts[0]}.***.***.${parts[3]}`;
    });
  }

  return redacted;
}

/**
 * Detect PII in text without redacting
 * Useful for validation and warnings
 */
export function detectPII(text: string): RedactionResult {
  const detectedPII: Array<{ type: string; count: number; severity: string }> = [];

  for (const [key, pattern] of Object.entries(PII_PATTERNS)) {
    const matches = text.match(pattern.pattern);
    if (matches && matches.length > 0) {
      detectedPII.push({
        type: pattern.name,
        count: matches.length,
        severity: pattern.severity
      });
    }
  }

  return {
    original: text,
    redacted: redactPII(text, 'full'),
    detectedPII,
    isClean: detectedPII.length === 0
  };
}

/**
 * Recursively sanitize object for logging
 * Redacts PII from strings and removes sensitive keys
 */
export function sanitizeForLogging(data: any, mode: 'full' | 'partial' = 'full'): any {
  // Null/undefined
  if (data === null || data === undefined) {
    return data;
  }

  // String - redact PII
  if (typeof data === 'string') {
    return redactPII(data, mode);
  }

  // Number/Boolean - safe
  if (typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }

  // Array - recursively sanitize each element
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForLogging(item, mode));
  }

  // Object - recursively sanitize values
  if (typeof data === 'object') {
    const sensitiveKeys = [
      'password',
      'ssn',
      'social_security',
      'creditCard',
      'credit_card',
      'apiKey',
      'api_key',
      'secret',
      'token',
      'authorization',
      'auth'
    ];

    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      // Skip sensitive keys entirely
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeForLogging(value, mode);
      }
    }
    return sanitized;
  }

  return data;
}

/**
 * Validate that text is safe to log (no PII)
 * Throws error if PII detected
 */
export function assertNoPII(text: string, context?: string): void {
  const result = detectPII(text);

  if (!result.isClean) {
    const piiTypes = result.detectedPII.map(p => p.type).join(', ');
    const errorMsg = context
      ? `PII detected in ${context}: ${piiTypes}`
      : `PII detected: ${piiTypes}`;

    throw new Error(errorMsg);
  }
}

/**
 * Safe logger that automatically redacts PII
 */
export class SafeLogger {
  private component: string;

  constructor(component: string) {
    this.component = component;
  }

  private formatMessage(level: string, message: string, context?: any): string {
    const sanitizedContext = context ? sanitizeForLogging(context) : {};

    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      component: this.component,
      message: redactPII(message, 'full'),
      context: sanitizedContext
    });
  }

  debug(message: string, context?: any): void {
    console.debug(this.formatMessage('DEBUG', message, context));
  }

  info(message: string, context?: any): void {
    console.info(this.formatMessage('INFO', message, context));
  }

  warn(message: string, context?: any): void {
    console.warn(this.formatMessage('WARN', message, context));
  }

  error(message: string, context?: any, error?: Error): void {
    const errorContext = {
      ...context,
      error: error ? {
        name: error.name,
        message: redactPII(error.message, 'full'),
        stack: redactPII(error.stack || '', 'full')
      } : undefined
    };

    console.error(this.formatMessage('ERROR', message, errorContext));
  }
}

/**
 * Test function to verify PII redaction
 */
export function testPIIRedaction(): void {
  const testCases = [
    {
      name: 'SSN',
      input: 'My SSN is 123-45-6789',
      expectRedacted: true
    },
    {
      name: 'Credit Card',
      input: 'Card: 4111-1111-1111-1111',
      expectRedacted: true
    },
    {
      name: 'Email',
      input: 'Contact me at john.doe@example.com',
      expectRedacted: true
    },
    {
      name: 'Phone',
      input: 'Call me at (555) 123-4567',
      expectRedacted: true
    },
    {
      name: 'Clean text',
      input: 'I am a software engineer with Python skills',
      expectRedacted: false
    }
  ];

  console.log('Running PII Redaction Tests...\n');

  for (const testCase of testCases) {
    const result = detectPII(testCase.input);
    const passed = result.isClean === !testCase.expectRedacted;

    console.log(`Test: ${testCase.name}`);
    console.log(`  Input: ${testCase.input}`);
    console.log(`  Redacted: ${result.redacted}`);
    console.log(`  PII Detected: ${JSON.stringify(result.detectedPII)}`);
    console.log(`  Status: ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
  }
}

/**
 * Export all functions
 */
export default {
  redactPII,
  detectPII,
  sanitizeForLogging,
  assertNoPII,
  SafeLogger,
  testPIIRedaction,
  PII_PATTERNS
};

/**
 * OpenAI Chat Service for ProfilePal
 * Handles conversation with memory and profile update capabilities
 */

import OpenAI from 'openai';
import { ChatMessage, ProfileUpdateAction } from '../types/agent.types';

export class OpenAIChatService {
  private openai: OpenAI;
  private model = 'gpt-4-turbo-preview';

  constructor(apiKey?: string) {
    // Use provided API key (should be passed from backend/secure storage)
    // WARNING: Frontend API calls expose keys - this should be moved to Supabase Edge Function
    const key = apiKey || '';

    if (!key) {
      throw new Error('OpenAI API key is required. This service should be called with a secure API key.');
    }

    this.openai = new OpenAI({
      apiKey: key,
      dangerouslyAllowBrowser: true, // Note: This is a security risk - move to backend!
    });
  }

  /**
   * System prompt that defines ProfilePal's behavior
   */
  private getSystemPrompt(currentProfile: any): string {
    return `You are ProfilePal, an enthusiastic and helpful AI assistant that helps job seekers build their professional profiles. Your role is to:

1. **Guide users smoothly**: Ask for information naturally, one piece at a time. Never ask users to provide everything at once.

2. **Be proactive**: If a user doesn't know where to start, take initiative and guide them through filling their profile step by step.

3. **Current profile state**:
${JSON.stringify(currentProfile, null, 2)}

4. **ONLY ask about these profile fields that exist in the database**:

   **Basic Information** (simple text fields):
   - name: First name
   - family_name: Last name
   - email: Email address
   - phone_number: Phone number
   - date_of_birth: Date of birth (format: YYYY-MM-DD)
   - country: Country
   - location: City and state/region
   - cv_url: CV file URL (auto-managed by file upload)

   **Social Links** (URLs):
   - github_url: GitHub profile URL
   - linkedin_url: LinkedIn profile URL
   - huggingface_url: HuggingFace profile URL

   **Preferences** (arrays of strings):
   - interests: Professional interests (e.g., ["Machine Learning", "Web Development"])
   - preferred_categories: Job categories (e.g., ["Software Development", "Data Science"])
   - preferred_job_types: Job types (e.g., ["Full-time", "Remote", "Contract"])

   **Education** (array of objects with these EXACT fields):
   - institution: School/university name (REQUIRED)
   - degree: Degree name (optional)
   - field_of_study: Major or field (optional)
   - start_year: Start year (YYYY format, optional)
   - end_year: End year (YYYY format, optional)
   - location: School location (optional)
   - gpa: GPA (optional)
   - description: Additional details (optional)

   **Work Experience** (array of objects with these EXACT fields):
   - title: Job title (REQUIRED - use "title" NOT "position")
   - company: Company name (REQUIRED)
   - start_year: Start year (YYYY format)
   - end_year: End year (YYYY format, can be empty string if is_present is true)
   - is_present: Boolean - true if currently working there
   - description: Job description (optional)
   - technologies: Technologies used (optional)

   **Certificates** (array of objects with these EXACT fields):
   - name: Certificate name (REQUIRED)
   - issuer: Issuing organization (REQUIRED)
   - date: Date issued (YYYY-MM or YYYY format)
   - credential_id: Credential ID (optional)
   - url: Certificate URL (optional)

   **Projects** (array of objects with these EXACT fields):
   - name: Project name (REQUIRED)
   - description: Project description (REQUIRED)
   - technologies: Technologies used (optional)
   - link: Project URL (use "link" NOT "url" or "github_url")
   - start_year: Start year (YYYY format, optional)
   - end_year: End year (YYYY format, optional)

   **Papers** (array of objects with these EXACT fields):
   - title: Paper title (REQUIRED)
   - publication: Publication venue (optional)
   - date: Publication date (YYYY-MM or YYYY format, optional)
   - link: Paper URL (use "link" NOT "url")
   - description: Abstract or summary (optional)

5. **IMPORTANT - Only ask about fields that EXIST in the list above**:
   - DO NOT ask about skills, languages, or any other fields not listed
   - DO NOT make up new field names
   - Only work with the exact fields specified above

6. **Conversation flow guidelines**:
   - Start by understanding what they want to update or add
   - Ask follow-up questions to get complete information
   - Be conversational and friendly
   - Confirm updates after making changes
   - Suggest next steps after each update

7. **When extracting information**:
   - Parse user responses to identify profile updates
   - Extract structured data from natural conversation
   - Ask for clarification if information is ambiguous
   - Validate data before confirming updates

8. **Profile completion strategy**:
   - Check what's missing in the current profile
   - Prioritize important fields (work experience, education, interests)
   - Guide users through completion in a logical order
   - Celebrate progress and encourage completion

9. **Response format**:
   Your responses should be friendly and conversational. When you identify profile updates from the conversation, structure your internal understanding but respond naturally to the user.

Remember: Be helpful, encouraging, and make the profile-building process feel easy and natural! ONLY work with the fields that exist in the database schema above.`;
  }

  /**
   * Generate chat response with conversation history
   */
  async generateResponse(
    userMessage: string,
    conversationHistory: ChatMessage[],
    currentProfile: any
  ): Promise<{
    message: string;
    profileUpdates?: ProfileUpdateAction[];
    suggestions?: string[];
  }> {
    try {
      // Build messages array with system prompt and history
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: this.getSystemPrompt(currentProfile),
        },
      ];

      // Add conversation history (exclude system messages from history)
      conversationHistory
        .filter(msg => msg.role !== 'system')
        .forEach(msg => {
          messages.push({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          });
        });

      // Add current user message
      messages.push({
        role: 'user',
        content: userMessage,
      });

      // Call OpenAI API
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      });

      const assistantMessage = completion.choices[0].message.content ||
        "I'm here to help! Could you tell me what you'd like to update in your profile?";

      // Extract profile updates from the conversation
      const profileUpdates = await this.extractProfileUpdates(
        userMessage,
        assistantMessage,
        currentProfile
      );

      // Generate suggestions for next steps
      const suggestions = this.generateSuggestions(currentProfile);

      return {
        message: assistantMessage,
        profileUpdates,
        suggestions,
      };
    } catch (error: any) {
      console.error('OpenAI API error:', error);
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }

  /**
   * Extract profile updates from conversation
   */
  private async extractProfileUpdates(
    userMessage: string,
    assistantMessage: string,
    currentProfile: any
  ): Promise<ProfileUpdateAction[]> {
    try {
      const extractionPrompt = `Analyze this conversation and extract any profile updates mentioned by the user.

User message: "${userMessage}"
Assistant response: "${assistantMessage}"

Current profile: ${JSON.stringify(currentProfile, null, 2)}

Extract structured profile updates in JSON format. Return ONLY updates that the user explicitly mentioned.

**IMPORTANT - Field Mapping**:
Use ONLY these exact field names from the database schema:

Simple fields: name, family_name, email, phone_number, date_of_birth, country, location, github_url, linkedin_url, huggingface_url

Array fields (use "add_to_array" action):
- interests: array of strings
- preferred_categories: array of strings
- preferred_job_types: array of strings
- education: array of objects with {institution, degree, field_of_study, start_year, end_year, location, gpa, description}
- work_experience: array of objects with {title, company, start_year, end_year, is_present, description, technologies}
- certificates: array of objects with {name, issuer, date, credential_id, url}
- projects: array of objects with {name, description, technologies, link, start_year, end_year}
- papers: array of objects with {title, publication, date, link, description}

**CRITICAL**: Use these EXACT field names. Common mistakes to avoid:
- work_experience uses "title" NOT "position"
- work_experience uses "start_year" and "end_year" NOT "start_date" and "end_date"
- work_experience has "is_present" boolean field
- projects and papers use "link" NOT "url"
- certificates use "date" NOT "issue_date"

Format: { "updates": [{ "field": "field_name", "value": <value>, "action": "update_field" | "add_to_array" }] }

Examples:
- "My name is John Doe" -> { "updates": [{"field": "name", "value": "John", "action": "update_field"}, {"field": "family_name", "value": "Doe", "action": "update_field"}] }
- "I worked at Google as a Software Engineer from 2020 to 2023" -> { "updates": [{"field": "work_experience", "value": {"title": "Software Engineer", "company": "Google", "start_year": "2020", "end_year": "2023", "is_present": false}, "action": "add_to_array"}] }
- "I currently work at Microsoft as a Data Scientist since 2022" -> { "updates": [{"field": "work_experience", "value": {"title": "Data Scientist", "company": "Microsoft", "start_year": "2022", "end_year": "", "is_present": true}, "action": "add_to_array"}] }
- "My email is john@example.com" -> { "updates": [{"field": "email", "value": "john@example.com", "action": "update_field"}] }
- "I'm interested in Machine Learning and AI" -> { "updates": [{"field": "interests", "value": ["Machine Learning", "AI"], "action": "update_field"}] }
- "I have a BS in Computer Science from MIT" -> { "updates": [{"field": "education", "value": {"institution": "MIT", "degree": "BS Computer Science", "field_of_study": "Computer Science"}, "action": "add_to_array"}] }
- "I completed the AWS certification" -> { "updates": [{"field": "certificates", "value": {"name": "AWS Certification", "issuer": "Amazon"}, "action": "add_to_array"}] }

Return empty array if no updates found: { "updates": [] }`;

      const extraction = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a data extraction assistant. Extract profile information from conversations and return valid JSON only. Use ONLY the field names provided in the schema.',
          },
          {
            role: 'user',
            content: extractionPrompt,
          },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      const extractedData = JSON.parse(
        extraction.choices[0].message.content || '{"updates": []}'
      );

      return extractedData.updates || [];
    } catch (error) {
      console.error('Error extracting profile updates:', error);
      return [];
    }
  }

  /**
   * Generate contextual suggestions based on profile completeness
   */
  private generateSuggestions(currentProfile: any): string[] {
    const suggestions: string[] = [];

    if (!currentProfile.work_experience || currentProfile.work_experience.length === 0) {
      suggestions.push("Add your work experience");
    }

    if (!currentProfile.education || currentProfile.education.length === 0) {
      suggestions.push("Tell me about your education");
    }

    if (!currentProfile.github_url && !currentProfile.linkedin_url) {
      suggestions.push("Add your LinkedIn or GitHub profile");
    }

    if (!currentProfile.interests || currentProfile.interests.length === 0) {
      suggestions.push("Share your professional interests");
    }

    if (!currentProfile.preferred_categories || currentProfile.preferred_categories.length === 0) {
      suggestions.push("Set your preferred job categories");
    }

    if (!currentProfile.location) {
      suggestions.push("Add your location");
    }

    // Limit to 3 suggestions
    return suggestions.slice(0, 3);
  }

  /**
   * Generate initial greeting message for new sessions
   */
  async generateGreeting(currentProfile: any): Promise<string> {
    const completionPercentage = this.calculateProfileCompletion(currentProfile);

    if (completionPercentage < 30) {
      return `👋 Hi ${currentProfile.name || 'there'}! I'm ProfilePal, your AI assistant for building an amazing profile! I can see your profile is just getting started. Would you like me to guide you through completing it step by step, or is there something specific you'd like to add?`;
    } else if (completionPercentage < 70) {
      return `👋 Welcome back, ${currentProfile.name}! Your profile is ${completionPercentage}% complete - great progress! What would you like to work on today? I can help you add more details or update existing information.`;
    } else {
      return `👋 Hi ${currentProfile.name}! Your profile looks fantastic - ${completionPercentage}% complete! I'm here if you'd like to make any updates or add more details. What would you like to work on?`;
    }
  }

  /**
   * Calculate profile completion percentage
   */
  private calculateProfileCompletion(profile: any): number {
    const fields = [
      'name',
      'family_name',
      'email',
      'phone_number',
      'location',
      'work_experience',
      'education',
      'github_url',
      'linkedin_url',
      'interests',
      'preferred_categories',
    ];

    let completed = 0;
    fields.forEach(field => {
      const value = profile[field];
      if (value) {
        if (Array.isArray(value) && value.length > 0) completed++;
        else if (typeof value === 'string' && value.trim()) completed++;
      }
    });

    return Math.round((completed / fields.length) * 100);
  }
}

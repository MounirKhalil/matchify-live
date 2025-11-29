/**
 * CV Autofill Service
 * Parses CV text and extracts structured profile data using OpenAI
 */

import OpenAI from 'openai';
import { ExtractedProfileData } from '../types/agent.types';

export class CVAutofillService {
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
   * Parse CV text and extract structured profile data
   */
  async parseCV(cvText: string): Promise<ExtractedProfileData> {
    try {
      const systemPrompt = `You are an expert CV/Resume parser. Extract structured information from the provided CV text.

**CRITICAL - Use ONLY these EXACT field names from the database schema:**

**Personal Information (text fields):**
- name: First name only
- family_name: Last name only
- email: Email address
- phone_number: Phone number
- location: City, state/region
- country: Country name

**Social Links (URLs):**
 - link: GitHub profile URL
- linkedin_url: LinkedIn profile URL
- huggingface_url: HuggingFace profile URL

**Preferences (arrays of strings):**
- interests: Professional interests or skills (e.g., ["Machine Learning", "Python"])
- preferred_categories: Inferred job categories (e.g., ["Software Development", "Data Science"])
- preferred_job_types: Inferred from work history (e.g., ["Full-time", "Remote"])

**Education (array of objects - each with these EXACT fields):**
- institution: School/university name
- degree: Degree name (e.g., "BS Computer Science")
- field_of_study: Major or field
- start_year: Start date (YYYY or YYYY-MM format)
- end_year: End date (YYYY or YYYY-MM format)
- location: School location
- gpa: GPA if mentioned
- description: Additional details

**Work Experience (array of objects - each with these EXACT fields):**
- company: Company name
- title: Job title
- start_year: Start date (YYYY or YYYY-MM format)
- end_year: End date (YYYY or YYYY-MM format, or "Present")
- location: Work location
- description: Job responsibilities and achievements
- technologies: Technologies used (as array or comma-separated string)

**Certificates (array of objects - each with these EXACT fields):**
- name: Certificate name
- issuer: Issuing organization
- date: Date issued (YYYY or YYYY-MM)
- expiry_date: Expiration date (if mentioned)
- credential_id: Credential ID (if mentioned)
- url: Certificate URL (if mentioned)

**Projects (array of objects - each with these EXACT fields):**
- name: Project name
- description: Project description
- technologies: Technologies used
- url: Project URL (if mentioned)
 - link: GitHub repository URL (if mentioned)
- start_year: Start date (if mentioned)
- end_year: End date (if mentioned)

**Papers (array of objects - each with these EXACT fields):**
- title: Paper title
- authors: Authors list
- publication: Publication venue
- date: Publication date (YYYY or YYYY-MM)
- url: Paper URL (if available)
- doi: DOI identifier (if available)
- description: Abstract or summary

**Guidelines:**
1. Extract only information that is explicitly stated or clearly implied
2. Use consistent date formats (YYYY-MM or YYYY)
3. Separate first name and last name properly into name and family_name
4. Extract URLs and links when mentioned
5. Infer preferred_categories from work experience (common categories: Software Development, Data Science, DevOps, Product Management, Design, Marketing, Sales, etc.)
6. Return null/undefined for fields not found in the CV
7. For arrays, return empty array if no items found
8. DO NOT create fields not listed above (like "skills" or "languages")
9. Use "interests" field for skills/competencies

Return the data as a valid JSON object with ONLY the field names specified above.`;

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `Parse this CV and extract structured data:\n\n${cvText}`,
          },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      const extractedData = JSON.parse(
        completion.choices[0].message.content || '{}'
      );

      // Validate and clean the extracted data
      return this.validateAndCleanData(extractedData);
    } catch (error: any) {
      console.error('CV parsing error:', error);
      throw new Error(`Failed to parse CV: ${error.message}`);
    }
  }

  /**
   * Validate and clean extracted data
   */
  private validateAndCleanData(data: any): ExtractedProfileData {
    const cleaned: ExtractedProfileData = {};

    // Personal information
    if (data.name && typeof data.name === 'string') {
      cleaned.name = data.name.trim();
    }
    if (data.family_name && typeof data.family_name === 'string') {
      cleaned.family_name = data.family_name.trim();
    }
    if (data.email && this.isValidEmail(data.email)) {
      cleaned.email = data.email.trim().toLowerCase();
    }
    if (data.phone_number && typeof data.phone_number === 'string') {
      cleaned.phone_number = data.phone_number.trim();
    }
    if (data.location && typeof data.location === 'string') {
      cleaned.location = data.location.trim();
    }
    if (data.country && typeof data.country === 'string') {
      cleaned.country = data.country.trim();
    }

    // Social links
    if (data.github_url && this.isValidURL(data.github_url)) {
      cleaned.github_url = data.github_url.trim();
    }
    if (data.linkedin_url && this.isValidURL(data.linkedin_url)) {
      cleaned.linkedin_url = data.linkedin_url.trim();
    }
    if (data.huggingface_url && this.isValidURL(data.huggingface_url)) {
      cleaned.huggingface_url = data.huggingface_url.trim();
    }

    // Arrays of strings
    if (Array.isArray(data.interests) && data.interests.length > 0) {
      cleaned.interests = data.interests
        .filter((interest: any) => typeof interest === 'string')
        .map((interest: string) => interest.trim());
    }
    if (Array.isArray(data.preferred_categories) && data.preferred_categories.length > 0) {
      cleaned.preferred_categories = data.preferred_categories
        .filter((cat: any) => typeof cat === 'string')
        .map((cat: string) => cat.trim());
    }
    if (Array.isArray(data.preferred_job_types) && data.preferred_job_types.length > 0) {
      cleaned.preferred_job_types = data.preferred_job_types
        .filter((type: any) => typeof type === 'string')
        .map((type: string) => type.trim());
    }

    // Complex arrays (JSONB)
    if (Array.isArray(data.education) && data.education.length > 0) {
      cleaned.education = data.education.filter((edu: any) =>
        edu.institution && edu.degree
      );
    }
    if (Array.isArray(data.work_experience) && data.work_experience.length > 0) {
      cleaned.work_experience = data.work_experience.filter((work: any) =>
        work.company && work.title
      );
    }
    if (Array.isArray(data.certificates) && data.certificates.length > 0) {
      cleaned.certificates = data.certificates.filter((cert: any) =>
        cert.name && cert.issuer
      );
    }
    if (Array.isArray(data.projects) && data.projects.length > 0) {
      cleaned.projects = data.projects.filter((proj: any) =>
        proj.name && proj.description
      );
    }
    if (Array.isArray(data.papers) && data.papers.length > 0) {
      cleaned.papers = data.papers.filter((paper: any) =>
        paper.title
      );
    }

    return cleaned;
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate URL format
   */
  private isValidURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate summary of extracted data
   */
  generateSummary(data: ExtractedProfileData): string {
    const parts: string[] = [];

    if (data.name || data.family_name) {
      parts.push(`Name: ${[data.name, data.family_name].filter(Boolean).join(' ')}`);
    }
    if (data.email) {
      parts.push(`Email: ${data.email}`);
    }
    if (data.work_experience && data.work_experience.length > 0) {
      parts.push(`${data.work_experience.length} work experience entries`);
    }
    if (data.education && data.education.length > 0) {
      parts.push(`${data.education.length} education entries`);
    }
    if (data.certificates && data.certificates.length > 0) {
      parts.push(`${data.certificates.length} certificates`);
    }
    if (data.projects && data.projects.length > 0) {
      parts.push(`${data.projects.length} projects`);
    }

    return parts.length > 0
      ? `Extracted: ${parts.join(', ')}`
      : 'No information could be extracted from the CV';
  }
}

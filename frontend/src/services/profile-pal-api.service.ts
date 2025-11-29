/**
 * ProfilePal API Service
 * Frontend service to interact with Supabase Edge Functions
 */

import { supabase } from '@/integrations/supabase/client';

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  file?: {
    name: string;
    size: string;
  };
}

export interface ChatResponse {
  message: string;
  session_id: string;
  suggestions?: string[];
  profile_updated?: boolean;
  updated_fields?: string[];
}

export interface CVAutofillResponse {
  success: boolean;
  message: string;
  extracted_data?: any;
  updated_fields?: string[];
  error?: string;
}

export interface JobApplicationResponse {
  success: boolean;
  message: string;
  application?: {
    id: string;
    education_score: number;
    experience_score: number;
    skills_score: number;
    final_score: number;
    hiring_status: string;
  };
  error?: string;
}

export class ProfilePalAPIService {
  private static SUPABASE_URL = 'https://mwqjyukczekhnimillfn.supabase.co';
  private static CHAT_FUNCTION_URL = `${this.SUPABASE_URL}/functions/v1/chat`;
  private static CV_AUTOFILL_FUNCTION_URL = `${this.SUPABASE_URL}/functions/v1/cv-autofill`;
  private static APPLY_JOB_FUNCTION_URL = `${this.SUPABASE_URL}/functions/v1/apply-job`;

  /**
   * Send a chat message to ProfilePal
   */
  static async sendMessage(
    message: string,
    sessionId?: string
  ): Promise<ChatResponse> {
    try {
      // Get auth token
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(this.CHAT_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message,
          session_id: sessionId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send message');
      }

      return await response.json();
    } catch (error: any) {
      console.error('Chat API error:', error);
      throw new Error(error.message || 'Failed to communicate with ProfilePal');
    }
  }

  /**
   * Process CV autofill
   */
  static async processCVAutofill(cvUrl: string): Promise<CVAutofillResponse> {
    try {
      // Get auth token
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(this.CV_AUTOFILL_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          cv_url: cvUrl,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process CV');
      }

      return await response.json();
    } catch (error: any) {
      console.error('CV autofill API error:', error);
      throw new Error(error.message || 'Failed to process CV autofill');
    }
  }

  /**
   * Get chat history for a session
   */
  static async getChatHistory(sessionId: string): Promise<ChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      return (
        data?.map((msg) => {
          const metadata = msg.metadata as Record<string, any> | null;
          return {
            id: msg.id,
            type: msg.role as 'user' | 'assistant',
            content: msg.content,
            file: metadata?.file ? {
              name: metadata.file.name,
              size: metadata.file.size,
            } : undefined,
          };
        }) || []
      );
    } catch (error: any) {
      console.error('Error fetching chat history:', error);
      return [];
    }
  }

  /**
   * Delete chat history for a session (reset conversation)
   */
  static async deleteChatHistory(sessionId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('chat_history')
        .delete()
        .eq('session_id', sessionId);

      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error('Error deleting chat history:', error);
      throw new Error('Failed to reset conversation');
    }
  }

  /**
   * Save a message to chat history
   */
  static async saveMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      const { error } = await supabase
        .from('chat_history')
        .insert({
          user_id: user.id,
          session_id: sessionId,
          role,
          content,
          metadata: metadata || null,
        });

      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error('Error saving message:', error);
      throw new Error('Failed to save message to history');
    }
  }

  /**
   * Get all session IDs for current user
   */
  static async getUserSessions(): Promise<string[]> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return [];
      }

      const { data, error } = await supabase
        .from('chat_history')
        .select('session_id')
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      // Get unique session IDs
      const sessionIds = [...new Set(data?.map((row) => row.session_id) || [])];
      return sessionIds;
    } catch (error: any) {
      console.error('Error fetching user sessions:', error);
      return [];
    }
  }

  /**
   * Apply to a job posting
   */
  static async applyToJob(jobPostingId: string): Promise<JobApplicationResponse> {
    try {
      // Get auth token
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(this.APPLY_JOB_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          job_posting_id: jobPostingId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to apply to job');
      }

      return await response.json();
    } catch (error: any) {
      console.error('Job application API error:', error);
      throw new Error(error.message || 'Failed to apply to job');
    }
  }
}

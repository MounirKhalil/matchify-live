export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          auto_applied: boolean | null
          candidate_id: string
          created_at: string
          education_score: number | null
          experience_score: number | null
          final_score: number | null
          hiring_status: Database["public"]["Enums"]["hiring_status"]
          id: string
          job_posting_id: string
          match_reasons: string[] | null
          match_score: number | null
          skills_score: number | null
          updated_at: string
        }
        Insert: {
          auto_applied?: boolean | null
          candidate_id: string
          created_at?: string
          education_score?: number | null
          experience_score?: number | null
          final_score?: number | null
          hiring_status?: Database["public"]["Enums"]["hiring_status"]
          id?: string
          job_posting_id: string
          match_reasons?: string[] | null
          match_score?: number | null
          skills_score?: number | null
          updated_at?: string
        }
        Update: {
          auto_applied?: boolean | null
          candidate_id?: string
          created_at?: string
          education_score?: number | null
          experience_score?: number | null
          final_score?: number | null
          hiring_status?: Database["public"]["Enums"]["hiring_status"]
          id?: string
          job_posting_id?: string
          match_reasons?: string[] | null
          match_score?: number | null
          skills_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_application_runs: {
        Row: {
          completed_at: string | null
          error_message: string | null
          id: string
          run_timestamp: string
          started_at: string | null
          status: string
          total_applications_skipped: number | null
          total_applications_submitted: number | null
          total_candidates_evaluated: number | null
          total_matches_found: number | null
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          run_timestamp?: string
          started_at?: string | null
          status?: string
          total_applications_skipped?: number | null
          total_applications_submitted?: number | null
          total_candidates_evaluated?: number | null
          total_matches_found?: number | null
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          run_timestamp?: string
          started_at?: string | null
          status?: string
          total_applications_skipped?: number | null
          total_applications_submitted?: number | null
          total_candidates_evaluated?: number | null
          total_matches_found?: number | null
        }
        Relationships: []
      }
      candidate_embeddings: {
        Row: {
          candidate_id: string
          created_at: string | null
          embeddings: string
          id: string
          metadata: Json
          updated_at: string | null
        }
        Insert: {
          candidate_id: string
          created_at?: string | null
          embeddings: string
          id?: string
          metadata: Json
          updated_at?: string | null
        }
        Update: {
          candidate_id?: string
          created_at?: string | null
          embeddings?: string
          id?: string
          metadata?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_embeddings_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: true
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_job_evaluations: {
        Row: {
          candidate_id: string
          created_at: string
          embedding_similarity: number | null
          evaluated_at: string
          id: string
          job_posting_id: string
          match_found: boolean | null
          match_score: number | null
        }
        Insert: {
          candidate_id: string
          created_at?: string
          embedding_similarity?: number | null
          evaluated_at?: string
          id?: string
          job_posting_id: string
          match_found?: boolean | null
          match_score?: number | null
        }
        Update: {
          candidate_id?: string
          created_at?: string
          embedding_similarity?: number | null
          evaluated_at?: string
          id?: string
          job_posting_id?: string
          match_found?: boolean | null
          match_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_job_evaluations_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_job_evaluations_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_job_matches: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          job_posting_id: string
          match_reasons: string[] | null
          match_score: number
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          job_posting_id: string
          match_reasons?: string[] | null
          match_score: number
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          job_posting_id?: string
          match_reasons?: string[] | null
          match_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "candidate_job_matches_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_job_matches_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_preferences: {
        Row: {
          auto_apply_enabled: boolean
          candidate_id: string
          created_at: string
          excluded_companies: string[] | null
          id: string
          max_applications_per_day: number
          min_match_threshold: number
          preferred_job_titles: string[] | null
          updated_at: string
        }
        Insert: {
          auto_apply_enabled?: boolean
          candidate_id: string
          created_at?: string
          excluded_companies?: string[] | null
          id?: string
          max_applications_per_day?: number
          min_match_threshold?: number
          preferred_job_titles?: string[] | null
          updated_at?: string
        }
        Update: {
          auto_apply_enabled?: boolean
          candidate_id?: string
          created_at?: string
          excluded_companies?: string[] | null
          id?: string
          max_applications_per_day?: number
          min_match_threshold?: number
          preferred_job_titles?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_preferences_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: true
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_profile_updates: {
        Row: {
          candidate_id: string
          fields_updated: string[] | null
          id: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          fields_updated?: string[] | null
          id?: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          fields_updated?: string[] | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_profile_updates_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_profiles: {
        Row: {
          applications_sent: number | null
          autofill_from_cv: boolean | null
          automatic: boolean | null
          bookmarked_by: string[] | null
          certificates: Json | null
          country: string | null
          created_at: string | null
          cv_url: string | null
          date_of_birth: string | null
          education: Json | null
          email: string
          embedding_last_updated: string | null
          family_name: string
          github_url: string | null
          huggingface_url: string | null
          id: string
          interests: string[] | null
          linkedin_url: string | null
          location: string | null
          name: string
          other_sections: Json | null
          papers: Json | null
          phone_number: string | null
          preferred_categories: string[] | null
          preferred_job_types: string[] | null
          profile_image_url: string | null
          projects: Json | null
          refine: boolean | null
          updated_at: string | null
          user_id: string
          work_experience: Json | null
        }
        Insert: {
          applications_sent?: number | null
          autofill_from_cv?: boolean | null
          automatic?: boolean | null
          bookmarked_by?: string[] | null
          certificates?: Json | null
          country?: string | null
          created_at?: string | null
          cv_url?: string | null
          date_of_birth?: string | null
          education?: Json | null
          email: string
          embedding_last_updated?: string | null
          family_name: string
          github_url?: string | null
          huggingface_url?: string | null
          id?: string
          interests?: string[] | null
          linkedin_url?: string | null
          location?: string | null
          name: string
          other_sections?: Json | null
          papers?: Json | null
          phone_number?: string | null
          preferred_categories?: string[] | null
          preferred_job_types?: string[] | null
          profile_image_url?: string | null
          projects?: Json | null
          refine?: boolean | null
          updated_at?: string | null
          user_id: string
          work_experience?: Json | null
        }
        Update: {
          applications_sent?: number | null
          autofill_from_cv?: boolean | null
          automatic?: boolean | null
          bookmarked_by?: string[] | null
          certificates?: Json | null
          country?: string | null
          created_at?: string | null
          cv_url?: string | null
          date_of_birth?: string | null
          education?: Json | null
          email?: string
          embedding_last_updated?: string | null
          family_name?: string
          github_url?: string | null
          huggingface_url?: string | null
          id?: string
          interests?: string[] | null
          linkedin_url?: string | null
          location?: string | null
          name?: string
          other_sections?: Json | null
          papers?: Json | null
          phone_number?: string | null
          preferred_categories?: string[] | null
          preferred_job_types?: string[] | null
          profile_image_url?: string | null
          projects?: Json | null
          refine?: boolean | null
          updated_at?: string | null
          user_id?: string
          work_experience?: Json | null
        }
        Relationships: []
      }
      chat_history: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
          session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      chatbot_conversations: {
        Row: {
          conversation_history: Json | null
          created_at: string | null
          id: string
          recruiter_id: string
          updated_at: string | null
        }
        Insert: {
          conversation_history?: Json | null
          created_at?: string | null
          id?: string
          recruiter_id: string
          updated_at?: string | null
        }
        Update: {
          conversation_history?: Json | null
          created_at?: string | null
          id?: string
          recruiter_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_conversations_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "recruiter_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      embedding_generation_queue: {
        Row: {
          attempts: number | null
          created_at: string | null
          entity_id: string
          entity_type: string
          error_message: string | null
          id: string
          processed_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          entity_id: string
          entity_type: string
          error_message?: string | null
          id?: string
          processed_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          error_message?: string | null
          id?: string
          processed_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      external_candidates: {
        Row: {
          bio: string | null
          certifications: string[] | null
          country: string | null
          current_company: string | null
          current_position: string | null
          education: Json | null
          email: string | null
          fingerprint: string | null
          found_by_search_id: string | null
          full_name: string
          github_url: string | null
          headline: string | null
          id: string
          languages: string[] | null
          last_updated: string | null
          linkedin_url: string | null
          location: string | null
          match_score: number | null
          phone_number: string | null
          portfolio_url: string | null
          profile_image_url: string | null
          scrape_quality_score: number | null
          scraped_at: string | null
          skills: string[] | null
          source: string
          source_id: string | null
          source_url: string
          twitter_url: string | null
          website_url: string | null
          work_experience: Json | null
          years_of_experience: number | null
        }
        Insert: {
          bio?: string | null
          certifications?: string[] | null
          country?: string | null
          current_company?: string | null
          current_position?: string | null
          education?: Json | null
          email?: string | null
          fingerprint?: string | null
          found_by_search_id?: string | null
          full_name: string
          github_url?: string | null
          headline?: string | null
          id?: string
          languages?: string[] | null
          last_updated?: string | null
          linkedin_url?: string | null
          location?: string | null
          match_score?: number | null
          phone_number?: string | null
          portfolio_url?: string | null
          profile_image_url?: string | null
          scrape_quality_score?: number | null
          scraped_at?: string | null
          skills?: string[] | null
          source: string
          source_id?: string | null
          source_url: string
          twitter_url?: string | null
          website_url?: string | null
          work_experience?: Json | null
          years_of_experience?: number | null
        }
        Update: {
          bio?: string | null
          certifications?: string[] | null
          country?: string | null
          current_company?: string | null
          current_position?: string | null
          education?: Json | null
          email?: string | null
          fingerprint?: string | null
          found_by_search_id?: string | null
          full_name?: string
          github_url?: string | null
          headline?: string | null
          id?: string
          languages?: string[] | null
          last_updated?: string | null
          linkedin_url?: string | null
          location?: string | null
          match_score?: number | null
          phone_number?: string | null
          portfolio_url?: string | null
          profile_image_url?: string | null
          scrape_quality_score?: number | null
          scraped_at?: string | null
          skills?: string[] | null
          source?: string
          source_id?: string | null
          source_url?: string
          twitter_url?: string | null
          website_url?: string | null
          work_experience?: Json | null
          years_of_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "external_candidates_found_by_search_id_fkey"
            columns: ["found_by_search_id"]
            isOneToOne: false
            referencedRelation: "headhunt_searches"
            referencedColumns: ["id"]
          },
        ]
      }
      headhunt_searches: {
        Row: {
          categories: string[] | null
          company_size_preference: string | null
          completed_at: string | null
          created_at: string | null
          detailed_requirements: string | null
          error_message: string | null
          exclude_keywords: string[] | null
          id: string
          industry_preferences: string[] | null
          job_title: string
          keywords: string[] | null
          max_results: number | null
          max_years_experience: number | null
          min_match_score: number | null
          min_years_experience: number | null
          preferred_education_fields: string[] | null
          preferred_skills: string[] | null
          recruiter_id: string
          required_certifications: string[] | null
          required_education_level: string | null
          required_skills: string[] | null
          results: Json | null
          search_completed: boolean | null
          search_github: boolean | null
          search_google: boolean | null
          search_linkedin: boolean | null
          search_name: string
          search_stackoverflow: boolean | null
          search_status: string | null
          search_twitter: boolean | null
          started_at: string | null
          target_countries: string[] | null
          target_locations: string[] | null
          total_found: number | null
          updated_at: string | null
        }
        Insert: {
          categories?: string[] | null
          company_size_preference?: string | null
          completed_at?: string | null
          created_at?: string | null
          detailed_requirements?: string | null
          error_message?: string | null
          exclude_keywords?: string[] | null
          id?: string
          industry_preferences?: string[] | null
          job_title: string
          keywords?: string[] | null
          max_results?: number | null
          max_years_experience?: number | null
          min_match_score?: number | null
          min_years_experience?: number | null
          preferred_education_fields?: string[] | null
          preferred_skills?: string[] | null
          recruiter_id: string
          required_certifications?: string[] | null
          required_education_level?: string | null
          required_skills?: string[] | null
          results?: Json | null
          search_completed?: boolean | null
          search_github?: boolean | null
          search_google?: boolean | null
          search_linkedin?: boolean | null
          search_name: string
          search_stackoverflow?: boolean | null
          search_status?: string | null
          search_twitter?: boolean | null
          started_at?: string | null
          target_countries?: string[] | null
          target_locations?: string[] | null
          total_found?: number | null
          updated_at?: string | null
        }
        Update: {
          categories?: string[] | null
          company_size_preference?: string | null
          completed_at?: string | null
          created_at?: string | null
          detailed_requirements?: string | null
          error_message?: string | null
          exclude_keywords?: string[] | null
          id?: string
          industry_preferences?: string[] | null
          job_title?: string
          keywords?: string[] | null
          max_results?: number | null
          max_years_experience?: number | null
          min_match_score?: number | null
          min_years_experience?: number | null
          preferred_education_fields?: string[] | null
          preferred_skills?: string[] | null
          recruiter_id?: string
          required_certifications?: string[] | null
          required_education_level?: string | null
          required_skills?: string[] | null
          results?: Json | null
          search_completed?: boolean | null
          search_github?: boolean | null
          search_google?: boolean | null
          search_linkedin?: boolean | null
          search_name?: string
          search_stackoverflow?: boolean | null
          search_status?: string | null
          search_twitter?: boolean | null
          started_at?: string | null
          target_countries?: string[] | null
          target_locations?: string[] | null
          total_found?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "headhunt_searches_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "recruiter_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_posting_embeddings: {
        Row: {
          created_at: string
          embeddings: string
          id: string
          job_posting_id: string
          metadata: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          embeddings: string
          id?: string
          job_posting_id: string
          metadata?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          embeddings?: string
          id?: string
          job_posting_id?: string
          metadata?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_posting_embeddings_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: true
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
        ]
      }
      job_postings: {
        Row: {
          categories: string[] | null
          created_at: string
          description_url: string | null
          id: string
          job_title: string
          public_information: string | null
          public_job_description_file: boolean | null
          recruiter_id: string
          requirements: Json
          status: Database["public"]["Enums"]["job_status"]
          updated_at: string
        }
        Insert: {
          categories?: string[] | null
          created_at?: string
          description_url?: string | null
          id?: string
          job_title: string
          public_information?: string | null
          public_job_description_file?: boolean | null
          recruiter_id: string
          requirements?: Json
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
        }
        Update: {
          categories?: string[] | null
          created_at?: string
          description_url?: string | null
          id?: string
          job_title?: string
          public_information?: string | null
          public_job_description_file?: boolean | null
          recruiter_id?: string
          requirements?: Json
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_recruiter"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "recruiter_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recruiter_api_settings: {
        Row: {
          anthropic_api_key: string | null
          apify_api_key: string | null
          created_at: string | null
          default_min_match_score: number | null
          email_provider: string | null
          github_token: string | null
          hunter_api_key: string | null
          id: string
          linkedin_provider: string | null
          max_results: number | null
          min_results: number | null
          phantombuster_api_key: string | null
          proxycurl_api_key: string | null
          rapidapi_key: string | null
          recruiter_id: string
          rocketreach_api_key: string | null
          scrapingbee_api_key: string | null
          serpapi_key: string | null
          stackoverflow_api_key: string | null
          updated_at: string | null
          use_github: boolean | null
          use_google: boolean | null
          use_linkedin: boolean | null
          use_stackoverflow: boolean | null
          use_twitter: boolean | null
        }
        Insert: {
          anthropic_api_key?: string | null
          apify_api_key?: string | null
          created_at?: string | null
          default_min_match_score?: number | null
          email_provider?: string | null
          github_token?: string | null
          hunter_api_key?: string | null
          id?: string
          linkedin_provider?: string | null
          max_results?: number | null
          min_results?: number | null
          phantombuster_api_key?: string | null
          proxycurl_api_key?: string | null
          rapidapi_key?: string | null
          recruiter_id: string
          rocketreach_api_key?: string | null
          scrapingbee_api_key?: string | null
          serpapi_key?: string | null
          stackoverflow_api_key?: string | null
          updated_at?: string | null
          use_github?: boolean | null
          use_google?: boolean | null
          use_linkedin?: boolean | null
          use_stackoverflow?: boolean | null
          use_twitter?: boolean | null
        }
        Update: {
          anthropic_api_key?: string | null
          apify_api_key?: string | null
          created_at?: string | null
          default_min_match_score?: number | null
          email_provider?: string | null
          github_token?: string | null
          hunter_api_key?: string | null
          id?: string
          linkedin_provider?: string | null
          max_results?: number | null
          min_results?: number | null
          phantombuster_api_key?: string | null
          proxycurl_api_key?: string | null
          rapidapi_key?: string | null
          recruiter_id?: string
          rocketreach_api_key?: string | null
          scrapingbee_api_key?: string | null
          serpapi_key?: string | null
          stackoverflow_api_key?: string | null
          updated_at?: string | null
          use_github?: boolean | null
          use_google?: boolean | null
          use_linkedin?: boolean | null
          use_stackoverflow?: boolean | null
          use_twitter?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "recruiter_api_settings_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: true
            referencedRelation: "recruiter_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recruiter_profiles: {
        Row: {
          created_at: string | null
          email: string
          family_name: string
          id: string
          name: string
          organization_name: string
          phone_number: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          family_name: string
          id?: string
          name: string
          organization_name: string
          phone_number?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          family_name?: string
          id?: string
          name?: string
          organization_name?: string
          phone_number?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      scraping_jobs: {
        Row: {
          candidates_found: number | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          search_id: string
          source: string
          started_at: string | null
          status: string | null
        }
        Insert: {
          candidates_found?: number | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          search_id: string
          source: string
          started_at?: string | null
          status?: string | null
        }
        Update: {
          candidates_found?: number | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          search_id?: string
          source?: string
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scraping_jobs_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "headhunt_searches"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      clean_certificate_entry: { Args: { entry: Json }; Returns: Json }
      clean_education_entry: { Args: { entry: Json }; Returns: Json }
      clean_other_section_entry: { Args: { entry: Json }; Returns: Json }
      clean_paper_entry: { Args: { entry: Json }; Returns: Json }
      clean_project_entry: { Args: { entry: Json }; Returns: Json }
      clean_work_experience_entry: { Args: { entry: Json }; Returns: Json }
      delete_user: { Args: never; Returns: undefined }
      get_candidates_needing_evaluation: {
        Args: { p_job_posting_id: string; p_limit?: number }
        Returns: {
          candidate_id: string
          candidate_name: string
          has_embedding: boolean
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_candidate_evaluated: {
        Args: {
          p_candidate_id: string
          p_embedding_similarity?: number
          p_job_posting_id: string
          p_match_found: boolean
          p_match_score?: number
        }
        Returns: undefined
      }
      process_embedding_queue: {
        Args: { batch_size?: number }
        Returns: {
          failed: number
          processed: number
          succeeded: number
        }[]
      }
      queue_embedding_generation: {
        Args: { p_entity_id: string; p_entity_type: string }
        Returns: undefined
      }
      search_candidates_by_embedding: {
        Args: {
          limit_count?: number
          query_embedding: string
          similarity_threshold?: number
        }
        Returns: {
          candidate_id: string
          metadata: Json
          similarity: number
        }[]
      }
      search_jobs_by_embedding: {
        Args: {
          limit_count?: number
          query_embedding: string
          similarity_threshold?: number
        }
        Returns: {
          job_posting_id: string
          metadata: Json
          similarity: number
        }[]
      }
    }
    Enums: {
      app_role: "job_seeker" | "recruiter"
      hiring_status: "accepted" | "rejected" | "potential_fit"
      job_status: "open" | "closed"
      requirement_priority: "must_have" | "nice_to_have" | "preferable"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["job_seeker", "recruiter"],
      hiring_status: ["accepted", "rejected", "potential_fit"],
      job_status: ["open", "closed"],
      requirement_priority: ["must_have", "nice_to_have", "preferable"],
    },
  },
} as const

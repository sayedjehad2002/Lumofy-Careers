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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_passwords: {
        Row: {
          created_at: string
          id: string
          label: string | null
          password_hash: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          password_hash: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          password_hash?: string
        }
        Relationships: []
      }
      admin_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          token: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
        }
        Relationships: []
      }
      applicants: {
        Row: {
          ai_analysis: Json | null
          applied_date: string
          cover_letter: string | null
          created_at: string
          cv_file_name: string
          cv_file_size: number | null
          cv_file_type: string | null
          cv_storage_path: string | null
          email: string
          full_name: string
          id: string
          job_id: string
          linkedin: string | null
          location: string
          nationality: string | null
          notes: Json
          phone: string
          portfolio: string | null
          rating: Json | null
          screening_answers: Json
          stage_entered_at: string
          status: string
          updated_at: string
        }
        Insert: {
          ai_analysis?: Json | null
          applied_date: string
          cover_letter?: string | null
          created_at?: string
          cv_file_name: string
          cv_file_size?: number | null
          cv_file_type?: string | null
          cv_storage_path?: string | null
          email: string
          full_name: string
          id: string
          job_id: string
          linkedin?: string | null
          location: string
          nationality?: string | null
          notes?: Json
          phone: string
          portfolio?: string | null
          rating?: Json | null
          screening_answers?: Json
          stage_entered_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          ai_analysis?: Json | null
          applied_date?: string
          cover_letter?: string | null
          created_at?: string
          cv_file_name?: string
          cv_file_size?: number | null
          cv_file_type?: string | null
          cv_storage_path?: string | null
          email?: string
          full_name?: string
          id?: string
          job_id?: string
          linkedin?: string | null
          location?: string
          nationality?: string | null
          notes?: Json
          phone?: string
          portfolio?: string | null
          rating?: Json | null
          screening_answers?: Json
          stage_entered_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applicants_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          session_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          session_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          session_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      copilot_memory: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      copilot_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "copilot_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "copilot_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      copilot_sessions: {
        Row: {
          candidate_id: string | null
          created_at: string
          id: string
          job_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          candidate_id?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      cv_library_candidates: {
        Row: {
          ai_analysis: Json | null
          classification_confidence: string | null
          classification_confidence_2: string | null
          classification_evidence: string[] | null
          classification_reasoning: string | null
          country: string | null
          created_at: string
          email: string | null
          extracted_text: string | null
          id: string
          industries: string[] | null
          location: string | null
          manual_department: string | null
          manual_job_title: string | null
          manual_overrides: Json | null
          name: string | null
          nationality: string | null
          phone: string | null
          resume_file_name: string
          resume_file_path: string
          resume_file_size: number | null
          resume_file_type: string | null
          roles_summary: string | null
          skills: string[] | null
          status: string
          suggested_department: string | null
          suggested_department_2: string | null
          suggested_job_title: string | null
          suggested_job_title_2: string | null
          tags: string[] | null
          updated_at: string
          uploaded_at: string
          years_experience: string | null
        }
        Insert: {
          ai_analysis?: Json | null
          classification_confidence?: string | null
          classification_confidence_2?: string | null
          classification_evidence?: string[] | null
          classification_reasoning?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          extracted_text?: string | null
          id?: string
          industries?: string[] | null
          location?: string | null
          manual_department?: string | null
          manual_job_title?: string | null
          manual_overrides?: Json | null
          name?: string | null
          nationality?: string | null
          phone?: string | null
          resume_file_name: string
          resume_file_path: string
          resume_file_size?: number | null
          resume_file_type?: string | null
          roles_summary?: string | null
          skills?: string[] | null
          status?: string
          suggested_department?: string | null
          suggested_department_2?: string | null
          suggested_job_title?: string | null
          suggested_job_title_2?: string | null
          tags?: string[] | null
          updated_at?: string
          uploaded_at?: string
          years_experience?: string | null
        }
        Update: {
          ai_analysis?: Json | null
          classification_confidence?: string | null
          classification_confidence_2?: string | null
          classification_evidence?: string[] | null
          classification_reasoning?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          extracted_text?: string | null
          id?: string
          industries?: string[] | null
          location?: string | null
          manual_department?: string | null
          manual_job_title?: string | null
          manual_overrides?: Json | null
          name?: string | null
          nationality?: string | null
          phone?: string | null
          resume_file_name?: string
          resume_file_path?: string
          resume_file_size?: number | null
          resume_file_type?: string | null
          roles_summary?: string | null
          skills?: string[] | null
          status?: string
          suggested_department?: string | null
          suggested_department_2?: string | null
          suggested_job_title?: string | null
          suggested_job_title_2?: string | null
          tags?: string[] | null
          updated_at?: string
          uploaded_at?: string
          years_experience?: string | null
        }
        Relationships: []
      }
      employees: {
        Row: {
          created_at: string
          department: string | null
          email: string | null
          full_name: string
          id: string
          id_iqama_number: string | null
          is_on_probation: boolean
          job_title: string | null
          joining_date: string | null
          last_active_at: string | null
          nationality: string | null
          notes: string | null
          phone: string | null
          photo_url: string | null
          probation_duration_months: number | null
          probation_start_date: string | null
          reports_to: string | null
          status: string
          tier: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          email?: string | null
          full_name: string
          id?: string
          id_iqama_number?: string | null
          is_on_probation?: boolean
          job_title?: string | null
          joining_date?: string | null
          last_active_at?: string | null
          nationality?: string | null
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          probation_duration_months?: number | null
          probation_start_date?: string | null
          reports_to?: string | null
          status?: string
          tier?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string
          id?: string
          id_iqama_number?: string | null
          is_on_probation?: boolean
          job_title?: string | null
          joining_date?: string | null
          last_active_at?: string | null
          nationality?: string | null
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          probation_duration_months?: number | null
          probation_start_date?: string | null
          reports_to?: string | null
          status?: string
          tier?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      headcount_records: {
        Row: {
          created_at: string
          ending_headcount: number
          id: string
          month: number
          starting_headcount: number
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          ending_headcount?: number
          id?: string
          month: number
          starting_headcount?: number
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          ending_headcount?: number
          id?: string
          month?: number
          starting_headcount?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      jobs: {
        Row: {
          ai_scoring_weights: Json | null
          benefits: Json
          created_at: string
          deadline: string | null
          department: string
          description: string
          id: string
          jd_file_name: string | null
          jd_file_path: string | null
          jd_file_size: number | null
          jd_file_uploaded_at: string | null
          linkedin_draft_text: string | null
          linkedin_job_id: string | null
          linkedin_job_url: string | null
          linkedin_last_error: string | null
          linkedin_last_published_at: string | null
          linkedin_manual_fallback_used: boolean | null
          linkedin_publish_status: string | null
          linkedin_share_caption: string | null
          location: string
          posted_date: string
          requirements: Json
          responsibilities: Json
          salary_currency: string | null
          salary_range: string | null
          screening_questions: Json
          status: string
          summary: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          ai_scoring_weights?: Json | null
          benefits?: Json
          created_at?: string
          deadline?: string | null
          department: string
          description?: string
          id: string
          jd_file_name?: string | null
          jd_file_path?: string | null
          jd_file_size?: number | null
          jd_file_uploaded_at?: string | null
          linkedin_draft_text?: string | null
          linkedin_job_id?: string | null
          linkedin_job_url?: string | null
          linkedin_last_error?: string | null
          linkedin_last_published_at?: string | null
          linkedin_manual_fallback_used?: boolean | null
          linkedin_publish_status?: string | null
          linkedin_share_caption?: string | null
          location: string
          posted_date: string
          requirements?: Json
          responsibilities?: Json
          salary_currency?: string | null
          salary_range?: string | null
          screening_questions?: Json
          status?: string
          summary?: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          ai_scoring_weights?: Json | null
          benefits?: Json
          created_at?: string
          deadline?: string | null
          department?: string
          description?: string
          id?: string
          jd_file_name?: string | null
          jd_file_path?: string | null
          jd_file_size?: number | null
          jd_file_uploaded_at?: string | null
          linkedin_draft_text?: string | null
          linkedin_job_id?: string | null
          linkedin_job_url?: string | null
          linkedin_last_error?: string | null
          linkedin_last_published_at?: string | null
          linkedin_manual_fallback_used?: boolean | null
          linkedin_publish_status?: string | null
          linkedin_share_caption?: string | null
          location?: string
          posted_date?: string
          requirements?: Json
          responsibilities?: Json
          salary_currency?: string | null
          salary_range?: string | null
          screening_questions?: Json
          status?: string
          summary?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      performance_snapshots: {
        Row: {
          ai_analysis: Json | null
          avg_manager_rating: number | null
          created_at: string
          department_breakdown: Json
          employee_data: Json
          high_performers: number
          high_potential: number
          id: string
          nine_box_distribution: Json
          red_flag_count: number
          snapshot_date: string
          snapshot_name: string
          total_employees: number
        }
        Insert: {
          ai_analysis?: Json | null
          avg_manager_rating?: number | null
          created_at?: string
          department_breakdown?: Json
          employee_data?: Json
          high_performers?: number
          high_potential?: number
          id?: string
          nine_box_distribution?: Json
          red_flag_count?: number
          snapshot_date?: string
          snapshot_name: string
          total_employees?: number
        }
        Update: {
          ai_analysis?: Json | null
          avg_manager_rating?: number | null
          created_at?: string
          department_breakdown?: Json
          employee_data?: Json
          high_performers?: number
          high_potential?: number
          id?: string
          nine_box_distribution?: Json
          red_flag_count?: number
          snapshot_date?: string
          snapshot_name?: string
          total_employees?: number
        }
        Relationships: []
      }
      pipeline_automation_log: {
        Row: {
          action_taken: string
          applicant_id: string
          created_at: string
          details: Json | null
          id: string
          rule_id: string
        }
        Insert: {
          action_taken: string
          applicant_id: string
          created_at?: string
          details?: Json | null
          id?: string
          rule_id: string
        }
        Update: {
          action_taken?: string
          applicant_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          rule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_automation_log_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "pipeline_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_rules: {
        Row: {
          action_type: string
          action_value: string
          condition_job_id: string | null
          condition_operator: string
          condition_stage: string | null
          condition_type: string
          condition_value: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          last_run_affected: number | null
          last_run_at: string | null
          name: string
          total_affected: number | null
          updated_at: string
        }
        Insert: {
          action_type?: string
          action_value?: string
          condition_job_id?: string | null
          condition_operator?: string
          condition_stage?: string | null
          condition_type?: string
          condition_value?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_run_affected?: number | null
          last_run_at?: string | null
          name: string
          total_affected?: number | null
          updated_at?: string
        }
        Update: {
          action_type?: string
          action_value?: string
          condition_job_id?: string | null
          condition_operator?: string
          condition_stage?: string | null
          condition_type?: string
          condition_value?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_run_affected?: number | null
          last_run_at?: string | null
          name?: string
          total_affected?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      policies: {
        Row: {
          category: string
          content: string
          created_at: string
          effective_date: string | null
          id: string
          key_points: Json | null
          related_policies: string[] | null
          status: string
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          effective_date?: string | null
          id?: string
          key_points?: Json | null
          related_policies?: string[] | null
          status?: string
          summary: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          effective_date?: string | null
          id?: string
          key_points?: Json | null
          related_policies?: string[] | null
          status?: string
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      survey_answers: {
        Row: {
          answer_json: Json | null
          answer_text: string | null
          created_at: string
          id: string
          question_id: string
          response_id: string
        }
        Insert: {
          answer_json?: Json | null
          answer_text?: string | null
          created_at?: string
          id?: string
          question_id: string
          response_id: string
        }
        Update: {
          answer_json?: Json | null
          answer_text?: string | null
          created_at?: string
          id?: string
          question_id?: string
          response_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "survey_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_answers_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "survey_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_intelligence_cache: {
        Row: {
          cached_intelligence: Json | null
          created_at: string
          id: string
          intelligence_cached_at: string | null
          intelligence_response_count: number | null
          survey_id: string
          updated_at: string
        }
        Insert: {
          cached_intelligence?: Json | null
          created_at?: string
          id?: string
          intelligence_cached_at?: string | null
          intelligence_response_count?: number | null
          survey_id: string
          updated_at?: string
        }
        Update: {
          cached_intelligence?: Json | null
          created_at?: string
          id?: string
          intelligence_cached_at?: string | null
          intelligence_response_count?: number | null
          survey_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_intelligence_cache_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: true
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_intelligence_cache_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: true
            referencedRelation: "surveys_public"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_questions: {
        Row: {
          created_at: string
          help_text: string | null
          id: string
          is_required: boolean
          options: Json | null
          order_index: number
          placeholder: string | null
          question_text: string
          settings: Json | null
          survey_id: string
          type: string
        }
        Insert: {
          created_at?: string
          help_text?: string | null
          id?: string
          is_required?: boolean
          options?: Json | null
          order_index?: number
          placeholder?: string | null
          question_text?: string
          settings?: Json | null
          survey_id: string
          type: string
        }
        Update: {
          created_at?: string
          help_text?: string | null
          id?: string
          is_required?: boolean
          options?: Json | null
          order_index?: number
          placeholder?: string | null
          question_text?: string
          settings?: Json | null
          survey_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys_public"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          completed_at: string | null
          id: string
          is_anonymous: boolean
          respondent_department: string | null
          respondent_email: string | null
          respondent_name: string | null
          started_at: string
          status: string
          survey_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          is_anonymous?: boolean
          respondent_department?: string | null
          respondent_email?: string | null
          respondent_name?: string | null
          started_at?: string
          status?: string
          survey_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          is_anonymous?: boolean
          respondent_department?: string | null
          respondent_email?: string | null
          respondent_name?: string | null
          started_at?: string
          status?: string
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys_public"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          allow_multiple_responses: boolean
          audience_type: string
          category: string
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          is_anonymous: boolean
          is_public: boolean
          max_responses: number | null
          response_deadline: string | null
          status: string
          thank_you_message: string | null
          title: string
          updated_at: string
        }
        Insert: {
          allow_multiple_responses?: boolean
          audience_type?: string
          category?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_anonymous?: boolean
          is_public?: boolean
          max_responses?: number | null
          response_deadline?: string | null
          status?: string
          thank_you_message?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          allow_multiple_responses?: boolean
          audience_type?: string
          category?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_anonymous?: boolean
          is_public?: boolean
          max_responses?: number | null
          response_deadline?: string | null
          status?: string
          thank_you_message?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      turnover_entries: {
        Row: {
          created_at: string
          department: string | null
          employee_name: string
          id: string
          included: boolean
          line_manager: string | null
          month: number
          notes: string | null
          termination_date: string
          termination_type: string
          tier: string | null
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          department?: string | null
          employee_name: string
          id?: string
          included?: boolean
          line_manager?: string | null
          month: number
          notes?: string | null
          termination_date: string
          termination_type?: string
          tier?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          department?: string | null
          employee_name?: string
          id?: string
          included?: boolean
          line_manager?: string | null
          month?: number
          notes?: string | null
          termination_date?: string
          termination_type?: string
          tier?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
    }
    Views: {
      surveys_public: {
        Row: {
          allow_multiple_responses: boolean | null
          audience_type: string | null
          category: string | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          id: string | null
          is_anonymous: boolean | null
          is_public: boolean | null
          max_responses: number | null
          response_deadline: string | null
          status: string | null
          thank_you_message: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          allow_multiple_responses?: boolean | null
          audience_type?: string | null
          category?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_anonymous?: boolean | null
          is_public?: boolean | null
          max_responses?: number | null
          response_deadline?: string | null
          status?: string | null
          thank_you_message?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          allow_multiple_responses?: boolean | null
          audience_type?: string | null
          category?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_anonymous?: boolean | null
          is_public?: boolean | null
          max_responses?: number | null
          response_deadline?: string | null
          status?: string | null
          thank_you_message?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_public_jobs: {
        Args: never
        Returns: {
          benefits: Json
          created_at: string
          deadline: string
          department: string
          description: string
          id: string
          location: string
          posted_date: string
          requirements: Json
          responsibilities: Json
          salary_currency: string
          salary_range: string
          status: string
          summary: string
          title: string
          type: string
        }[]
      }
      get_published_survey: {
        Args: { p_id: string }
        Returns: {
          allow_multiple_responses: boolean
          audience_type: string
          category: string
          cover_image_url: string
          created_at: string
          description: string
          id: string
          is_anonymous: boolean
          is_public: boolean
          max_responses: number
          response_deadline: string
          status: string
          thank_you_message: string
          title: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

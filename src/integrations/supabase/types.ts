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
      analysis_cache: {
        Row: {
          analysis_result: Json
          created_at: string | null
          document_hash: string
          expires_at: string | null
          id: string
        }
        Insert: {
          analysis_result: Json
          created_at?: string | null
          document_hash: string
          expires_at?: string | null
          id?: string
        }
        Update: {
          analysis_result?: Json
          created_at?: string | null
          document_hash?: string
          expires_at?: string | null
          id?: string
        }
        Relationships: []
      }
      analysis_sessions: {
        Row: {
          analysis_result: Json | null
          created_at: string
          id: string
          invoice_files: Json | null
          license_data: Json | null
          license_file_url: string | null
          officer_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          analysis_result?: Json | null
          created_at?: string
          id?: string
          invoice_files?: Json | null
          license_data?: Json | null
          license_file_url?: string | null
          officer_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          analysis_result?: Json | null
          created_at?: string
          id?: string
          invoice_files?: Json | null
          license_data?: Json | null
          license_file_url?: string | null
          officer_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      policy_articles: {
        Row: {
          article_number: string
          content: string
          content_amharic: string | null
          created_at: string
          document_id: string
          id: string
          page_number: number | null
          title: string | null
          title_amharic: string | null
        }
        Insert: {
          article_number: string
          content: string
          content_amharic?: string | null
          created_at?: string
          document_id: string
          id?: string
          page_number?: number | null
          title?: string | null
          title_amharic?: string | null
        }
        Update: {
          article_number?: string
          content?: string
          content_amharic?: string | null
          created_at?: string
          document_id?: string
          id?: string
          page_number?: number | null
          title?: string | null
          title_amharic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policy_articles_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "policy_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_documents: {
        Row: {
          added_by: string | null
          content_markdown: string | null
          content_text: string | null
          created_at: string
          directive_number: string | null
          document_type: string
          effective_date: string | null
          file_url: string
          id: string
          name: string
          name_amharic: string | null
          parent_document_id: string | null
          status: string
          total_articles: number | null
          total_pages: number | null
          updated_at: string
          version: string
        }
        Insert: {
          added_by?: string | null
          content_markdown?: string | null
          content_text?: string | null
          created_at?: string
          directive_number?: string | null
          document_type?: string
          effective_date?: string | null
          file_url: string
          id?: string
          name: string
          name_amharic?: string | null
          parent_document_id?: string | null
          status?: string
          total_articles?: number | null
          total_pages?: number | null
          updated_at?: string
          version?: string
        }
        Update: {
          added_by?: string | null
          content_markdown?: string | null
          content_text?: string | null
          created_at?: string
          directive_number?: string | null
          document_type?: string
          effective_date?: string | null
          file_url?: string
          id?: string
          name?: string
          name_amharic?: string | null
          parent_document_id?: string | null
          status?: string
          total_articles?: number | null
          total_pages?: number | null
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_documents_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "policy_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          department: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
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

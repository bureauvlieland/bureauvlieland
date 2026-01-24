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
      program_request_history: {
        Row: {
          action: string
          actor: string
          actor_name: string | null
          created_at: string
          id: string
          item_id: string | null
          new_value: Json | null
          notes: string | null
          old_value: Json | null
          request_id: string
        }
        Insert: {
          action: string
          actor: string
          actor_name?: string | null
          created_at?: string
          id?: string
          item_id?: string | null
          new_value?: Json | null
          notes?: string | null
          old_value?: Json | null
          request_id: string
        }
        Update: {
          action?: string
          actor?: string
          actor_name?: string | null
          created_at?: string
          id?: string
          item_id?: string | null
          new_value?: Json | null
          notes?: string | null
          old_value?: Json | null
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_request_history_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "program_request_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_request_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "program_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      program_request_items: {
        Row: {
          block_category: string
          block_id: string
          block_name: string
          block_type: string
          created_at: string
          customer_notes: string | null
          day_index: number
          id: string
          preferred_time: string | null
          price_indication: string | null
          provider_email: string | null
          provider_id: string
          provider_name: string
          request_id: string
          status: string
          status_note: string | null
          status_updated_at: string | null
          status_updated_by: string | null
          updated_at: string
          version: number
        }
        Insert: {
          block_category: string
          block_id: string
          block_name: string
          block_type: string
          created_at?: string
          customer_notes?: string | null
          day_index?: number
          id?: string
          preferred_time?: string | null
          price_indication?: string | null
          provider_email?: string | null
          provider_id: string
          provider_name: string
          request_id: string
          status?: string
          status_note?: string | null
          status_updated_at?: string | null
          status_updated_by?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          block_category?: string
          block_id?: string
          block_name?: string
          block_type?: string
          created_at?: string
          customer_notes?: string | null
          day_index?: number
          id?: string
          preferred_time?: string | null
          price_indication?: string | null
          provider_email?: string | null
          provider_id?: string
          provider_name?: string
          request_id?: string
          status?: string
          status_note?: string | null
          status_updated_at?: string | null
          status_updated_by?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "program_request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "program_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      program_requests: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          customer_company: string | null
          customer_email: string
          customer_name: string
          customer_phone: string
          customer_token: string
          expires_at: string
          general_notes: string | null
          id: string
          number_of_people: number
          selected_dates: Json
          status: string
          updated_at: string
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          customer_company?: string | null
          customer_email: string
          customer_name: string
          customer_phone: string
          customer_token: string
          expires_at?: string
          general_notes?: string | null
          id?: string
          number_of_people?: number
          selected_dates?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          customer_company?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          customer_token?: string
          expires_at?: string
          general_notes?: string | null
          id?: string
          number_of_people?: number
          selected_dates?: Json
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      shared_programs: {
        Row: {
          cart_items: Json
          created_at: string
          expires_at: string
          id: string
          number_of_people: number
          selected_date: string | null
          share_code: string
        }
        Insert: {
          cart_items: Json
          created_at?: string
          expires_at?: string
          id?: string
          number_of_people?: number
          selected_date?: string | null
          share_code: string
        }
        Update: {
          cart_items?: Json
          created_at?: string
          expires_at?: string
          id?: string
          number_of_people?: number
          selected_date?: string | null
          share_code?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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

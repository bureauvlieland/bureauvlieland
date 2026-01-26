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
      admin_activity_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      admin_todos: {
        Row: {
          assigned_to: string | null
          auto_entity_id: string | null
          auto_type: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string
          related_partner_id: string | null
          related_request_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          auto_entity_id?: string | null
          auto_type?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          related_partner_id?: string | null
          related_request_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          auto_entity_id?: string | null
          auto_type?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          related_partner_id?: string | null
          related_request_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_todos_related_partner_id_fkey"
            columns: ["related_partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_todos_related_request_id_fkey"
            columns: ["related_request_id"]
            isOneToOne: false
            referencedRelation: "program_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      building_blocks: {
        Row: {
          block_type: Database["public"]["Enums"]["building_block_type"]
          category: Database["public"]["Enums"]["building_block_category"]
          created_at: string | null
          created_by: string | null
          description: string | null
          duration: string | null
          external_url: string | null
          id: string
          image_asset: string | null
          image_url: string | null
          is_active: boolean | null
          is_from_price: boolean | null
          is_published: boolean | null
          max_people: number | null
          min_people: number | null
          name: string
          price_adult: number | null
          price_adult_note: string | null
          price_child: number | null
          price_child_max_age: number | null
          price_child_min_age: number | null
          price_child_note: string | null
          price_display_override: string | null
          price_extras: Json | null
          price_includes_vat: boolean | null
          price_pet: number | null
          price_pet_note: string | null
          price_type:
            | Database["public"]["Enums"]["building_block_price_type"]
            | null
          provider_id: string | null
          seasonal_notes: string | null
          short_description: string | null
          sort_order: number | null
          tags: string[] | null
          updated_at: string | null
          vat_rate: number | null
        }
        Insert: {
          block_type?: Database["public"]["Enums"]["building_block_type"]
          category: Database["public"]["Enums"]["building_block_category"]
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration?: string | null
          external_url?: string | null
          id: string
          image_asset?: string | null
          image_url?: string | null
          is_active?: boolean | null
          is_from_price?: boolean | null
          is_published?: boolean | null
          max_people?: number | null
          min_people?: number | null
          name: string
          price_adult?: number | null
          price_adult_note?: string | null
          price_child?: number | null
          price_child_max_age?: number | null
          price_child_min_age?: number | null
          price_child_note?: string | null
          price_display_override?: string | null
          price_extras?: Json | null
          price_includes_vat?: boolean | null
          price_pet?: number | null
          price_pet_note?: string | null
          price_type?:
            | Database["public"]["Enums"]["building_block_price_type"]
            | null
          provider_id?: string | null
          seasonal_notes?: string | null
          short_description?: string | null
          sort_order?: number | null
          tags?: string[] | null
          updated_at?: string | null
          vat_rate?: number | null
        }
        Update: {
          block_type?: Database["public"]["Enums"]["building_block_type"]
          category?: Database["public"]["Enums"]["building_block_category"]
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration?: string | null
          external_url?: string | null
          id?: string
          image_asset?: string | null
          image_url?: string | null
          is_active?: boolean | null
          is_from_price?: boolean | null
          is_published?: boolean | null
          max_people?: number | null
          min_people?: number | null
          name?: string
          price_adult?: number | null
          price_adult_note?: string | null
          price_child?: number | null
          price_child_max_age?: number | null
          price_child_min_age?: number | null
          price_child_note?: string | null
          price_display_override?: string | null
          price_extras?: Json | null
          price_includes_vat?: boolean | null
          price_pet?: number | null
          price_pet_note?: string | null
          price_type?:
            | Database["public"]["Enums"]["building_block_price_type"]
            | null
          provider_id?: string | null
          seasonal_notes?: string | null
          short_description?: string | null
          sort_order?: number | null
          tags?: string[] | null
          updated_at?: string | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "building_blocks_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      bureau_invoices: {
        Row: {
          amount_excl_vat: number
          amount_incl_vat: number | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          invoice_date: string
          invoice_number: string
          invoice_type: string
          request_id: string
          updated_at: string
          vat_amount: number
        }
        Insert: {
          amount_excl_vat: number
          amount_incl_vat?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          invoice_date: string
          invoice_number: string
          invoice_type?: string
          request_id: string
          updated_at?: string
          vat_amount: number
        }
        Update: {
          amount_excl_vat?: number
          amount_incl_vat?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          invoice_type?: string
          request_id?: string
          updated_at?: string
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "bureau_invoices_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "program_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          address_city: string | null
          address_postal: string | null
          address_street: string | null
          auth_user_id: string | null
          commission_percentage: number
          created_at: string
          email: string
          id: string
          is_active: boolean
          kvk_number: string | null
          name: string
          partner_token: string
          phone: string | null
          terms_pdf_path: string | null
          terms_uploaded_at: string | null
          updated_at: string
        }
        Insert: {
          address_city?: string | null
          address_postal?: string | null
          address_street?: string | null
          auth_user_id?: string | null
          commission_percentage?: number
          created_at?: string
          email: string
          id: string
          is_active?: boolean
          kvk_number?: string | null
          name: string
          partner_token?: string
          phone?: string | null
          terms_pdf_path?: string | null
          terms_uploaded_at?: string | null
          updated_at?: string
        }
        Update: {
          address_city?: string | null
          address_postal?: string | null
          address_street?: string | null
          auth_user_id?: string | null
          commission_percentage?: number
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          kvk_number?: string | null
          name?: string
          partner_token?: string
          phone?: string | null
          terms_pdf_path?: string | null
          terms_uploaded_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
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
          commission_amount: number | null
          commission_invoiced_at: string | null
          commission_notes: string | null
          commission_percentage: number | null
          commission_status: string | null
          created_at: string
          customer_notes: string | null
          day_index: number
          executed_at: string | null
          id: string
          invoiced_amount: number | null
          invoiced_date: string | null
          invoiced_file_path: string | null
          invoiced_number: string | null
          preferred_time: string | null
          price_indication: string | null
          provider_email: string | null
          provider_id: string
          provider_name: string
          quoted_at: string | null
          quoted_notes: string | null
          quoted_price: number | null
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
          commission_amount?: number | null
          commission_invoiced_at?: string | null
          commission_notes?: string | null
          commission_percentage?: number | null
          commission_status?: string | null
          created_at?: string
          customer_notes?: string | null
          day_index?: number
          executed_at?: string | null
          id?: string
          invoiced_amount?: number | null
          invoiced_date?: string | null
          invoiced_file_path?: string | null
          invoiced_number?: string | null
          preferred_time?: string | null
          price_indication?: string | null
          provider_email?: string | null
          provider_id: string
          provider_name: string
          quoted_at?: string | null
          quoted_notes?: string | null
          quoted_price?: number | null
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
          commission_amount?: number | null
          commission_invoiced_at?: string | null
          commission_notes?: string | null
          commission_percentage?: number | null
          commission_status?: string | null
          created_at?: string
          customer_notes?: string | null
          day_index?: number
          executed_at?: string | null
          id?: string
          invoiced_amount?: number | null
          invoiced_date?: string | null
          invoiced_file_path?: string | null
          invoiced_number?: string | null
          preferred_time?: string | null
          price_indication?: string | null
          provider_email?: string | null
          provider_id?: string
          provider_name?: string
          quoted_at?: string | null
          quoted_notes?: string | null
          quoted_price?: number | null
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
          billing_address_city: string | null
          billing_address_postal: string | null
          billing_address_street: string | null
          billing_company_name: string | null
          billing_contact_email: string | null
          billing_contact_name: string | null
          billing_kvk_number: string | null
          billing_reference: string | null
          billing_vat_number: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          completion_status: string | null
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
          signature_id: string | null
          signature_ip: string | null
          signature_name: string | null
          signature_user_agent: string | null
          status: string
          terms_accepted_at: string | null
          terms_version: string | null
          updated_at: string
        }
        Insert: {
          billing_address_city?: string | null
          billing_address_postal?: string | null
          billing_address_street?: string | null
          billing_company_name?: string | null
          billing_contact_email?: string | null
          billing_contact_name?: string | null
          billing_kvk_number?: string | null
          billing_reference?: string | null
          billing_vat_number?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completion_status?: string | null
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
          signature_id?: string | null
          signature_ip?: string | null
          signature_name?: string | null
          signature_user_agent?: string | null
          status?: string
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string
        }
        Update: {
          billing_address_city?: string | null
          billing_address_postal?: string | null
          billing_address_street?: string | null
          billing_company_name?: string | null
          billing_contact_email?: string | null
          billing_contact_name?: string | null
          billing_kvk_number?: string | null
          billing_reference?: string | null
          billing_vat_number?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completion_status?: string | null
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
          signature_id?: string | null
          signature_ip?: string | null
          signature_name?: string | null
          signature_user_agent?: string | null
          status?: string
          terms_accepted_at?: string | null
          terms_version?: string | null
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
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      get_partner_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_partner: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "partner"
      building_block_category: "activiteiten" | "catering" | "vervoer"
      building_block_price_type:
        | "per_person"
        | "total"
        | "per_hour"
        | "per_day"
        | "on_request"
      building_block_type: "bureau" | "partner" | "self_arranged"
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
      app_role: ["admin", "partner"],
      building_block_category: ["activiteiten", "catering", "vervoer"],
      building_block_price_type: [
        "per_person",
        "total",
        "per_hour",
        "per_day",
        "on_request",
      ],
      building_block_type: ["bureau", "partner", "self_arranged"],
    },
  },
} as const

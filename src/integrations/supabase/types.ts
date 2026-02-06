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
      accepted_terms_log: {
        Row: {
          accepted_at: string
          created_at: string | null
          id: string
          partner_id: string
          partner_name: string
          request_id: string
          terms_pdf_path: string | null
          terms_type: string
          terms_version: string
        }
        Insert: {
          accepted_at: string
          created_at?: string | null
          id?: string
          partner_id: string
          partner_name: string
          request_id: string
          terms_pdf_path?: string | null
          terms_type: string
          terms_version: string
        }
        Update: {
          accepted_at?: string
          created_at?: string | null
          id?: string
          partner_id?: string
          partner_name?: string
          request_id?: string
          terms_pdf_path?: string | null
          terms_type?: string
          terms_version?: string
        }
        Relationships: [
          {
            foreignKeyName: "accepted_terms_log_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "program_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_quote_extras: {
        Row: {
          category: string | null
          commission_percentage: number | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          notes: string | null
          price_includes_vat: boolean | null
          pricing_type: string
          quantity: number
          quote_id: string
          sort_order: number | null
          unit_price: number
          updated_at: string | null
          vat_rate: number | null
        }
        Insert: {
          category?: string | null
          commission_percentage?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          notes?: string | null
          price_includes_vat?: boolean | null
          pricing_type?: string
          quantity?: number
          quote_id: string
          sort_order?: number | null
          unit_price: number
          updated_at?: string | null
          vat_rate?: number | null
        }
        Update: {
          category?: string | null
          commission_percentage?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          notes?: string | null
          price_includes_vat?: boolean | null
          pricing_type?: string
          quantity?: number
          quote_id?: string
          sort_order?: number | null
          unit_price?: number
          updated_at?: string | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_quote_extras_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "accommodation_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_quotes: {
        Row: {
          accommodation_name: string
          actual_invoiced_excl_vat: number | null
          commission_amount: number | null
          commission_invoiced_at: string | null
          commission_percentage: number | null
          commission_status: string | null
          conditions: string | null
          created_at: string
          description: string | null
          deviation_reason: string | null
          id: string
          includes: Json | null
          invoiced_amount: number | null
          invoiced_date: string | null
          invoiced_file_path: string | null
          invoiced_number: string | null
          partner_id: string
          partner_notes: string | null
          price_includes_vat: boolean | null
          price_per_person_per_night: number | null
          price_total: number
          proforma_amount_excl_vat: number | null
          proforma_commission: number | null
          proforma_deadline: string | null
          proforma_sent_at: string | null
          quote_attachment_filename: string | null
          quote_attachment_path: string | null
          quote_external_url: string | null
          request_id: string
          room_configuration: Json | null
          selected_at: string | null
          status: string
          submitted_at: string | null
          updated_at: string
          valid_until: string
          vat_rate: number | null
        }
        Insert: {
          accommodation_name: string
          actual_invoiced_excl_vat?: number | null
          commission_amount?: number | null
          commission_invoiced_at?: string | null
          commission_percentage?: number | null
          commission_status?: string | null
          conditions?: string | null
          created_at?: string
          description?: string | null
          deviation_reason?: string | null
          id?: string
          includes?: Json | null
          invoiced_amount?: number | null
          invoiced_date?: string | null
          invoiced_file_path?: string | null
          invoiced_number?: string | null
          partner_id: string
          partner_notes?: string | null
          price_includes_vat?: boolean | null
          price_per_person_per_night?: number | null
          price_total: number
          proforma_amount_excl_vat?: number | null
          proforma_commission?: number | null
          proforma_deadline?: string | null
          proforma_sent_at?: string | null
          quote_attachment_filename?: string | null
          quote_attachment_path?: string | null
          quote_external_url?: string | null
          request_id: string
          room_configuration?: Json | null
          selected_at?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          valid_until: string
          vat_rate?: number | null
        }
        Update: {
          accommodation_name?: string
          actual_invoiced_excl_vat?: number | null
          commission_amount?: number | null
          commission_invoiced_at?: string | null
          commission_percentage?: number | null
          commission_status?: string | null
          conditions?: string | null
          created_at?: string
          description?: string | null
          deviation_reason?: string | null
          id?: string
          includes?: Json | null
          invoiced_amount?: number | null
          invoiced_date?: string | null
          invoiced_file_path?: string | null
          invoiced_number?: string | null
          partner_id?: string
          partner_notes?: string | null
          price_includes_vat?: boolean | null
          price_per_person_per_night?: number | null
          price_total?: number
          proforma_amount_excl_vat?: number | null
          proforma_commission?: number | null
          proforma_deadline?: string | null
          proforma_sent_at?: string | null
          quote_attachment_filename?: string | null
          quote_attachment_path?: string | null
          quote_external_url?: string | null
          request_id?: string
          room_configuration?: Json | null
          selected_at?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          valid_until?: string
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_quotes_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "accommodation_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodation_requests: {
        Row: {
          accommodation_type: string
          admin_notes: string | null
          arrival_date: string
          budget_range: string | null
          created_at: string
          customer_company: string | null
          customer_email: string
          customer_name: string
          customer_phone: string
          customer_token: string
          departure_date: string
          expires_at: string
          facilities_required: Json | null
          id: string
          linked_program_id: string | null
          location_preference: Json | null
          number_of_guests: number
          reference_number: string | null
          room_count: number | null
          room_occupancy: string | null
          room_types: Json | null
          special_requests: string | null
          status: string
          updated_at: string
          wants_activities: boolean | null
        }
        Insert: {
          accommodation_type?: string
          admin_notes?: string | null
          arrival_date: string
          budget_range?: string | null
          created_at?: string
          customer_company?: string | null
          customer_email: string
          customer_name: string
          customer_phone: string
          customer_token?: string
          departure_date: string
          expires_at?: string
          facilities_required?: Json | null
          id?: string
          linked_program_id?: string | null
          location_preference?: Json | null
          number_of_guests: number
          reference_number?: string | null
          room_count?: number | null
          room_occupancy?: string | null
          room_types?: Json | null
          special_requests?: string | null
          status?: string
          updated_at?: string
          wants_activities?: boolean | null
        }
        Update: {
          accommodation_type?: string
          admin_notes?: string | null
          arrival_date?: string
          budget_range?: string | null
          created_at?: string
          customer_company?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          customer_token?: string
          departure_date?: string
          expires_at?: string
          facilities_required?: Json | null
          id?: string
          linked_program_id?: string | null
          location_preference?: Json | null
          number_of_guests?: number
          reference_number?: string | null
          room_count?: number | null
          room_occupancy?: string | null
          room_types?: Json | null
          special_requests?: string | null
          status?: string
          updated_at?: string
          wants_activities?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_requests_linked_program_id_fkey"
            columns: ["linked_program_id"]
            isOneToOne: false
            referencedRelation: "program_requests"
            referencedColumns: ["id"]
          },
        ]
      }
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
      app_settings: {
        Row: {
          category: string
          description: string | null
          id: string
          label: string
          updated_at: string
          updated_by: string | null
          value: Json
          value_type: string
        }
        Insert: {
          category: string
          description?: string | null
          id: string
          label: string
          updated_at?: string
          updated_by?: string | null
          value: Json
          value_type?: string
        }
        Update: {
          category?: string
          description?: string | null
          id?: string
          label?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
          value_type?: string
        }
        Relationships: []
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
      email_log: {
        Row: {
          created_at: string
          email_type: string
          error_message: string | null
          id: string
          mailjet_message_id: string | null
          metadata: Json | null
          recipient_email: string
          recipient_name: string | null
          related_accommodation_id: string | null
          related_item_id: string | null
          related_partner_id: string | null
          related_request_id: string | null
          sent_at: string | null
          sent_by: string | null
          status: string
          subject: string
        }
        Insert: {
          created_at?: string
          email_type: string
          error_message?: string | null
          id?: string
          mailjet_message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          recipient_name?: string | null
          related_accommodation_id?: string | null
          related_item_id?: string | null
          related_partner_id?: string | null
          related_request_id?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          subject: string
        }
        Update: {
          created_at?: string
          email_type?: string
          error_message?: string | null
          id?: string
          mailjet_message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          recipient_name?: string | null
          related_accommodation_id?: string | null
          related_item_id?: string | null
          related_partner_id?: string | null
          related_request_id?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_log_related_accommodation_id_fkey"
            columns: ["related_accommodation_id"]
            isOneToOne: false
            referencedRelation: "accommodation_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_log_related_item_id_fkey"
            columns: ["related_item_id"]
            isOneToOne: false
            referencedRelation: "program_request_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_log_related_request_id_fkey"
            columns: ["related_request_id"]
            isOneToOne: false
            referencedRelation: "program_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body_html: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          subject: string
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          body_html: string
          created_at?: string | null
          description?: string | null
          id: string
          is_active?: boolean | null
          name: string
          subject: string
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          body_html?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: []
      }
      partner_extra_presets: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          partner_id: string
          price_includes_vat: boolean | null
          pricing_type: string
          sort_order: number | null
          unit_price: number
          updated_at: string | null
          vat_rate: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          partner_id: string
          price_includes_vat?: boolean | null
          pricing_type?: string
          sort_order?: number | null
          unit_price: number
          updated_at?: string | null
          vat_rate?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          partner_id?: string
          price_includes_vat?: boolean | null
          pricing_type?: string
          sort_order?: number | null
          unit_price?: number
          updated_at?: string | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_extra_presets_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_room_types: {
        Row: {
          bed_configuration: string | null
          created_at: string | null
          description: string | null
          facilities: string[] | null
          id: string
          images: Json | null
          is_active: boolean | null
          max_occupancy: number | null
          name: string
          partner_id: string
          price_includes_vat: boolean | null
          price_per_night: number | null
          size_sqm: number | null
          sort_order: number | null
          updated_at: string | null
          vat_rate: number | null
        }
        Insert: {
          bed_configuration?: string | null
          created_at?: string | null
          description?: string | null
          facilities?: string[] | null
          id?: string
          images?: Json | null
          is_active?: boolean | null
          max_occupancy?: number | null
          name: string
          partner_id: string
          price_includes_vat?: boolean | null
          price_per_night?: number | null
          size_sqm?: number | null
          sort_order?: number | null
          updated_at?: string | null
          vat_rate?: number | null
        }
        Update: {
          bed_configuration?: string | null
          created_at?: string | null
          description?: string | null
          facilities?: string[] | null
          id?: string
          images?: Json | null
          is_active?: boolean | null
          max_occupancy?: number | null
          name?: string
          partner_id?: string
          price_includes_vat?: boolean | null
          price_per_night?: number | null
          size_sqm?: number | null
          sort_order?: number | null
          updated_at?: string | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_room_types_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_unavailability: {
        Row: {
          created_at: string
          end_date: string
          id: string
          partner_id: string
          reason: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          partner_id: string
          reason?: string | null
          start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          partner_id?: string
          reason?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_unavailability_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          accommodation_commission_percentage: number | null
          accommodation_description: string | null
          accommodation_types: Json | null
          address_city: string | null
          address_postal: string | null
          address_street: string | null
          auth_user_id: string | null
          availability_notes: string | null
          bank_account_name: string | null
          bank_iban: string | null
          booking_contact_name: string | null
          booking_contact_phone: string | null
          commission_percentage: number
          created_at: string
          email: string
          id: string
          invited_at: string | null
          is_active: boolean
          kvk_number: string | null
          last_login_at: string | null
          name: string
          partner_token: string
          partner_type: string | null
          password_set_at: string | null
          phone: string | null
          reference_number: string | null
          terms_pdf_path: string | null
          terms_uploaded_at: string | null
          updated_at: string
          uses_default_terms: boolean | null
        }
        Insert: {
          accommodation_commission_percentage?: number | null
          accommodation_description?: string | null
          accommodation_types?: Json | null
          address_city?: string | null
          address_postal?: string | null
          address_street?: string | null
          auth_user_id?: string | null
          availability_notes?: string | null
          bank_account_name?: string | null
          bank_iban?: string | null
          booking_contact_name?: string | null
          booking_contact_phone?: string | null
          commission_percentage?: number
          created_at?: string
          email: string
          id: string
          invited_at?: string | null
          is_active?: boolean
          kvk_number?: string | null
          last_login_at?: string | null
          name: string
          partner_token?: string
          partner_type?: string | null
          password_set_at?: string | null
          phone?: string | null
          reference_number?: string | null
          terms_pdf_path?: string | null
          terms_uploaded_at?: string | null
          updated_at?: string
          uses_default_terms?: boolean | null
        }
        Update: {
          accommodation_commission_percentage?: number | null
          accommodation_description?: string | null
          accommodation_types?: Json | null
          address_city?: string | null
          address_postal?: string | null
          address_street?: string | null
          auth_user_id?: string | null
          availability_notes?: string | null
          bank_account_name?: string | null
          bank_iban?: string | null
          booking_contact_name?: string | null
          booking_contact_phone?: string | null
          commission_percentage?: number
          created_at?: string
          email?: string
          id?: string
          invited_at?: string | null
          is_active?: boolean
          kvk_number?: string | null
          last_login_at?: string | null
          name?: string
          partner_token?: string
          partner_type?: string | null
          password_set_at?: string | null
          phone?: string | null
          reference_number?: string | null
          terms_pdf_path?: string | null
          terms_uploaded_at?: string | null
          updated_at?: string
          uses_default_terms?: boolean | null
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
          actual_invoiced_excl_vat: number | null
          admin_price_notes: string | null
          admin_price_override: number | null
          block_category: string
          block_id: string
          block_name: string
          block_type: string
          commission_amount: number | null
          commission_invoiced_at: string | null
          commission_notes: string | null
          commission_percentage: number | null
          commission_status: string | null
          confirmed_time: string | null
          created_at: string
          customer_accepted_at: string | null
          customer_counter_at: string | null
          customer_counter_note: string | null
          customer_counter_time: string | null
          customer_notes: string | null
          day_index: number
          deviation_reason: string | null
          duration: string | null
          executed_at: string | null
          id: string
          invoiced_amount: number | null
          invoiced_date: string | null
          invoiced_file_path: string | null
          invoiced_number: string | null
          item_quote_status: string | null
          preferred_time: string | null
          price_indication: string | null
          proforma_amount_excl_vat: number | null
          proforma_commission: number | null
          proforma_deadline: string | null
          proforma_sent_at: string | null
          proposed_date: string | null
          proposed_time: string | null
          provider_email: string | null
          provider_id: string
          provider_name: string
          quoted_at: string | null
          quoted_notes: string | null
          quoted_price: number | null
          request_id: string
          skip_partner_notification: boolean | null
          status: string
          status_note: string | null
          status_updated_at: string | null
          status_updated_by: string | null
          updated_at: string
          version: number
        }
        Insert: {
          actual_invoiced_excl_vat?: number | null
          admin_price_notes?: string | null
          admin_price_override?: number | null
          block_category: string
          block_id: string
          block_name: string
          block_type: string
          commission_amount?: number | null
          commission_invoiced_at?: string | null
          commission_notes?: string | null
          commission_percentage?: number | null
          commission_status?: string | null
          confirmed_time?: string | null
          created_at?: string
          customer_accepted_at?: string | null
          customer_counter_at?: string | null
          customer_counter_note?: string | null
          customer_counter_time?: string | null
          customer_notes?: string | null
          day_index?: number
          deviation_reason?: string | null
          duration?: string | null
          executed_at?: string | null
          id?: string
          invoiced_amount?: number | null
          invoiced_date?: string | null
          invoiced_file_path?: string | null
          invoiced_number?: string | null
          item_quote_status?: string | null
          preferred_time?: string | null
          price_indication?: string | null
          proforma_amount_excl_vat?: number | null
          proforma_commission?: number | null
          proforma_deadline?: string | null
          proforma_sent_at?: string | null
          proposed_date?: string | null
          proposed_time?: string | null
          provider_email?: string | null
          provider_id: string
          provider_name: string
          quoted_at?: string | null
          quoted_notes?: string | null
          quoted_price?: number | null
          request_id: string
          skip_partner_notification?: boolean | null
          status?: string
          status_note?: string | null
          status_updated_at?: string | null
          status_updated_by?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          actual_invoiced_excl_vat?: number | null
          admin_price_notes?: string | null
          admin_price_override?: number | null
          block_category?: string
          block_id?: string
          block_name?: string
          block_type?: string
          commission_amount?: number | null
          commission_invoiced_at?: string | null
          commission_notes?: string | null
          commission_percentage?: number | null
          commission_status?: string | null
          confirmed_time?: string | null
          created_at?: string
          customer_accepted_at?: string | null
          customer_counter_at?: string | null
          customer_counter_note?: string | null
          customer_counter_time?: string | null
          customer_notes?: string | null
          day_index?: number
          deviation_reason?: string | null
          duration?: string | null
          executed_at?: string | null
          id?: string
          invoiced_amount?: number | null
          invoiced_date?: string | null
          invoiced_file_path?: string | null
          invoiced_number?: string | null
          item_quote_status?: string | null
          preferred_time?: string | null
          price_indication?: string | null
          proforma_amount_excl_vat?: number | null
          proforma_commission?: number | null
          proforma_deadline?: string | null
          proforma_sent_at?: string | null
          proposed_date?: string | null
          proposed_time?: string | null
          provider_email?: string | null
          provider_id?: string
          provider_name?: string
          quoted_at?: string | null
          quoted_notes?: string | null
          quoted_price?: number | null
          request_id?: string
          skip_partner_notification?: boolean | null
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
          admin_created_by: string | null
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
          linked_accommodation_id: string | null
          number_of_people: number
          program_description: string | null
          program_type: string
          quote_personal_message: string | null
          quote_sent_at: string | null
          quote_sent_by: string | null
          quote_status: string | null
          quote_valid_until: string | null
          reference_number: string | null
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
          admin_created_by?: string | null
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
          linked_accommodation_id?: string | null
          number_of_people?: number
          program_description?: string | null
          program_type?: string
          quote_personal_message?: string | null
          quote_sent_at?: string | null
          quote_sent_by?: string | null
          quote_status?: string | null
          quote_valid_until?: string | null
          reference_number?: string | null
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
          admin_created_by?: string | null
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
          linked_accommodation_id?: string | null
          number_of_people?: number
          program_description?: string | null
          program_type?: string
          quote_personal_message?: string | null
          quote_sent_at?: string | null
          quote_sent_by?: string | null
          quote_status?: string | null
          quote_valid_until?: string | null
          reference_number?: string | null
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
        Relationships: [
          {
            foreignKeyName: "program_requests_linked_accommodation_id_fkey"
            columns: ["linked_accommodation_id"]
            isOneToOne: true
            referencedRelation: "accommodation_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      program_template_items: {
        Row: {
          block_id: string
          created_at: string | null
          day_index: number
          id: string
          notes: string | null
          preferred_time: string | null
          sort_order: number | null
          template_id: string
        }
        Insert: {
          block_id: string
          created_at?: string | null
          day_index?: number
          id?: string
          notes?: string | null
          preferred_time?: string | null
          sort_order?: number | null
          template_id: string
        }
        Update: {
          block_id?: string
          created_at?: string | null
          day_index?: number
          id?: string
          notes?: string | null
          preferred_time?: string | null
          sort_order?: number | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_template_items_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "building_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "program_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      program_templates: {
        Row: {
          created_at: string | null
          description: string | null
          duration_days: number
          id: string
          image_url: string | null
          indicative_price_pp: number | null
          is_published: boolean | null
          name: string
          short_description: string | null
          sort_order: number | null
          target_group: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_days: number
          id: string
          image_url?: string | null
          indicative_price_pp?: number | null
          is_published?: boolean | null
          name: string
          short_description?: string | null
          sort_order?: number | null
          target_group?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_days?: number
          id?: string
          image_url?: string | null
          indicative_price_pp?: number | null
          is_published?: boolean | null
          name?: string
          short_description?: string | null
          sort_order?: number | null
          target_group?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      project_communications: {
        Row: {
          accommodation_id: string | null
          communication_date: string | null
          communication_type: string
          contact_email: string | null
          contact_name: string | null
          content: string
          created_at: string | null
          direction: string
          id: string
          logged_at: string | null
          logged_by: string | null
          metadata: Json | null
          request_id: string | null
          subject: string | null
          updated_at: string | null
        }
        Insert: {
          accommodation_id?: string | null
          communication_date?: string | null
          communication_type?: string
          contact_email?: string | null
          contact_name?: string | null
          content: string
          created_at?: string | null
          direction?: string
          id?: string
          logged_at?: string | null
          logged_by?: string | null
          metadata?: Json | null
          request_id?: string | null
          subject?: string | null
          updated_at?: string | null
        }
        Update: {
          accommodation_id?: string | null
          communication_date?: string | null
          communication_type?: string
          contact_email?: string | null
          contact_name?: string | null
          content?: string
          created_at?: string | null
          direction?: string
          id?: string
          logged_at?: string | null
          logged_by?: string | null
          metadata?: Json | null
          request_id?: string | null
          subject?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_communications_accommodation_id_fkey"
            columns: ["accommodation_id"]
            isOneToOne: false
            referencedRelation: "accommodation_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_communications_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "program_requests"
            referencedColumns: ["id"]
          },
        ]
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
      building_block_category:
        | "activiteiten"
        | "catering"
        | "vervoer"
        | "outdoor"
        | "excursies"
        | "entertainment"
        | "locaties"
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
      building_block_category: [
        "activiteiten",
        "catering",
        "vervoer",
        "outdoor",
        "excursies",
        "entertainment",
        "locaties",
      ],
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

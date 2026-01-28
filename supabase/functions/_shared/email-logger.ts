import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface EmailLogEntry {
  email_type: string;
  subject: string;
  recipient_email: string;
  recipient_name?: string;
  related_request_id?: string;
  related_accommodation_id?: string;
  related_partner_id?: string;
  related_item_id?: string;
  status: "sent" | "failed" | "pending";
  error_message?: string;
  mailjet_message_id?: string;
  sent_by: string;
  metadata?: Record<string, unknown>;
}

export async function logEmail(entry: EmailLogEntry): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase.from("email_log").insert({
      email_type: entry.email_type,
      subject: entry.subject,
      recipient_email: entry.recipient_email,
      recipient_name: entry.recipient_name || null,
      related_request_id: entry.related_request_id || null,
      related_accommodation_id: entry.related_accommodation_id || null,
      related_partner_id: entry.related_partner_id || null,
      related_item_id: entry.related_item_id || null,
      status: entry.status,
      error_message: entry.error_message || null,
      mailjet_message_id: entry.mailjet_message_id || null,
      sent_by: entry.sent_by,
      metadata: entry.metadata || {},
      sent_at: entry.status === "sent" ? new Date().toISOString() : null,
    });

    if (error) {
      console.error("Failed to log email:", error);
    }
  } catch (err) {
    console.error("Error in email logger:", err);
  }
}

// Email type constants for consistency
export const EmailTypes = {
  // Program request emails
  PROGRAM_REQUEST_BUREAU: "program_request_bureau",
  PROGRAM_REQUEST_CUSTOMER: "program_request_customer",
  PROGRAM_REQUEST_PARTNER: "program_request_partner",
  
  // Quote request emails
  QUOTE_REQUEST_BUREAU: "quote_request_bureau",
  QUOTE_REQUEST_CUSTOMER: "quote_request_customer",
  
  // Status update emails
  STATUS_CONFIRMED: "status_confirmed",
  STATUS_UNAVAILABLE: "status_unavailable",
  STATUS_ALTERNATIVE: "status_alternative",
  
  // Customer program emails
  CUSTOMER_PROGRAM_UPDATE_PARTNER: "customer_program_update_partner",
  
  // Cancellation emails
  CANCELLATION_CUSTOMER: "cancellation_customer",
  CANCELLATION_PARTNER: "cancellation_partner",
  CANCELLATION_BUREAU: "cancellation_bureau",
  
  // Partner invitation
  PARTNER_INVITATION: "partner_invitation",
  
  // Accommodation emails
  ACCOMMODATION_REQUEST_BUREAU: "accommodation_request_bureau",
  ACCOMMODATION_REQUEST_CUSTOMER: "accommodation_request_customer",
  ACCOMMODATION_QUOTE_NOTIFICATION: "accommodation_quote_notification",
  ACCOMMODATION_SELECTED_PARTNER: "accommodation_selected_partner",
  ACCOMMODATION_SELECTED_CUSTOMER: "accommodation_selected_customer",
} as const;

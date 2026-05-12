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
  /**
   * Metadata MUST include `template_name` (machine-readable template identifier,
   * e.g. "partner_item_cancellation") and `actor` (who initiated the send,
   * e.g. "admin → partner", "klant → bureau", "system").
   * The audit popover relies on these fields.
   */
  metadata: { template_name: string; actor: string } & Record<string, unknown>;
}

export class EmailLogValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailLogValidationError";
  }
}

/**
 * Validates that an email-log entry contains the required audit fields.
 * Throws EmailLogValidationError when `metadata.template_name` or
 * `metadata.actor` is missing/empty so the calling edge function fails loudly
 * instead of silently writing an incomplete row.
 */
function validateEntry(entry: EmailLogEntry): void {
  const errors: string[] = [];

  if (!entry.email_type) errors.push("email_type is required");
  if (!entry.subject) errors.push("subject is required");
  if (!entry.recipient_email) errors.push("recipient_email is required");
  if (!entry.status) errors.push("status is required");
  if (!entry.sent_by) errors.push("sent_by is required");

  const meta = entry.metadata as Record<string, unknown> | undefined;
  const templateName = meta?.template_name;
  const actor = meta?.actor;

  if (typeof templateName !== "string" || templateName.trim() === "") {
    errors.push("metadata.template_name is required (non-empty string)");
  }
  if (typeof actor !== "string" || actor.trim() === "") {
    errors.push("metadata.actor is required (non-empty string)");
  }

  if (errors.length > 0) {
    throw new EmailLogValidationError(
      `logEmail validation failed for "${entry.email_type ?? "unknown"}" → ${entry.recipient_email ?? "unknown"}: ${errors.join("; ")}`,
    );
  }
}

export async function logEmail(entry: EmailLogEntry): Promise<void> {
  // Validate FIRST — throws synchronously so callers fail fast.
  validateEntry(entry);

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
  ACCOMMODATION_QUOTE_REQUEST_PARTNER: "accommodation_quote_request_partner",
  ACCOMMODATION_QUOTE_NOTIFICATION: "accommodation_quote_notification",
  ACCOMMODATION_SELECTED_PARTNER: "accommodation_selected_partner",
  ACCOMMODATION_SELECTED_CUSTOMER: "accommodation_selected_customer",
  
  // Counter proposal emails
  COUNTER_PROPOSAL_PARTNER: "counter_proposal_partner",
  
  // Accommodation rejection
  ACCOMMODATION_REJECTED_PARTNER: "accommodation_rejected_partner",
  
  // Reminder emails
  REMINDER_ITEM_PENDING: "reminder_item_pending",
  REMINDER_QUOTE_PENDING: "reminder_quote_pending",
} as const;

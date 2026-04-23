import { supabase } from "@/integrations/supabase/client";

export type AutoTodoType = 
  | "partner_reminder" 
  | "commission_pending" 
  | "terms_reminder" 
  | "invoicing_ready"
  | "availability_conflict"
  | "quote_review"
  | "quote_pending_partner"
  | "quote_pending_customer"
  | "request_no_response"
  | "quote_expired_partner"
  | "accommodation_quote_declined"
  | "all_partners_responded"
  | "bureau_item_pricing"
  | "post_execution_feedback"
  | "post_execution_invoice_check"
  | "accommodation_selected"
  | "new_request_received"
  | "new_accommodation_request"
  | "quote_ready_to_send"
  | "send_items_to_partners"
  | "partner_status_update"
  | "forward_accommodation_quote"
  | "quote_expiring_soon"
  | "customer_counter_proposal";

interface AutoTodoConfig {
  type: AutoTodoType;
  requestId: string;
  partnerId?: string;
  itemId?: string;
  title: string;
  description?: string;
  priority?: "low" | "normal" | "high" | "urgent";
}

/**
 * Creates an automatic todo if one doesn't already exist for this entity
 */
export async function createAutoTodo(config: AutoTodoConfig): Promise<string | null> {
  const { type, requestId, partnerId, itemId, title, description, priority = "normal" } = config;
  
  // Check if a similar todo already exists (not done)
  const entityId = itemId || requestId;
  
  const { data: existing } = await supabase
    .from("admin_todos")
    .select("id")
    .eq("auto_type", type)
    .eq("auto_entity_id", entityId)
    .neq("status", "done")
    .maybeSingle();
  
  if (existing) {
    console.log(`Auto todo of type ${type} already exists for entity ${entityId}`);
    return existing.id;
  }
  
  // Create the auto todo
  const { data, error } = await supabase
    .from("admin_todos")
    .insert({
      title,
      description,
      priority,
      status: "todo",
      related_request_id: requestId,
      related_partner_id: partnerId,
      auto_type: type,
      auto_entity_id: entityId,
    })
    .select("id")
    .single();
  
  if (error) {
    console.error("Error creating auto todo:", error);
    return null;
  }
  
  console.log(`Created auto todo: ${type} for entity ${entityId}`);
  return data.id;
}

/**
 * Resolves (marks as done) an automatic todo for a specific entity
 */
export async function resolveAutoTodo(
  type: AutoTodoType, 
  entityId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("admin_todos")
    .update({
      status: "done",
      completed_at: new Date().toISOString(),
    })
    .eq("auto_type", type)
    .eq("auto_entity_id", entityId)
    .neq("status", "done");
  
  if (error) {
    console.error("Error resolving auto todo:", error);
    return false;
  }
  
  console.log(`Resolved auto todo: ${type} for entity ${entityId}`);
  return true;
}

/**
 * Gets the count of pending auto todos by type
 */
export async function getAutoTodoCount(type?: AutoTodoType): Promise<number> {
  let query = supabase
    .from("admin_todos")
    .select("id", { count: "exact", head: true })
    .neq("status", "done")
    .not("auto_type", "is", null);
  
  if (type) {
    query = query.eq("auto_type", type);
  }
  
  const { count } = await query;
  return count || 0;
}

/**
 * Helper to format auto todo titles based on type
 */
export const autoTodoTitles = {
  partner_reminder: (partnerName: string, activityName: string) =>
    `Partner ${partnerName} heeft niet gereageerd op "${activityName}"`,
  
  commission_pending: (partnerName: string, amount: number) =>
    `Commissie factureren: ${partnerName} - €${amount.toFixed(2)}`,
  
  terms_reminder: (customerName: string) =>
    `Klant ${customerName} moet voorwaarden accepteren`,
  
  invoicing_ready: (customerName: string, amount: number) =>
    `Facturatie: ${customerName} - €${amount.toFixed(2)}`,
  
  availability_conflict: (partnerName: string, activityName: string) =>
    `Beschikbaarheidsconflict: ${partnerName} niet beschikbaar voor "${activityName}"`,

  quote_review: (partnerName: string, customerName: string) =>
    `Nieuwe logiesofferte: ${partnerName} voor ${customerName}`,

  quote_pending_partner: (partnerName: string, customerName: string) =>
    `Partner ${partnerName} heeft niet gereageerd op logiesverzoek ${customerName}`,

  quote_pending_customer: (customerName: string) =>
    `Klant ${customerName} heeft nog geen logiesofferte gekozen`,

  request_no_response: (customerName: string) =>
    `Aanvraag ${customerName} is lang inactief`,

  quote_expired_partner: (partnerName: string, customerName: string) =>
    `Logiesofferte ${partnerName} voor ${customerName} is verlopen`,

  all_partners_responded: (referenceNumber: string, customerName: string) =>
    `Alle partners hebben gereageerd op ${referenceNumber} (${customerName})`,

  bureau_item_pricing: (itemName: string, customerName: string) =>
    `Prijs invullen: "${itemName}" voor ${customerName}`,

  post_execution_feedback: (customerName: string, activityName: string) =>
    `Feedback vragen aan ${customerName} voor "${activityName}"`,

  post_execution_invoice_check: (partnerName: string, activityName: string) =>
    `Factuur partner ${partnerName} nog niet ontvangen voor "${activityName}"`,

  accommodation_selected: (accommodationName: string, customerName: string) =>
    `Logies "${accommodationName}" geselecteerd door ${customerName}`,

  new_request_received: (customerName: string) =>
    `Nieuwe aanvraag: ${customerName} — programma samenstellen`,

  quote_ready_to_send: (customerName: string) =>
    `Offerte klaar: ${customerName} — verstuur naar klant`,

  send_items_to_partners: (customerName: string) =>
    `Akkoord ontvangen: ${customerName} — stuur items naar partners`,

  partner_status_update: (partnerName: string, activityName: string, status: string) =>
    `Partner ${partnerName} reageert op "${activityName}" — ${status}`,

  forward_accommodation_quote: (partnerName: string, customerName: string) =>
    `Logiesofferte ${partnerName} klaar — doorsturen naar ${customerName}`,

  quote_expiring_soon: (customerName: string, daysLeft: number) =>
    `Offerte ${customerName} verloopt over ${daysLeft} dagen`,

  customer_counter_proposal: (customerName: string, activityName: string) =>
    `Tegenvoorstel: ${customerName} voor "${activityName}" — beoordelen`,
};

/**
 * Auto todo type configuration for UI display
 */
export const autoTodoTypeConfig: Record<AutoTodoType, { 
  label: string; 
  color: string;
  bgColor: string;
}> = {
  partner_reminder: {
    label: "Partner reminder",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
  },
  commission_pending: {
    label: "Commissie",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
  },
  terms_reminder: {
    label: "Voorwaarden",
    color: "text-purple-700",
    bgColor: "bg-purple-100",
  },
  invoicing_ready: {
    label: "Facturatie",
    color: "text-green-700",
    bgColor: "bg-green-100",
  },
  availability_conflict: {
    label: "Beschikbaarheid",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
  },
  quote_review: {
    label: "Offerte beoordelen",
    color: "text-teal-700",
    bgColor: "bg-teal-100",
  },
  quote_pending_partner: {
    label: "Partner logies",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
  },
  quote_pending_customer: {
    label: "Klant logies",
    color: "text-indigo-700",
    bgColor: "bg-indigo-100",
  },
  request_no_response: {
    label: "Inactieve aanvraag",
    color: "text-red-700",
    bgColor: "bg-red-100",
  },
  quote_expired_partner: {
    label: "Offerte verlopen",
    color: "text-red-700",
    bgColor: "bg-red-100",
  },
  accommodation_quote_declined: {
    label: "Logies afgewezen",
    color: "text-red-700",
    bgColor: "bg-red-100",
  },
  all_partners_responded: {
    label: "Alle reacties binnen",
    color: "text-green-700",
    bgColor: "bg-green-100",
  },
  bureau_item_pricing: {
    label: "Bureau prijs",
    color: "text-cyan-700",
    bgColor: "bg-cyan-100",
  },
  post_execution_feedback: {
    label: "Feedback",
    color: "text-violet-700",
    bgColor: "bg-violet-100",
  },
  post_execution_invoice_check: {
    label: "Factuur check",
    color: "text-rose-700",
    bgColor: "bg-rose-100",
  },
  accommodation_selected: {
    label: "Logies bevestigen",
    color: "text-teal-700",
    bgColor: "bg-teal-100",
  },
  new_request_received: {
    label: "Nieuwe aanvraag",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
  },
  new_accommodation_request: {
    label: "Nieuwe logies-aanvraag",
    color: "text-teal-700",
    bgColor: "bg-teal-100",
  },
  quote_ready_to_send: {
    label: "Offerte versturen",
    color: "text-emerald-700",
    bgColor: "bg-emerald-100",
  },
  send_items_to_partners: {
    label: "Naar partners",
    color: "text-indigo-700",
    bgColor: "bg-indigo-100",
  },
  partner_status_update: {
    label: "Partner reactie",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
  },
  forward_accommodation_quote: {
    label: "Logies doorsturen",
    color: "text-teal-700",
    bgColor: "bg-teal-100",
  },
  quote_expiring_soon: {
    label: "Offerte verloopt",
    color: "text-red-700",
    bgColor: "bg-red-100",
  },
  customer_counter_proposal: {
    label: "Tegenvoorstel",
    color: "text-purple-700",
    bgColor: "bg-purple-100",
  },
};

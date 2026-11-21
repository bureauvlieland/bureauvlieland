import { supabase } from "@/integrations/supabase/client";

/**
 * Alle automatische taaksoorten (admin_todos.auto_type) die het systeem
 * aanmaakt: edge functions, DB-triggers en de frontend. De Werkbank toont het
 * Nederlandse label uit autoTodoTypeConfig; de inbox clustert via CLUSTER_MAP
 * in projectActivity.ts. Nieuwe sleutel? Dan ook hier en daar toevoegen.
 *
 * Niet meer aangemaakt sinds fase 3 (docs/plan-notificaties.md) en daarom
 * weg uit deze lijst: customer_status_email_due (→ customer_status_update_due),
 * post_execution_feedback (→ customer_aftersales), post_execution_invoice_check
 * (→ commission_missing_invoice), new_request_received (→ new_program_request).
 */
export type AutoTodoType =
  // aanvragen en offerte
  | "new_program_request"
  | "new_accommodation_request"
  | "quote_ready_to_send"
  | "send_items_to_partners"
  | "bureau_item_pricing"
  | "book_ferry_tickets"
  | "all_partners_responded"
  | "partner_reminder"
  | "partner_status_update"
  | "availability_conflict"
  | "stale_pending_change"
  | "people_change_notify_failed"
  | "customer_date_change_partner_notify"
  | "customer_practical_info_updated"
  | "customer_accommodation_setup_changed"
  | "customer_counter_proposal"
  // klant: akkoord, voorwaarden, gegevens
  | "terms_reminder"
  | "quote_expiring_soon"
  | "quote_expired"
  | "customer_status_update_due"
  | "customer_inputs_missing"
  | "customer_billing_missing"
  | "customer_terms_missing"
  | "request_no_response"
  | "customer_cancellation"
  // logies
  | "quote_review"
  | "quote_headcount_review"
  | "quote_headcount_pending_partner"
  | "quote_pending_partner"
  | "quote_pending_customer"
  | "quote_expired_partner"
  | "accommodation_quote_declined"
  | "accommodation_alternative_dates"
  | "accommodation_selected"
  | "forward_accommodation_quote"
  | "lodging_board_missing"
  // facturen en commissie
  | "invoicing_ready"
  | "bureau_invoice_pending"
  | "purchase_invoice_inbox"
  | "purchase_invoice_pending"
  | "commission_pending"
  | "commission_missing_invoice"
  | "commission_unlinked_invoice"
  | "commission_invoice_lost"
  | "commission_ready_to_invoice"
  | "accommodation_commission_ready"
  | "partner_post_charge"
  // na uitvoering, reviews, referenties
  | "customer_aftersales"
  | "customer_review_low"
  | "reference_case_approved"
  | "reference_case_feedback"
  // binnengekomen (plan-notificaties fase 2)
  | "inbound_email"
  | "sales_inbox"
  | "commission_invoice_reply"
  | "partner_item_executed"
  | "customer_quote_accepted"
  | "customer_terms_signed"
  | "wedding_referral_claim"
  | "partner_agreement_accepted"
  // systeem
  | "system_cron_failure"
  | "email_webhook_silent"
  | "email_undeliverable"
  | "critical_selftest_failure";

/** Prioriteiten van admin_todos in het Nederlands (de Werkbank toont geen Engelse sleutels). */
export const TODO_PRIORITY_LABEL: Record<string, string> = {
  low: "laag",
  normal: "normaal",
  high: "hoog",
  urgent: "urgent",
};

export function todoPriorityLabel(priority: string | null | undefined): string {
  return TODO_PRIORITY_LABEL[priority ?? "normal"] ?? priority ?? "normaal";
}

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
    `Commissie factureren: ${partnerName} — ${formatEuroNL(amount)}`,

  terms_reminder: (customerName: string) =>
    `Vraag ${customerName} akkoord te geven en te ondertekenen in het klantportaal`,

  invoicing_ready: (customerName: string, amount: number) =>
    `Facturatie: ${customerName} — ${formatEuroNL(amount)}`,

  availability_conflict: (partnerName: string, activityName: string) =>
    `Beschikbaarheidsconflict: ${partnerName} niet beschikbaar voor "${activityName}"`,

  quote_review: (partnerName: string, customerName: string) =>
    `Nieuwe logiesofferte: ${partnerName} voor ${customerName}`,

  quote_headcount_review: (partnerName: string, customerName: string) =>
    `Nieuw aantal bevestigd: ${partnerName} voor ${customerName}`,

  quote_headcount_pending_partner: (partnerName: string, customerName: string) =>
    `Partner ${partnerName} heeft het nieuwe aantal gasten voor ${customerName} nog niet bevestigd`,

  quote_pending_partner: (partnerName: string, customerName: string) =>
    `Partner ${partnerName} heeft niet gereageerd op logiesverzoek ${customerName}`,

  quote_pending_customer: (customerName: string) =>
    `Klant ${customerName} heeft nog geen logiesofferte gekozen`,

  request_no_response: (customerName: string) =>
    `Aanvraag ${customerName} is inactief`,

  quote_expired_partner: (partnerName: string, customerName: string) =>
    `Logiesofferte ${partnerName} voor ${customerName} is verlopen`,

  all_partners_responded: (referenceNumber: string, customerName: string) =>
    `Alle partners hebben gereageerd op ${referenceNumber} (${customerName})`,

  bureau_item_pricing: (itemName: string, customerName: string) =>
    `Prijs invullen: "${itemName}" voor ${customerName}`,

  accommodation_selected: (accommodationName: string, customerName: string) =>
    `Logies "${accommodationName}" gekozen door ${customerName}`,

  new_program_request: (customerName: string) =>
    `Nieuwe programma-aanvraag: ${customerName} — programma samenstellen`,

  quote_ready_to_send: (customerName: string) =>
    `Alle onderdelen akkoord: ${customerName} — controleer en vraag ondertekening`,

  send_items_to_partners: (customerName: string) =>
    `Akkoord ontvangen: ${customerName} — stuur de onderdelen naar de partners`,

  partner_status_update: (partnerName: string, activityName: string, status: string) =>
    `Partner ${partnerName} reageert op "${activityName}" — ${status}`,

  forward_accommodation_quote: (partnerName: string, customerName: string) =>
    `Logiesofferte ${partnerName} klaar — doorsturen naar ${customerName}`,

  quote_expiring_soon: (customerName: string, daysLeft: number) =>
    `Offerte ${customerName} verloopt over ${daysLeft} dagen`,

  quote_expired: (customerName: string) =>
    `Offerte ${customerName} is verlopen — nieuw voorstel of verlengen`,

  customer_counter_proposal: (customerName: string, activityName: string) =>
    `Tegenvoorstel: ${customerName} voor "${activityName}" — beoordelen`,
};

/** Bedragen in taaktitels: Nederlandse notatie (€ 1.234,50). */
function formatEuroNL(amount: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(
    Number.isFinite(amount) ? amount : 0,
  );
}

/**
 * Label en kleur per taaksoort voor de Werkbank (OrphanTodoPanel,
 * ProjectDetailPanel) en de drempel-editor in Instellingen. Labels zijn kort,
 * Nederlands en zeggen wat de taak ís, niet wat de sleutel heet.
 */
export const autoTodoTypeConfig: Record<AutoTodoType, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  // aanvragen en offerte
  new_program_request: { label: "Nieuwe aanvraag", color: "text-blue-700", bgColor: "bg-blue-100" },
  new_accommodation_request: { label: "Nieuwe logiesaanvraag", color: "text-teal-700", bgColor: "bg-teal-100" },
  quote_ready_to_send: { label: "Alle onderdelen akkoord", color: "text-emerald-700", bgColor: "bg-emerald-100" },
  send_items_to_partners: { label: "Naar partners sturen", color: "text-indigo-700", bgColor: "bg-indigo-100" },
  bureau_item_pricing: { label: "Prijs invullen", color: "text-cyan-700", bgColor: "bg-cyan-100" },
  book_ferry_tickets: { label: "Boot boeken", color: "text-cyan-700", bgColor: "bg-cyan-100" },
  all_partners_responded: { label: "Alle reacties binnen", color: "text-green-700", bgColor: "bg-green-100" },
  partner_reminder: { label: "Partner reageert niet", color: "text-orange-700", bgColor: "bg-orange-100" },
  partner_status_update: { label: "Reactie partner", color: "text-amber-700", bgColor: "bg-amber-100" },
  availability_conflict: { label: "Beschikbaarheidsconflict", color: "text-amber-700", bgColor: "bg-amber-100" },
  stale_pending_change: { label: "Wijziging niet gepubliceerd", color: "text-amber-700", bgColor: "bg-amber-100" },
  people_change_notify_failed: { label: "Partnermail mislukt", color: "text-red-700", bgColor: "bg-red-100" },
  customer_date_change_partner_notify: { label: "Klant wijzigde data", color: "text-amber-700", bgColor: "bg-amber-100" },
  customer_practical_info_updated: { label: "Praktische info gewijzigd", color: "text-sky-700", bgColor: "bg-sky-100" },
  customer_accommodation_setup_changed: { label: "Klant wijzigde kamers", color: "text-teal-700", bgColor: "bg-teal-100" },
  customer_counter_proposal: { label: "Tegenvoorstel klant", color: "text-purple-700", bgColor: "bg-purple-100" },

  // klant: akkoord, voorwaarden, gegevens
  terms_reminder: { label: "Akkoord en ondertekening", color: "text-purple-700", bgColor: "bg-purple-100" },
  quote_expiring_soon: { label: "Voorstel verloopt binnenkort", color: "text-red-700", bgColor: "bg-red-100" },
  quote_expired: { label: "Voorstel verlopen", color: "text-red-700", bgColor: "bg-red-100" },
  customer_status_update_due: { label: "Status-mail aan klant", color: "text-orange-700", bgColor: "bg-orange-100" },
  customer_inputs_missing: { label: "Gegevens klant ontbreken", color: "text-orange-700", bgColor: "bg-orange-100" },
  customer_billing_missing: { label: "Facturatiegegevens ontbreken", color: "text-orange-700", bgColor: "bg-orange-100" },
  customer_terms_missing: { label: "Ondertekening ontbreekt", color: "text-orange-700", bgColor: "bg-orange-100" },
  request_no_response: { label: "Inactieve aanvraag", color: "text-red-700", bgColor: "bg-red-100" },
  customer_cancellation: { label: "Annulering klant", color: "text-red-700", bgColor: "bg-red-100" },

  // logies
  quote_review: { label: "Logiesofferte beoordelen", color: "text-teal-700", bgColor: "bg-teal-100" },
  quote_headcount_review: { label: "Nieuw aantal logies beoordelen", color: "text-teal-700", bgColor: "bg-teal-100" },
  quote_headcount_pending_partner: { label: "Aantal logies wacht op partner", color: "text-orange-700", bgColor: "bg-orange-100" },
  quote_pending_partner: { label: "Logiesofferte wacht op partner", color: "text-orange-700", bgColor: "bg-orange-100" },
  quote_pending_customer: { label: "Logieskeuze wacht op klant", color: "text-indigo-700", bgColor: "bg-indigo-100" },
  quote_expired_partner: { label: "Logiesofferte verlopen", color: "text-red-700", bgColor: "bg-red-100" },
  accommodation_quote_declined: { label: "Logies afgewezen", color: "text-red-700", bgColor: "bg-red-100" },
  accommodation_alternative_dates: { label: "Logies: andere data", color: "text-amber-700", bgColor: "bg-amber-100" },
  accommodation_selected: { label: "Logies gekozen", color: "text-teal-700", bgColor: "bg-teal-100" },
  forward_accommodation_quote: { label: "Logiesofferte doorsturen", color: "text-teal-700", bgColor: "bg-teal-100" },
  lodging_board_missing: { label: "Verzorging ontbreekt", color: "text-teal-700", bgColor: "bg-teal-100" },

  // facturen en commissie
  invoicing_ready: { label: "Facturatie", color: "text-green-700", bgColor: "bg-green-100" },
  bureau_invoice_pending: { label: "Verkoopfactuur klaarzetten", color: "text-green-700", bgColor: "bg-green-100" },
  purchase_invoice_inbox: { label: "Factuur in Inkoop-inbox", color: "text-blue-700", bgColor: "bg-blue-100" },
  purchase_invoice_pending: { label: "Inkoopfactuur verwerken", color: "text-blue-700", bgColor: "bg-blue-100" },
  commission_pending: { label: "Commissie factureren", color: "text-blue-700", bgColor: "bg-blue-100" },
  commission_missing_invoice: { label: "Factuur partner ontbreekt", color: "text-rose-700", bgColor: "bg-rose-100" },
  commission_unlinked_invoice: { label: "Factuur niet gekoppeld", color: "text-rose-700", bgColor: "bg-rose-100" },
  commission_invoice_lost: { label: "Factuurkoppeling verloren", color: "text-rose-700", bgColor: "bg-rose-100" },
  commission_ready_to_invoice: { label: "Commissie klaar", color: "text-blue-700", bgColor: "bg-blue-100" },
  accommodation_commission_ready: { label: "Logiescommissie klaar", color: "text-blue-700", bgColor: "bg-blue-100" },
  partner_post_charge: { label: "Nacalculatie partner", color: "text-blue-700", bgColor: "bg-blue-100" },

  // na uitvoering, reviews, referenties
  customer_aftersales: { label: "Aftersales / review", color: "text-pink-700", bgColor: "bg-pink-100" },
  customer_review_low: { label: "Lage beoordeling", color: "text-red-700", bgColor: "bg-red-100" },
  reference_case_approved: { label: "Referentie akkoord", color: "text-emerald-700", bgColor: "bg-emerald-100" },
  reference_case_feedback: { label: "Referentie: wens klant", color: "text-amber-700", bgColor: "bg-amber-100" },

  // binnengekomen (plan-notificaties fase 2)
  inbound_email: { label: "Binnengekomen mail", color: "text-emerald-700", bgColor: "bg-emerald-100" },
  sales_inbox: { label: "Sales Inbox", color: "text-emerald-700", bgColor: "bg-emerald-100" },
  commission_invoice_reply: { label: "Antwoord op factuurverzoek", color: "text-emerald-700", bgColor: "bg-emerald-100" },
  partner_item_executed: { label: "Partner: uitgevoerd", color: "text-emerald-700", bgColor: "bg-emerald-100" },
  customer_quote_accepted: { label: "Klant akkoord", color: "text-emerald-700", bgColor: "bg-emerald-100" },
  customer_terms_signed: { label: "Klant getekend", color: "text-emerald-700", bgColor: "bg-emerald-100" },
  wedding_referral_claim: { label: "Doorverwijzing: al bekend", color: "text-emerald-700", bgColor: "bg-emerald-100" },
  partner_agreement_accepted: { label: "Partnerafspraak akkoord", color: "text-emerald-700", bgColor: "bg-emerald-100" },

  // systeem
  system_cron_failure: { label: "Systeem: taak draait niet", color: "text-slate-700", bgColor: "bg-slate-100" },
  email_webhook_silent: { label: "Systeem: mailstatus stil", color: "text-slate-700", bgColor: "bg-slate-100" },
  email_undeliverable: { label: "Mail niet afgeleverd", color: "text-slate-700", bgColor: "bg-slate-100" },
  critical_selftest_failure: { label: "Systeem: zelftest faalt", color: "text-slate-700", bgColor: "bg-slate-100" },
};

/**
 * Nederlands label voor een auto_type; onbekende of handmatige sleutels
 * vallen terug op de sleutel zelf (beter dan niets, en zichtbaar als gat).
 */
export function autoTodoLabel(autoType: string | null | undefined): string | null {
  if (!autoType) return null;
  return (autoTodoTypeConfig as Record<string, { label: string }>)[autoType]?.label ?? autoType;
}

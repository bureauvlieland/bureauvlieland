/**
 * Project activity & cooldown — bepaalt of er recent contact is geweest in een
 * dossier, zodat de Werkbank-inbox kan dempen wat anders ruis wordt.
 *
 * Bronnen voor "laatste contact" (max van):
 *   - email_log.created_at  (uitgaande mails, al opgehaald in getProject.ts)
 *   - project_communications.created_at (inbound + outbound + chat-log)
 *   - program_request_items.updated_at  (partner/klant statuswijzigingen)
 *
 * De drempels zijn bewust constants en niet via app_settings; eerst valideren
 * in de praktijk.
 */

export const HOT_DAYS = 2;
export const WARM_DAYS = 7;

export type CooldownLevel = "hot" | "warm" | "cold";

export interface ProjectActivity {
  lastContactAt: string | null;
  daysSinceContact: number | null;
  cooldown: CooldownLevel;
}

export function getProjectActivityState(
  lastContactAt: string | null | undefined,
  now: Date = new Date(),
): ProjectActivity {
  if (!lastContactAt) {
    return { lastContactAt: null, daysSinceContact: null, cooldown: "cold" };
  }
  const t = new Date(lastContactAt).getTime();
  if (Number.isNaN(t)) {
    return { lastContactAt: null, daysSinceContact: null, cooldown: "cold" };
  }
  const days = (now.getTime() - t) / 86_400_000;
  const cooldown: CooldownLevel =
    days <= HOT_DAYS ? "hot" : days <= WARM_DAYS ? "warm" : "cold";
  return {
    lastContactAt: new Date(t).toISOString(),
    daysSinceContact: days,
    cooldown,
  };
}

/**
 * Cluster-mapping voor auto_types — DB blijft granulair, maar de inbox toont
 * per dossier maximaal 1 rij per cluster.
 */
export type TodoCluster =
  | "next_action_bureau"
  | "awaiting_partner"
  | "awaiting_customer"
  | "post_execution"
  | "inbound"
  | "other";

const CLUSTER_MAP: Record<string, TodoCluster> = {
  // bureau next action
  new_request_received: "next_action_bureau",
  new_program_request: "next_action_bureau",
  new_accommodation_request: "next_action_bureau",
  quote_ready_to_send: "next_action_bureau",
  send_items_to_partners: "next_action_bureau",
  bureau_item_pricing: "next_action_bureau",
  forward_accommodation_quote: "next_action_bureau",
  invoicing_ready: "next_action_bureau",

  // awaiting partner
  quote_pending_partner: "awaiting_partner",
  partner_reminder: "awaiting_partner",
  quote_expiring_soon: "awaiting_partner",
  quote_expired_partner: "awaiting_partner",
  accommodation_quote_declined: "awaiting_partner",

  // awaiting customer
  quote_pending_customer: "awaiting_customer",
  terms_reminder: "awaiting_customer",
  request_no_response: "awaiting_customer",
  customer_inputs_missing: "awaiting_customer",
  customer_status_email_due: "awaiting_customer",
  customer_status_update_due: "awaiting_customer",
  customer_counter_proposal: "awaiting_customer",
  customer_cancellation: "awaiting_customer",

  // post execution
  post_execution_feedback: "post_execution",
  post_execution_invoice_check: "post_execution",
  customer_aftersales: "post_execution",
  commission_pending: "post_execution",
  commission_ready_to_invoice: "post_execution",
  accommodation_commission_ready: "post_execution",

  // inbound
  inbound_email: "inbound",
  sales_inbox: "inbound",
  purchase_invoice_inbox: "inbound",
  purchase_invoice_pending: "inbound",
  quote_review: "inbound",
  partner_status_update: "inbound",
  accommodation_selected: "inbound",
  all_partners_responded: "inbound",
};

export function clusterForAutoType(autoType: string | null | undefined): TodoCluster {
  if (!autoType) return "other";
  return CLUSTER_MAP[autoType] ?? "other";
}

export const CLUSTER_META: Record<
  TodoCluster,
  { label: string; tone: string; order: number }
> = {
  next_action_bureau: { label: "Aan zet",          tone: "text-blue-700",    order: 1 },
  awaiting_partner:   { label: "Wacht op partner", tone: "text-sky-700",     order: 3 },
  awaiting_customer:  { label: "Wacht op klant",   tone: "text-orange-700",  order: 4 },
  inbound:            { label: "Inbound",          tone: "text-emerald-700", order: 2 },
  post_execution:     { label: "Na uitvoering",    tone: "text-violet-700",  order: 5 },
  other:              { label: "Overig",           tone: "text-muted-foreground", order: 6 },
};

/**
 * Mag deze todo door de cooldown-filter heen? Urgent / hoge prio + harde
 * deadlines blijven altijd zichtbaar, ook in "hot".
 */
export function shouldShowDuringCooldown(
  cooldown: CooldownLevel,
  todo: { priority?: string | null; auto_type?: string | null; due_date?: string | null },
  now: Date = new Date(),
): boolean {
  if (cooldown === "cold") return true;
  const prio = todo.priority ?? "normal";
  if (prio === "urgent") return true;

  // harde deadline-typen blijven altijd door
  const hardTypes = new Set([
    "quote_expired_partner",
    "customer_cancellation",
    "purchase_invoice_inbox",
    "purchase_invoice_pending",
    "sales_inbox",
    "inbound_email",
  ]);
  if (todo.auto_type && hardTypes.has(todo.auto_type)) return true;

  // due_date overschreden = altijd door
  if (todo.due_date) {
    const due = new Date(todo.due_date).getTime();
    if (!Number.isNaN(due) && due <= now.getTime()) return true;
  }

  if (cooldown === "hot") {
    // alleen high+ door in hot
    return prio === "high";
  }
  // warm: high blijft door, normal/low wordt onderdrukt
  return prio === "high";
}

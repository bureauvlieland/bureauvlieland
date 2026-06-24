// Shared project activity / cooldown helper — gespiegeld vanuit
// src/lib/projectActivity.ts (Deno kan src/ niet importeren).
//
// Bepaalt het laatste contact-moment per project en geeft een cooldown-level
// terug. Gebruikt door check-pending-items (om nieuwe reminders te dempen na
// recent contact) en reconcile-admin-todos (om reminders die ouder zijn dan
// het laatste contact als "superseded_by_contact" te sluiten).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const HOT_DAYS = 2;
export const WARM_DAYS = 7;

export type CooldownLevel = "hot" | "warm" | "cold";

export type SupabaseClient = ReturnType<typeof createClient>;

export interface ProjectActivity {
  lastContactAt: string | null;
  cooldown: CooldownLevel;
}

export function cooldownFor(lastContactAt: string | null | undefined, now = new Date()): CooldownLevel {
  if (!lastContactAt) return "cold";
  const t = new Date(lastContactAt).getTime();
  if (Number.isNaN(t)) return "cold";
  const days = (now.getTime() - t) / 86_400_000;
  if (days <= HOT_DAYS) return "hot";
  if (days <= WARM_DAYS) return "warm";
  return "cold";
}

/**
 * Haal laatste contact-moment op voor een set van program_requests in één
 * batch. Combineert email_log, project_communications en
 * program_request_items.updated_at.
 */
export async function fetchLastContactByProject(
  supabase: SupabaseClient,
  projectIds: string[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (projectIds.length === 0) return result;

  const update = (id: string | null | undefined, ts: string | null | undefined) => {
    if (!id || !ts) return;
    const prev = result.get(id);
    if (!prev || ts > prev) result.set(id, ts);
  };

  const [mailRes, commRes, itemRes] = await Promise.all([
    supabase
      .from("email_log")
      .select("related_request_id, created_at")
      .in("related_request_id", projectIds)
      .order("created_at", { ascending: false })
      .limit(2000),
    supabase
      .from("project_communications")
      .select("request_id, created_at")
      .in("request_id", projectIds)
      .order("created_at", { ascending: false })
      .limit(2000),
    supabase
      .from("program_request_items")
      .select("request_id, updated_at")
      .in("request_id", projectIds)
      .order("updated_at", { ascending: false })
      .limit(2000),
  ]);

  for (const r of (mailRes.data ?? []) as any[]) update(r.related_request_id, r.created_at);
  for (const r of (commRes.data ?? []) as any[]) update(r.request_id, r.created_at);
  for (const r of (itemRes.data ?? []) as any[]) update(r.request_id, r.updated_at);

  return result;
}

/** Reminder-todo types die door cooldown gedempt mogen worden. */
export const REMINDER_TYPES_GUARDED_BY_COOLDOWN: ReadonlySet<string> = new Set([
  "partner_reminder",
  "quote_pending_partner",
  "quote_pending_customer",
  "request_no_response",
  "customer_status_email_due",
  "customer_status_update_due",
  "quote_expiring_soon",
  "terms_reminder",
]);

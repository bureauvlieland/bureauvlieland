/**
 * Werkbank Inbox aggregator.
 *
 * Verzamelt alle "iets vraagt aandacht"-signalen en groepeert ze per project,
 * zodat de Inbox-tab één rij per dossier toont in plaats van losse to-do's.
 * Losse taken zonder project worden per soort+titel samengevouwen.
 *
 * Bronnen:
 *   - admin_todos (open of in_progress, niet gesnoozed in de toekomst)
 *   - projecten met communicatiestatus = "bij_bureau" of "stilte"
 *   - gesprekken die op antwoord wachten (onbeantwoorde e-mail, ongelezen
 *     chat) uit openConversations.ts, dezelfde bron als de bel en de zijbalk
 *
 * Demping op recent contact:
 *   - Per dossier wordt het laatste contact-moment bepaald (email_log via
 *     ProjectSummary.updatedAt-proxy + project_communications). Bij "hot"
 *     (≤2 d) en "warm" (≤7 d) worden niet-urgente reminders verborgen, maar
 *     niet uit de DB verwijderd — alleen de inbox-weergave is rustiger.
 *
 * De opbouw zelf staat in inboxAssemble.ts (zuiver, getest); dit bestand
 * doet alleen het ophalen.
 */

import { supabase } from "@/integrations/supabase/client";
import { listProjectsForWerkbank } from "./getProject";
import { assembleInbox, type InboxItem, type OpenConversationSignal, type RawInboxTodo } from "./inboxAssemble";
import { fetchOpenConversations } from "./openConversations";
import type { CooldownLevel, TodoCluster } from "./projectActivity";

export type {
  InboxItem,
  InboxItemKind,
  InboxReason,
  InboxTodo,
  OpenConversationSignal,
} from "./inboxAssemble";
export {
  isLooseRowId,
  isSystemTodo,
  looseRowId,
  todoIdFromLooseRowId,
} from "./inboxAssemble";

export async function loadInbox(opts: { includeSnoozed?: boolean } = {}): Promise<InboxItem[]> {
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: todos, error: todoErr }, projects, openConversations] = await Promise.all([
    supabase
      .from("admin_todos")
      .select("id, title, priority, due_date, auto_type, related_request_id, snoozed_until, created_at")
      .not("status", "in", "(done,dismissed)")
      .or(`snoozed_until.is.null,snoozed_until.lte.${today}`)
      .order("priority", { ascending: false })
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(300),
    listProjectsForWerkbank({ includeSnoozed: opts.includeSnoozed }),
    fetchOpenConversations(),
  ]);
  if (todoErr) throw todoErr;

  const openSignals: OpenConversationSignal[] = [];
  for (const e of openConversations.emails) {
    if (!e.projectId) continue;
    openSignals.push({
      projectId: e.projectId,
      kind: "email",
      count: e.count,
      since: e.oldestAt,
      label: `E-mail van ${e.contactName || "onbekende afzender"}`,
      href: `/admin/berichten?inbox=${e.firstUnansweredId}`,
    });
  }
  for (const c of openConversations.chats) {
    if (!c.projectId) continue;
    openSignals.push({
      projectId: c.projectId,
      kind: "chat",
      count: c.unreadCount,
      since: c.lastMessageAt,
      label: `Chat van ${c.visitorName || "onbekend"}`,
      href: `/admin/berichten?gesprek=chat:${c.conversationId}`,
    });
  }

  // Laatste contact-moment per project: max(project_communications.created_at,
  // program_request_items.updated_at). email_log is al gebruikt voor
  // last_outbound_at in ProjectSummary.updatedAt-pad — we vouwen alles samen.
  const projectIds = projects.map((p) => p.id);
  const lastContactByProject = new Map<string, string>();
  if (projectIds.length) {
    const [commRes, itemRes] = await Promise.all([
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
    for (const c of commRes.data ?? []) {
      if (!c.request_id) continue;
      const prev = lastContactByProject.get(c.request_id);
      if (!prev || c.created_at > prev) lastContactByProject.set(c.request_id, c.created_at);
    }
    for (const i of itemRes.data ?? []) {
      if (!i.request_id || !i.updated_at) continue;
      const prev = lastContactByProject.get(i.request_id);
      if (!prev || i.updated_at > prev) lastContactByProject.set(i.request_id, i.updated_at);
    }
  }

  return assembleInbox({
    todos: (todos ?? []) as RawInboxTodo[],
    projects,
    lastContactByProject,
    today,
    openConversations: openSignals,
  });
}

export type { CooldownLevel, TodoCluster };

/**
 * Werkbank Inbox aggregator.
 *
 * Verzamelt alle "iets vraagt aandacht"-signalen en groepeert ze per project,
 * zodat de Inbox-tab één rij per dossier toont in plaats van losse to-do's.
 *
 * Bronnen:
 *   - admin_todos (open of in_progress, niet gesnoozed in de toekomst)
 *   - projecten met communicatiestatus = "bij_bureau" of "stilte"
 *
 * Demping op recent contact:
 *   - Per dossier wordt het laatste contact-moment bepaald (email_log via
 *     ProjectSummary.updatedAt-proxy + project_communications). Bij "hot"
 *     (≤2 d) en "warm" (≤7 d) worden niet-urgente reminders verborgen, maar
 *     niet uit de DB verwijderd — alleen de inbox-weergave is rustiger.
 */

import { supabase } from "@/integrations/supabase/client";
import {
  listProjectsForWerkbank,
  type ProjectSummary,
} from "./getProject";
import type { ProjectCommunicationState } from "./projectCommunication";
import {
  clusterForAutoType,
  getProjectActivityState,
  shouldShowDuringCooldown,
  type CooldownLevel,
  type ProjectActivity,
  type TodoCluster,
} from "./projectActivity";

export type InboxReason =
  | "todo"
  | "bij_bureau"
  | "stilte";

export interface InboxTodo {
  id: string;
  title: string;
  priority: "low" | "normal" | "high" | "urgent";
  due_date: string | null;
  auto_type: string | null;
  cluster: TodoCluster;
  /** Wordt deze todo onderdrukt door de dossier-cooldown? */
  suppressed: boolean;
}

export interface InboxItem {
  projectId: string;
  project: ProjectSummary | null;            // null betekent: todo zonder gekoppeld project
  todos: InboxTodo[];                        // alleen zichtbare todos (gefilterd op cooldown)
  suppressedCount: number;                   // hoeveel todos onderdrukt door cooldown
  reasons: InboxReason[];
  comm: ProjectCommunicationState | null;
  activity: ProjectActivity;
  /** sorteer-score, hoog = belangrijker */
  score: number;
}

export async function loadInbox(opts: { includeSnoozed?: boolean } = {}): Promise<InboxItem[]> {
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: todos, error: todoErr }, projects] = await Promise.all([
    supabase
      .from("admin_todos")
      .select("id, title, priority, due_date, auto_type, related_request_id, snoozed_until")
      .not("status", "in", "(done,dismissed)")
      .or(`snoozed_until.is.null,snoozed_until.lte.${today}`)
      .order("priority", { ascending: false })
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(300),
    listProjectsForWerkbank({ includeSnoozed: opts.includeSnoozed }),
  ]);
  if (todoErr) throw todoErr;

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

  const projectById = new Map(projects.map((p) => [p.id, p]));
  const items = new Map<string, InboxItem>();

  const ensure = (projectId: string): InboxItem => {
    const existing = items.get(projectId);
    if (existing) return existing;
    const project = projectById.get(projectId) ?? null;
    const fallbackContact =
      lastContactByProject.get(projectId) ?? project?.updatedAt ?? null;
    const activity = getProjectActivityState(fallbackContact);
    const fresh: InboxItem = {
      projectId,
      project,
      todos: [],
      suppressedCount: 0,
      reasons: [],
      comm: project?.comm ?? null,
      activity,
      score: 0,
    };
    items.set(projectId, fresh);
    return fresh;
  };

  // Todos
  for (const t of todos ?? []) {
    const relatedId = t.related_request_id;
    // Verberg todo's die hangen aan een project dat niet meer in de actieve werklijst staat
    // (geannuleerd of verwijderd). Echte losse taken (geen related_request_id) blijven zichtbaar.
    if (relatedId && !projectById.has(relatedId)) continue;

    const projectId = relatedId ?? `_orphan_${t.id}`;
    const item = ensure(projectId);
    const priority = (t.priority ?? "normal") as InboxTodo["priority"];
    const cluster = clusterForAutoType(t.auto_type);
    const visible = shouldShowDuringCooldown(item.activity.cooldown, {
      priority,
      auto_type: t.auto_type,
      due_date: t.due_date,
    });
    if (!visible) {
      item.suppressedCount += 1;
      continue;
    }

    item.todos.push({
      id: t.id,
      title: t.title,
      priority,
      due_date: t.due_date,
      auto_type: t.auto_type,
      cluster,
      suppressed: false,
    });
    if (!item.reasons.includes("todo")) item.reasons.push("todo");

    const prioScore =
      priority === "urgent" ? 40
      : priority === "high" ? 25
      : priority === "normal" ? 10
      : 5;
    item.score += prioScore;
    if (t.due_date && t.due_date <= today) item.score += 15;
  }

  // Communicatiestatus-driven items
  for (const project of projects) {
    if (project.comm === "bij_bureau" || project.comm === "stilte") {
      const item = ensure(project.id);
      item.project = project;
      item.comm = project.comm;

      // In "hot" cooldown dempen we ook de status-driven rij, tenzij er nog
      // zichtbare todos onder hangen of urgent werk is. Dat geeft écht rust
      // voor projecten waar net contact mee was.
      if (item.activity.cooldown === "hot" && item.todos.length === 0) {
        // niet als reason toevoegen, item blijft alleen bestaan als er todos
        // waren — anders skippen we het hele dossier.
        continue;
      }

      const reason: InboxReason = project.comm === "stilte" ? "stilte" : "bij_bureau";
      if (!item.reasons.includes(reason)) item.reasons.push(reason);
      item.score += project.comm === "stilte" ? 30 : 12;
    }
  }

  // Filter dossiers waar in "hot" niets zichtbaars over bleef.
  const result = Array.from(items.values()).filter((it) => {
    if (it.reasons.length > 0) return true;
    // hot-only suppression: alleen tellen "+N onderdrukte taken" zien we niet
    // los — dossier verdwijnt volledig uit de inbox tot het warmer wordt.
    return false;
  });

  return result.sort((a, b) => b.score - a.score);
}

export type { CooldownLevel, TodoCluster };

/**
 * Werkbank Inbox aggregator.
 *
 * Verzamelt alle "iets vraagt aandacht"-signalen en groepeert ze per project,
 * zodat de Inbox-tab één rij per dossier toont in plaats van losse to-do's.
 *
 * Bronnen:
 *   - admin_todos (open of in_progress, niet gesnoozed in de toekomst)
 *   - projecten met communicatiestatus = "bij_bureau" of "stilte"
 */

import { supabase } from "@/integrations/supabase/client";
import {
  listProjectsForWerkbank,
  type ProjectSummary,
} from "./getProject";
import type { ProjectCommunicationState } from "./projectCommunication";

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
}

export interface InboxItem {
  projectId: string;
  project: ProjectSummary | null;            // null betekent: todo zonder gekoppeld project
  todos: InboxTodo[];
  reasons: InboxReason[];
  comm: ProjectCommunicationState | null;
  /** sorteer-score, hoog = belangrijker */
  score: number;
}

export async function loadInbox(): Promise<InboxItem[]> {
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
    listProjectsForWerkbank(),
  ]);
  if (todoErr) throw todoErr;

  const projectById = new Map(projects.map((p) => [p.id, p]));
  const items = new Map<string, InboxItem>();

  const ensure = (projectId: string): InboxItem => {
    const existing = items.get(projectId);
    if (existing) return existing;
    const project = projectById.get(projectId) ?? null;
    const fresh: InboxItem = {
      projectId,
      project,
      todos: [],
      reasons: [],
      comm: project?.comm ?? null,
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
    item.todos.push({
      id: t.id,
      title: t.title,
      priority,
      due_date: t.due_date,
      auto_type: t.auto_type,
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
      const reason: InboxReason = project.comm === "stilte" ? "stilte" : "bij_bureau";
      if (!item.reasons.includes(reason)) item.reasons.push(reason);
      item.score += project.comm === "stilte" ? 30 : 12;
    }
  }

  return Array.from(items.values()).sort((a, b) => b.score - a.score);
}

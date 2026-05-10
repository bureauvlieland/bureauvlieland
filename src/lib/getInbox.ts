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
      .neq("status", "done")
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
    const projectId = (t as any).related_request_id ?? `_orphan_${(t as any).id}`;
    const item = ensure(projectId);
    item.todos.push({
      id: (t as any).id,
      title: (t as any).title,
      priority: (t as any).priority,
      due_date: (t as any).due_date,
      auto_type: (t as any).auto_type,
    });
    if (!item.reasons.includes("todo")) item.reasons.push("todo");

    const prioScore =
      (t as any).priority === "urgent" ? 40
      : (t as any).priority === "high" ? 25
      : (t as any).priority === "normal" ? 10
      : 5;
    item.score += prioScore;
    if ((t as any).due_date && (t as any).due_date <= today) item.score += 15;
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

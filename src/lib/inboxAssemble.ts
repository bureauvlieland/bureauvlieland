/**
 * Zuivere opbouw van de Werkbank-inbox (geen Supabase-import, dus testbaar).
 *
 * Twee soorten rijen:
 *   - "project":  één rij per dossier, met daaronder de zichtbare todo's;
 *   - "loose":    losse taken zonder project. Identieke auto-taken (zelfde
 *                 auto_type én titel) worden samengevouwen tot één rij, zodat
 *                 zes keer "Kritieke zelftest faalt" niet zes regels kost.
 *
 * Sinds Berichtencentrum fase 1 komt "te beantwoorden" hier ook binnen:
 * een dossier met een onbeantwoorde e-mail of een ongelezen chat krijgt de
 * reden "te_beantwoorden" en een link naar het Berichtencentrum. Dat is
 * dezelfde bron als de bel en de zijbalk (src/lib/openConversations.ts);
 * er wordt geen aparte todo meer voor aangemaakt.
 *
 * Demping op recent contact (zie getInbox.ts) blijft hier ongewijzigd en
 * geldt niet voor "te beantwoorden": wie net schreef, wacht op antwoord.
 */

import type { ProjectSummary } from "./getProject";
import type { ProjectCommunicationState } from "./projectCommunication";
import {
  clusterForAutoType,
  getProjectActivityState,
  shouldShowDuringCooldown,
  type ProjectActivity,
  type TodoCluster,
} from "./projectActivity";

export type InboxReason = "todo" | "bij_bureau" | "stilte" | "te_beantwoorden";

export type InboxItemKind = "project" | "loose";

export interface InboxTodo {
  id: string;
  title: string;
  priority: "low" | "normal" | "high" | "urgent";
  due_date: string | null;
  auto_type: string | null;
  created_at: string | null;
  cluster: TodoCluster;
  /** Wordt deze todo onderdrukt door de dossier-cooldown? */
  suppressed: boolean;
}

/** Een gesprek dat op antwoord wacht, aan een dossier gehangen. */
export interface OpenConversationSignal {
  projectId: string;
  kind: "email" | "chat";
  /** aantal open berichten in dit gesprek */
  count: number;
  /** sinds wanneer er gewacht wordt (ISO) */
  since: string;
  /** "E-mail van Richard Dijkstra" */
  label: string;
  /** link naar het gesprek in het Berichtencentrum */
  href: string;
}

export interface InboxItem {
  /**
   * Rij-sleutel. Voor dossiers het project-id; voor losse taken
   * `_orphan_<id van de eerste taak in de groep>`, zodat bestaande
   * `?id=_orphan_…`-links blijven werken.
   */
  projectId: string;
  kind: InboxItemKind;
  project: ProjectSummary | null;            // null betekent: losse taak zonder project
  todos: InboxTodo[];                        // zichtbare todos (bij "loose": alle taken in de groep)
  suppressedCount: number;                   // hoeveel todos onderdrukt door cooldown
  reasons: InboxReason[];
  /** gesprekken die op antwoord wachten (e-mail en chat) */
  open: OpenConversationSignal[];
  comm: ProjectCommunicationState | null;
  activity: ProjectActivity;
  /** sorteer-score, hoog = belangrijker */
  score: number;
}

export interface RawInboxTodo {
  id: string;
  title: string;
  priority: string | null;
  due_date: string | null;
  auto_type: string | null;
  related_request_id: string | null;
  created_at?: string | null;
}

/** auto_types die geen klantwerk zijn maar een melding van het systeem zelf. */
export const SYSTEM_AUTO_TYPES = new Set<string>(["critical_selftest_failure"]);

export function isSystemTodo(todo: { auto_type: string | null }): boolean {
  return !!todo.auto_type && SYSTEM_AUTO_TYPES.has(todo.auto_type);
}

/**
 * Groepssleutel voor losse taken. Automatische taken met dezelfde soort én
 * titel horen bij elkaar; handmatige taken blijven elk een eigen rij.
 */
export function looseGroupKey(todo: { id: string; auto_type: string | null; title: string }): string {
  if (!todo.auto_type) return `id:${todo.id}`;
  return `${todo.auto_type}|${todo.title.trim().toLowerCase()}`;
}

export function isLooseRowId(rowId: string | null | undefined): boolean {
  return !!rowId && rowId.startsWith("_orphan_");
}

export function looseRowId(todoId: string): string {
  return `_orphan_${todoId}`;
}

export function todoIdFromLooseRowId(rowId: string): string {
  return rowId.replace(/^_orphan_/, "");
}

export interface AssembleInboxInput {
  todos: RawInboxTodo[];
  projects: ProjectSummary[];
  lastContactByProject: Map<string, string>;
  today: string;
  now?: Date;
  openConversations?: OpenConversationSignal[];
}

/** Een wachtend gesprek weegt zwaarder dan een hoge-prioriteittaak, lichter dan stilte. */
const OPEN_CONVERSATION_SCORE = 28;

const PRIO_SCORE: Record<InboxTodo["priority"], number> = {
  urgent: 40,
  high: 25,
  normal: 10,
  low: 5,
};

export function assembleInbox(input: AssembleInboxInput): InboxItem[] {
  const { todos, projects, lastContactByProject, today, openConversations = [] } = input;
  const now = input.now ?? new Date();

  const projectById = new Map(projects.map((p) => [p.id, p]));
  const items = new Map<string, InboxItem>();
  /** groepssleutel → rij-id van de losse taak die de groep vertegenwoordigt */
  const looseRows = new Map<string, string>();

  const ensure = (rowId: string, kind: InboxItemKind): InboxItem => {
    const existing = items.get(rowId);
    if (existing) return existing;
    const project = kind === "project" ? projectById.get(rowId) ?? null : null;
    const fallbackContact =
      lastContactByProject.get(rowId) ?? project?.updatedAt ?? null;
    const activity = getProjectActivityState(fallbackContact, now);
    const fresh: InboxItem = {
      projectId: rowId,
      kind,
      project,
      todos: [],
      suppressedCount: 0,
      reasons: [],
      open: [],
      comm: project?.comm ?? null,
      activity,
      score: 0,
    };
    items.set(rowId, fresh);
    return fresh;
  };

  // Todos
  for (const t of todos) {
    const relatedId = t.related_request_id;
    // Verberg todo's die hangen aan een project dat niet meer in de actieve werklijst staat
    // (geannuleerd of verwijderd). Echte losse taken (geen related_request_id) blijven zichtbaar.
    if (relatedId && !projectById.has(relatedId)) continue;

    let item: InboxItem;
    if (relatedId) {
      item = ensure(relatedId, "project");
    } else {
      const key = looseGroupKey(t);
      let rowId = looseRows.get(key);
      if (!rowId) {
        rowId = looseRowId(t.id);
        looseRows.set(key, rowId);
      }
      item = ensure(rowId, "loose");
    }

    const priority = (t.priority ?? "normal") as InboxTodo["priority"];
    const cluster = clusterForAutoType(t.auto_type);
    const visible = shouldShowDuringCooldown(
      item.activity.cooldown,
      { priority, auto_type: t.auto_type, due_date: t.due_date },
      now,
    );
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
      created_at: t.created_at ?? null,
      cluster,
      suppressed: false,
    });
    if (!item.reasons.includes("todo")) item.reasons.push("todo");

    // Een groep identieke losse taken telt als één signaal: de score groeit
    // niet met het aantal duplicaten.
    if (item.kind === "loose" && item.todos.length > 1) continue;
    item.score += PRIO_SCORE[priority] ?? PRIO_SCORE.normal;
    if (t.due_date && t.due_date <= today) item.score += 15;
  }

  // Gesprekken die op antwoord wachten. Niet gedempt door cooldown: het
  // recente contact ís het bericht waar nog niet op gereageerd is.
  for (const sig of openConversations) {
    if (!projectById.has(sig.projectId)) continue;
    const item = ensure(sig.projectId, "project");
    item.open.push(sig);
    if (!item.reasons.includes("te_beantwoorden")) {
      item.reasons.push("te_beantwoorden");
      item.score += OPEN_CONVERSATION_SCORE;
    }
  }
  for (const item of items.values()) {
    item.open.sort((a, b) => a.since.localeCompare(b.since));
  }

  // Communicatiestatus-driven items
  for (const project of projects) {
    if (project.comm === "bij_bureau" || project.comm === "stilte") {
      const item = ensure(project.id, "project");
      item.project = project;
      item.comm = project.comm;

      // In "hot" cooldown dempen we ook de status-driven rij, tenzij er nog
      // zichtbare todos onder hangen of urgent werk is. Dat geeft écht rust
      // voor projecten waar net contact mee was.
      if (item.activity.cooldown === "hot" && item.todos.length === 0) {
        continue;
      }

      const reason: InboxReason = project.comm === "stilte" ? "stilte" : "bij_bureau";
      if (!item.reasons.includes(reason)) item.reasons.push(reason);
      item.score += project.comm === "stilte" ? 30 : 12;
    }
  }

  // Filter dossiers waar in "hot" niets zichtbaars over bleef.
  const result = Array.from(items.values()).filter((it) => it.reasons.length > 0);

  return result.sort((a, b) => b.score - a.score);
}

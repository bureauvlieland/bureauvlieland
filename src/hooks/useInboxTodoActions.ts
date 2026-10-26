/**
 * Acties op losse taken in de Werkbank-inbox: afronden, niet relevant,
 * snoozen en verwijderen — los of in bulk.
 *
 * De lijst reageert optimistisch (de rij verdwijnt meteen) en de toast biedt
 * "Ongedaan maken" voor alles wat omkeerbaar is. Verwijderen is definitief
 * en daarom alleen beschikbaar voor automatisch aangemaakte taken.
 */
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { InboxItem } from "@/lib/getInbox";

export type InboxTodoAction = "done" | "dismissed" | "snooze" | "delete";

export const SNOOZE_DAYS = 7;

function snoozeUntil(days = SNOOZE_DAYS): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function plural(n: number, one: string, many: string) {
  return n === 1 ? one : many;
}

export function useInboxTodoActions(opts: { onResolved?: (ids: string[]) => void } = {}) {
  const queryClient = useQueryClient();

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["werkbank-inbox"] });
    queryClient.invalidateQueries({ queryKey: ["werkbank-orphan-todo"] });
    queryClient.invalidateQueries({ queryKey: ["werkbank-finance-todos"] });
    queryClient.invalidateQueries({ queryKey: ["admin-todos"] });
    queryClient.invalidateQueries({ queryKey: ["admin-todo-count"] });
  }, [queryClient]);

  /** Haal de taken direct uit de gecachte inbox, nog vóór de server antwoordt. */
  const removeOptimistic = useCallback(
    (ids: string[]) => {
      const gone = new Set(ids);
      queryClient.setQueriesData<InboxItem[]>({ queryKey: ["werkbank-inbox"] }, (old) => {
        if (!old) return old;
        return old
          .map((item) => ({ ...item, todos: item.todos.filter((t) => !gone.has(t.id)) }))
          .filter((item) => {
            if (item.kind === "loose") return item.todos.length > 0;
            // Dossier blijft staan als er een andere reden is dan alleen taken.
            if (item.todos.length > 0) return true;
            return item.reasons.some((r) => r !== "todo");
          });
      });
    },
    [queryClient],
  );

  const run = useCallback(
    async (action: InboxTodoAction, ids: string[]) => {
      if (ids.length === 0) return false;
      removeOptimistic(ids);

      let error: { message: string } | null = null;
      let undo: (() => Promise<void>) | null = null;
      let title = "";

      if (action === "delete") {
        ({ error } = await supabase.from("admin_todos").delete().in("id", ids));
        title = `${ids.length} ${plural(ids.length, "taak", "taken")} verwijderd`;
      } else if (action === "snooze") {
        const until = snoozeUntil();
        ({ error } = await supabase.from("admin_todos").update({ snoozed_until: until }).in("id", ids));
        title = `${ids.length} ${plural(ids.length, "taak", "taken")} gesnoozed tot ${new Date(until).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}`;
        undo = async () => {
          await supabase.from("admin_todos").update({ snoozed_until: null }).in("id", ids);
        };
      } else {
        const patch: Record<string, unknown> = { status: action };
        if (action === "done") patch.completed_at = new Date().toISOString();
        ({ error } = await supabase.from("admin_todos").update(patch as never).in("id", ids));
        title =
          action === "done"
            ? `${ids.length} ${plural(ids.length, "taak", "taken")} opgepakt`
            : `${ids.length} ${plural(ids.length, "taak", "taken")} als niet relevant gemarkeerd`;
        undo = async () => {
          await supabase
            .from("admin_todos")
            .update({ status: "todo", completed_at: null } as never)
            .in("id", ids);
        };
      }

      if (error) {
        invalidate();
        toast.error("Kon taken niet bijwerken", { description: error.message });
        return false;
      }

      invalidate();
      opts.onResolved?.(ids);
      toast.success(title, {
        action: undo
          ? {
              label: "Ongedaan maken",
              onClick: () => {
                void undo!().then(invalidate);
              },
            }
          : undefined,
      });
      return true;
    },
    [invalidate, opts, removeOptimistic],
  );

  return { run };
}

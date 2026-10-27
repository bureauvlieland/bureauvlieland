import { useCallback, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { buildGroups, fetchEmails, type EmailItem, type ThreadGroup } from "@/lib/emailThreads";
import { planThreadArchive, stripSourcePrefix } from "@/lib/emailThreadArchive";

export const EMAIL_THREADS_KEY = ["admin-email-threads"] as const;

/**
 * E-mailgesprekken van het Berichtencentrum: data, live bijwerken en de
 * acties op een gesprek. Gehaald uit EmailPanel (fase 2). De groepen bevatten
 * ook gearchiveerde gesprekken en berichten; de lijst en de weergave kiezen
 * wat ze tonen.
 */
export function useEmailThreads(opts: { onThreadGone?: (key: string) => void } = {}) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: EMAIL_THREADS_KEY,
    queryFn: fetchEmails,
    refetchInterval: 60_000,
  });
  const { refetch } = query;

  // Live bijwerken, kort gedempt: één actie kan tientallen logregels geven.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const bump = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => refetch(), 800);
    };
    const ch = supabase
      .channel(`email-threads-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_communications" }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "email_log" }, bump)
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(ch);
    };
  }, [refetch]);

  const items = useMemo(() => query.data ?? [], [query.data]);
  const groups = useMemo(() => buildGroups(items, true, "all"), [items]);

  const invalidate = useCallback(() => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ["open-conversations"] });
    queryClient.invalidateQueries({ queryKey: ["werkbank-inbox"] });
  }, [refetch, queryClient]);

  const setAnswered = useCallback(
    async (item: EmailItem, answered: boolean) => {
      if (item.source !== "communication") return;
      const { error } = await supabase
        .from("project_communications")
        .update({ answered_at: answered ? new Date().toISOString() : null })
        .eq("id", stripSourcePrefix(item.id));
      if (error) toast.error("Kon status niet bijwerken");
      else {
        toast.success(answered ? "Gemarkeerd als beantwoord" : "Gemarkeerd als onbeantwoord");
        invalidate();
      }
    },
    [invalidate],
  );

  /** Markeer of ontmarkeer alle inkomende berichten van een gesprek. */
  const setThreadAnswered = useCallback(
    async (group: ThreadGroup, answered: boolean) => {
      const ids = group.items
        .filter((e) => e.source === "communication" && e.origin === "inbound")
        .filter((e) => (answered ? !e.answered_at : !!e.answered_at))
        .map((e) => stripSourcePrefix(e.id));
      if (!ids.length) return;
      const { error } = await supabase
        .from("project_communications")
        .update({ answered_at: answered ? new Date().toISOString() : null })
        .in("id", ids);
      if (error) toast.error("Kon status niet bijwerken");
      else {
        toast.success(answered ? "Gesprek afgehandeld" : "Gesprek weer open gezet");
        invalidate();
      }
    },
    [invalidate],
  );

  const archiveItem = useCallback(
    async (item: EmailItem, archived = true) => {
      if (item.source !== "communication") {
        toast.info("Automatische mails kun je niet los archiveren.");
        return;
      }
      const { error } = await supabase
        .from("project_communications")
        .update({ archived_at: archived ? new Date().toISOString() : null })
        .eq("id", stripSourcePrefix(item.id));
      if (error) toast.error("Archiveren mislukt");
      else {
        toast.success(archived ? "E-mail gearchiveerd" : "E-mail teruggehaald");
        invalidate();
      }
    },
    [invalidate],
  );

  /**
   * Archiveert uitsluitend het gesprek (de berichten). Het dossier blijft
   * actief in Projecten; dat archiveren is archiveDossier().
   */
  const archiveThread = useCallback(
    async (group: ThreadGroup, archived = true) => {
      const plan = planThreadArchive(group.items, archived);
      if (plan.noop) {
        toast.info("Dit gesprek bestaat alleen uit automatische mails en kan niet gearchiveerd worden.");
        return;
      }
      if (plan.ids.length) {
        const { error } = await supabase
          .from("project_communications")
          .update({ archived_at: plan.archivedAt })
          .in("id", plan.ids);
        if (error) {
          toast.error("Archiveren mislukt");
          return;
        }
      }
      toast.success(archived ? "Gesprek gearchiveerd" : "Gesprek teruggehaald");
      if (archived) opts.onThreadGone?.(group.key);
      invalidate();
    },
    [invalidate, opts],
  );

  /** Zware actie: archiveert het volledige dossier (project of logies). */
  const archiveDossier = useCallback(
    async (group: ThreadGroup, archived = true) => {
      if (!group.id || group.kind === "contact") return;
      const table = group.kind === "program" ? "program_requests" : "accommodation_requests";
      const { error } = await supabase
        .from(table)
        .update({ archived_at: archived ? new Date().toISOString() : null })
        .eq("id", group.id);
      if (error) {
        toast.error("Archiveren van het dossier mislukt");
        return;
      }
      toast.success(archived ? "Dossier gearchiveerd" : "Dossier teruggehaald");
      if (archived) opts.onThreadGone?.(group.key);
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["projects-overview"] });
    },
    [invalidate, opts, queryClient],
  );

  return {
    items,
    groups,
    isLoading: query.isLoading,
    refetch,
    invalidate,
    setAnswered,
    setThreadAnswered,
    archiveItem,
    archiveThread,
    archiveDossier,
  };
}

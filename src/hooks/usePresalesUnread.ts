import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PresalesUnread = {
  /** Totaal aantal ongelezen pre-sales berichten (badge op de Pre-sales tab). */
  messages: number;
  /** Ongelezen berichten in pre-sales gesprekken met widget/website-bron (live chat bucket). */
  widgetMessages: number;
  /** Aantal distinct pre-sales gesprekken met niet-widget bron (chat bucket, per gesprek geteld). */
  nonWidgetConversations: number;
};

const EMPTY: PresalesUnread = { messages: 0, widgetMessages: 0, nonWidgetConversations: 0 };

const isWidgetSource = (s: string | null | undefined) =>
  s === "website" || s === "widget" || s === "homepage";

/**
 * Telt ongelezen berichten in "pre-sales" gesprekken: website-vragen (floating
 * button) en WhatsApp-berichten die (nog) niet aan een programma- of
 * logies-aanvraag gekoppeld zijn.
 *
 * Levert de tellingen gesplitst per bucket zodat ze in dezelfde eenheid
 * afgetrokken kunnen worden als de inbox-tellers (chat = per gesprek,
 * live chat = per bericht).
 */
export function usePresalesUnread(): PresalesUnread {
  const queryClient = useQueryClient();

  const query = useQuery<PresalesUnread>({
    queryKey: ["presales-unread"],
    queryFn: async () => {
      const { data: convs, error: convErr } = await supabase
        .from("chat_conversations")
        .select("id, source, request_id, accommodation_request_id, accommodation_id, status, archived_at")
        .is("archived_at", null)
        .neq("status", "closed");
      if (convErr) throw convErr;

      const presales = (convs ?? []).filter(
        (c: any) => !c.request_id && !c.accommodation_request_id && !c.accommodation_id,
      );
      if (presales.length === 0) return EMPTY;

      const sourceById = new Map<string, string | null>(
        presales.map((c: any) => [c.id as string, (c.source ?? null) as string | null]),
      );

      const { data: msgs, error: msgErr } = await supabase
        .from("chat_messages")
        .select("id, conversation_id")
        .in("conversation_id", Array.from(sourceById.keys()))
        .neq("sender_type", "admin")
        .is("read_at", null);
      if (msgErr) throw msgErr;

      let widgetMessages = 0;
      const nonWidgetConvIds = new Set<string>();
      for (const m of msgs ?? []) {
        const convId = (m as any).conversation_id as string;
        if (isWidgetSource(sourceById.get(convId))) widgetMessages += 1;
        else nonWidgetConvIds.add(convId);
      }

      return {
        messages: (msgs ?? []).length,
        widgetMessages,
        nonWidgetConversations: nonWidgetConvIds.size,
      };
    },
    refetchInterval: 60_000,
  });

  useEffect(() => {
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ["presales-unread"] });
    const ch = supabase
      .channel(`presales-unread-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_conversations" }, invalidate)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [queryClient]);

  return query.data ?? EMPTY;
}

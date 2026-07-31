import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Telt ongelezen berichten in "pre-sales" gesprekken: website-vragen (floating
 * button) en WhatsApp-berichten die (nog) niet aan een programma- of
 * logies-aanvraag gekoppeld zijn.
 */
export function usePresalesUnread() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["presales-unread"],
    queryFn: async () => {
      const { data: convs, error: convErr } = await supabase
        .from("chat_conversations")
        .select("id, request_id, accommodation_request_id, accommodation_id, status, archived_at")
        .is("archived_at", null)
        .neq("status", "closed");
      if (convErr) throw convErr;

      const presalesIds = (convs ?? [])
        .filter((c: any) => !c.request_id && !c.accommodation_request_id && !c.accommodation_id)
        .map((c: any) => c.id as string);
      if (presalesIds.length === 0) return 0;

      const { data: msgs, error: msgErr } = await supabase
        .from("chat_messages")
        .select("id, conversation_id")
        .in("conversation_id", presalesIds)
        .neq("sender_type", "admin")
        .is("read_at", null);
      if (msgErr) throw msgErr;
      return (msgs ?? []).length;
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

  return query.data ?? 0;
}

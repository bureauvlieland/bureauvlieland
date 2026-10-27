import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EMPTY_OPEN_CONVERSATIONS, fetchOpenConversations, type OpenConversations } from "@/lib/openConversations";

export const OPEN_CONVERSATIONS_KEY = ["open-conversations"] as const;

/**
 * De ene teller voor "te beantwoorden": bel, zijbalk, tabbladen en Werkbank
 * lezen allemaal dit getal. Ververst elke minuut en live bij wijzigingen in
 * e-mails en chats (project_communications en email_log zitten sinds fase 0
 * in de realtime-publicatie).
 */
export function useOpenConversations() {
  const queryClient = useQueryClient();

  const query = useQuery<OpenConversations>({
    queryKey: OPEN_CONVERSATIONS_KEY,
    queryFn: fetchOpenConversations,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const bump = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => queryClient.invalidateQueries({ queryKey: OPEN_CONVERSATIONS_KEY }), 500);
    };
    const ch = supabase
      .channel(`open-conversations-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_communications" }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_conversations" }, bump)
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(ch);
    };
  }, [queryClient]);

  return { ...query, data: query.data ?? EMPTY_OPEN_CONVERSATIONS };
}

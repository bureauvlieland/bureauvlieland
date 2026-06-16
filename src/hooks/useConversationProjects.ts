import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ChatConversation } from "@/hooks/useChat";

export interface ConversationProjectRef {
  program?: { id: string; reference: string };
  accommodation?: { id: string; label: string };
}

/** Fetches project labels (program + lodging) for conversations. Keyed by conversation.id. */
export function useConversationProjects(conversations: ChatConversation[]) {
  const [refs, setRefs] = useState<Record<string, ConversationProjectRef>>({});

  const programIds = useMemo(
    () =>
      Array.from(
        new Set(conversations.map((c) => c.request_id).filter(Boolean) as string[])
      ),
    [conversations]
  );
  const accommodationIds = useMemo(
    () =>
      Array.from(
        new Set(
          conversations
            .flatMap((c) => [c.accommodation_request_id, c.accommodation_id])
            .filter(Boolean) as string[]
        )
      ),
    [conversations]
  );

  useEffect(() => {
    const fetchRefs = async () => {
      const [progRes, accRes] = await Promise.all([
        programIds.length
          ? supabase
              .from("program_requests")
              .select("id, reference_number")
              .in("id", programIds)
          : Promise.resolve({ data: [] as { id: string; reference_number: string | null }[] }),
        accommodationIds.length
          ? supabase
              .from("accommodation_requests")
              .select("id, reference_number, customer_name")
              .in("id", accommodationIds)
          : Promise.resolve({
              data: [] as { id: string; reference_number: string | null; customer_name: string | null }[],
            }),
      ]);

      const progMap = new Map<string, string>();
      for (const row of progRes.data || []) {
        if (row.reference_number) progMap.set(row.id, row.reference_number);
      }
      const accMap = new Map<string, string>();
      for (const row of accRes.data || []) {
        const label = row.reference_number || row.customer_name || "Logies";
        accMap.set(row.id, label);
      }

      const next: Record<string, ConversationProjectRef> = {};
      for (const c of conversations) {
        const entry: ConversationProjectRef = {};
        if (c.request_id && progMap.has(c.request_id)) {
          entry.program = { id: c.request_id, reference: progMap.get(c.request_id)! };
        }
        const accId = c.accommodation_request_id || c.accommodation_id;
        if (accId && accMap.has(accId)) {
          entry.accommodation = {
            id: accId,
            label: accMap.get(accId)!,
          };
        }
        if (entry.program || entry.accommodation) next[c.id] = entry;
      }
      setRefs(next);
    };
    fetchRefs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programIds.join(","), accommodationIds.join(",")]);

  return refs;
}

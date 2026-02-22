import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ChatConversation } from "@/hooks/useChat";

/** Fetches reference_numbers for conversations that have a request_id */
export function useConversationProjects(conversations: ChatConversation[]) {
  const [projectRefs, setProjectRefs] = useState<Record<string, string>>({});

  const requestIds = useMemo(
    () => conversations.map(c => c.request_id).filter(Boolean) as string[],
    [conversations]
  );

  useEffect(() => {
    if (requestIds.length === 0) {
      setProjectRefs({});
      return;
    }

    const fetchRefs = async () => {
      const { data } = await supabase
        .from("program_requests")
        .select("id, reference_number")
        .in("id", requestIds);

      if (data) {
        const map: Record<string, string> = {};
        for (const row of data) {
          if (row.reference_number) {
            map[row.id] = row.reference_number;
          }
        }
        setProjectRefs(map);
      }
    };
    fetchRefs();
  }, [requestIds]);

  return projectRefs;
}

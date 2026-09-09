import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EmailSuppression {
  email: string;
  reason: string;
  source: string | null;
  notes: string | null;
  created_at: string;
}

const REASON_LABEL: Record<string, string> = {
  blocked: "geblokkeerd door Mailjet",
  bounce: "hard bounce",
  spam: "als spam gemeld",
  unsub: "afgemeld",
  manual: "handmatig geblokkeerd",
};

export const suppressionReasonLabel = (reason: string) => REASON_LABEL[reason] ?? reason;

/**
 * Welke van deze adressen staan op onze suppressielijst? Mail daarnaar wordt
 * niet verstuurd; de admin moet dat zien vóór hij op Versturen klikt.
 */
export const useEmailSuppressions = (emails: (string | null | undefined)[]) => {
  const list = Array.from(new Set(emails.filter((e): e is string => !!e && e.includes("@")).map((e) => e.trim().toLowerCase()))).sort();
  return useQuery({
    queryKey: ["email-suppressions", list],
    queryFn: async (): Promise<Record<string, EmailSuppression>> => {
      if (list.length === 0) return {};
      const { data, error } = await supabase
        .from("email_suppressions")
        .select("email, reason, source, notes, created_at")
        .in("email", list);
      if (error) throw error;
      const map: Record<string, EmailSuppression> = {};
      for (const row of data ?? []) map[row.email.toLowerCase()] = row as EmailSuppression;
      return map;
    },
    enabled: list.length > 0,
    staleTime: 60 * 1000,
  });
};

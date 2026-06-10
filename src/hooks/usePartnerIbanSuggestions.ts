import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PartnerIbanSuggestion {
  partnerId: string;
  partnerName: string;
  iban: string;
  /** Counterparty names from bank lines that produced this match */
  sourceNames: string[];
  /** Number of bank statement lines supporting this suggestion */
  lineCount: number;
}

/** Normalize a name for fuzzy matching: lowercase, strip diacritics/punctuation/legal suffixes */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(b\.?v\.?|n\.?v\.?|v\.?o\.?f\.?|exploitatie|holding|beheer|stichting|pension)\b/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function namesMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a.length < 4 || b.length < 4) return a === b;
  return a.includes(b) || b.includes(a);
}

/**
 * Suggests IBANs for partners based on counterparty data in uploaded bank statements.
 * Safety rules:
 * - Lines paid via a PSP ("via Mollie/Stripe/...") are skipped — the IBAN belongs to the PSP.
 * - IBANs that occur with more than 2 distinct counterparty names are skipped (collect accounts).
 * - Only partners WITHOUT a registered IBAN get suggestions.
 */
export function usePartnerIbanSuggestions() {
  return useQuery({
    queryKey: ["partner-iban-suggestions"],
    queryFn: async (): Promise<PartnerIbanSuggestion[]> => {
      const [partnersRes, linesRes] = await Promise.all([
        supabase
          .from("partners")
          .select("id, name, iban")
          .eq("is_active", true),
        supabase
          .from("bank_statement_lines")
          .select("counterparty_name, counterparty_iban")
          .not("counterparty_iban", "is", null)
          .neq("counterparty_iban", ""),
      ]);
      if (partnersRes.error) throw partnersRes.error;
      if (linesRes.error) throw linesRes.error;

      const partners = (partnersRes.data ?? []).filter(
        (p) => !p.iban || p.iban.trim() === "",
      );
      const lines = (linesRes.data ?? []).filter(
        (l) =>
          l.counterparty_name &&
          // Skip payment service providers: IBAN belongs to the PSP, not the partner
          !/\bvia\b/i.test(l.counterparty_name),
      );

      // Detect collect/shared IBANs (used by multiple distinct counterparties)
      const namesPerIban = new Map<string, Set<string>>();
      for (const l of lines) {
        const iban = l.counterparty_iban!.replace(/\s/g, "").toUpperCase();
        const set = namesPerIban.get(iban) ?? new Set<string>();
        set.add(normalizeName(l.counterparty_name!));
        namesPerIban.set(iban, set);
      }

      const suggestions: PartnerIbanSuggestion[] = [];
      for (const partner of partners) {
        const normPartner = normalizeName(partner.name);
        if (!normPartner) continue;

        // iban -> { sourceNames, count }
        const matches = new Map<string, { names: Set<string>; count: number }>();
        for (const l of lines) {
          const normLine = normalizeName(l.counterparty_name!);
          if (!namesMatch(normPartner, normLine)) continue;
          const iban = l.counterparty_iban!.replace(/\s/g, "").toUpperCase();
          // Skip collect accounts shared by 3+ distinct counterparties
          if ((namesPerIban.get(iban)?.size ?? 0) > 2) continue;
          const entry = matches.get(iban) ?? { names: new Set<string>(), count: 0 };
          entry.names.add(l.counterparty_name!);
          entry.count += 1;
          matches.set(iban, entry);
        }

        for (const [iban, entry] of matches) {
          suggestions.push({
            partnerId: partner.id,
            partnerName: partner.name,
            iban,
            sourceNames: Array.from(entry.names),
            lineCount: entry.count,
          });
        }
      }

      return suggestions.sort((a, b) => a.partnerName.localeCompare(b.partnerName, "nl"));
    },
    staleTime: 60_000,
  });
}

export function useRegisterPartnerIban() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ partnerId, iban }: { partnerId: string; iban: string }) => {
      const cleaned = iban.replace(/\s/g, "").toUpperCase();
      const { error } = await supabase
        .from("partners")
        .update({ iban: cleaned })
        .eq("id", partnerId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["partner-iban-suggestions"] });
      qc.invalidateQueries({ queryKey: ["partners"] });
      qc.invalidateQueries({ queryKey: ["partners-active-list"] });
      qc.invalidateQueries({ queryKey: ["payment-batch-candidates"] });
      toast.success(`IBAN ${vars.iban} geregistreerd bij partner`);
    },
    onError: (err: Error) => toast.error(err.message || "Fout bij registreren IBAN"),
  });
}

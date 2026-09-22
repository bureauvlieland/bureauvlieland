import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { normalizeCase, type PublishedReferenceCase } from "@/lib/referenceCases";

/**
 * De gepubliceerde referentiepagina's uit de view `published_reference_cases`
 * (docs/plan-reviews-oogsten.md, fase 3): alleen inhoud, alleen wat de klant
 * goedkeurde. Eén keer per uur, gedeeld door het overzicht, de detailpagina
 * en de verwijzing onder de beoordelingen.
 */
const COLUMNS =
  "id, slug, title, intro, body, quote, quote_author, quote_role, company, group_size, program_date, days, facts, program, photos, block_ids, landing_path, published_at, updated_at";

const STALE = 60 * 60 * 1000;

export const usePublishedReferenceCases = () =>
  useQuery({
    queryKey: ["published-reference-cases"],
    staleTime: STALE,
    queryFn: async (): Promise<PublishedReferenceCase[]> => {
      const { data, error } = await supabase
        .from("published_reference_cases")
        .select(COLUMNS)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => normalizeCase(row as Record<string, unknown>)).filter((c) => c.id && c.slug && c.title);
    },
  });

export const usePublishedReferenceCase = (slug: string | null) =>
  useQuery({
    queryKey: ["published-reference-case", slug],
    enabled: Boolean(slug),
    staleTime: STALE,
    queryFn: async (): Promise<PublishedReferenceCase | null> => {
      const { data, error } = await supabase
        .from("published_reference_cases")
        .select(COLUMNS)
        .eq("slug", slug as string)
        .maybeSingle();
      if (error) throw error;
      return data ? normalizeCase(data as Record<string, unknown>) : null;
    },
  });

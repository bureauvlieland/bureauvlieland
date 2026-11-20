import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ProgramItemBillingLine } from "@/types/programItemBillingLine";

/**
 * Klantregels van het oude werkblad, per onderdeel. Alleen nog gelezen voor
 * projecten zonder proforma (zonder akkoord, of vóór de proforma volledig
 * gefactureerd); zie docs/plan-proforma-factuur.md, opruiming stap 2.
 */
export const useItemBillingLinesBatch = (itemIds: string[]) => {
  const [linesByItem, setLinesByItem] = useState<Record<string, ProgramItemBillingLine[]>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (itemIds.length === 0) {
      setLinesByItem({});
      return;
    }
    setLoading(true);
    supabase
      .from("program_item_billing_lines")
      .select("*")
      .in("item_id", itemIds)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        const map: Record<string, ProgramItemBillingLine[]> = {};
        (data as ProgramItemBillingLine[] | null)?.forEach((line) => {
          if (!map[line.item_id]) map[line.item_id] = [];
          map[line.item_id].push(line);
        });
        setLinesByItem(map);
        setLoading(false);
      });
  }, [JSON.stringify(itemIds)]);

  return { linesByItem, loading };
};

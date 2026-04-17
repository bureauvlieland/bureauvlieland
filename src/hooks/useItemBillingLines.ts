import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ProgramItemBillingLine,
  ProgramItemBillingLineInput,
  computeBillingLineAmounts,
} from "@/types/programItemBillingLine";
import { toast } from "sonner";

export const useItemBillingLines = (itemId: string | null) => {
  const [lines, setLines] = useState<ProgramItemBillingLine[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLines = useCallback(async () => {
    if (!itemId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("program_item_billing_lines")
      .select("*")
      .eq("item_id", itemId)
      .order("sort_order", { ascending: true });
    if (!error && data) setLines(data as ProgramItemBillingLine[]);
    setLoading(false);
  }, [itemId]);

  useEffect(() => {
    fetchLines();
  }, [fetchLines]);

  const saveAll = async (inputs: ProgramItemBillingLineInput[]) => {
    if (!itemId) return false;
    // Delete existing lines and reinsert (simpler than diffing)
    const { error: delErr } = await supabase
      .from("program_item_billing_lines")
      .delete()
      .eq("item_id", itemId);
    if (delErr) {
      toast.error("Fout bij opslaan factuurregels");
      return false;
    }
    if (inputs.length > 0) {
      const rows = inputs.map((input, idx) => {
        const amounts = computeBillingLineAmounts(
          input.quantity,
          input.unit_price_excl_vat,
          input.vat_rate,
        );
        return {
          item_id: itemId,
          description: input.description,
          quantity: input.quantity,
          unit_price_excl_vat: input.unit_price_excl_vat,
          vat_rate: input.vat_rate,
          sort_order: input.sort_order ?? idx,
          ...amounts,
        };
      });
      const { error: insErr } = await supabase
        .from("program_item_billing_lines")
        .insert(rows);
      if (insErr) {
        toast.error("Fout bij opslaan factuurregels");
        return false;
      }
    }
    // Mark item as locked
    await supabase
      .from("program_request_items")
      .update({ final_billing_locked_at: inputs.length > 0 ? new Date().toISOString() : null })
      .eq("id", itemId);
    await fetchLines();
    toast.success("Factuurregels opgeslagen");
    return true;
  };

  return { lines, loading, refetch: fetchLines, saveAll };
};

// Hook to load billing lines for multiple items at once (for invoice preview)
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

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type ItemWithBlockId = { block_id: string | null };

export const useItemVatRates = <T extends ItemWithBlockId>(items: T[]) => {
  const [vatRateMap, setVatRateMap] = useState<Record<string, number>>({});

  useEffect(() => {
    const blockIds = items.map(i => i.block_id).filter(Boolean) as string[];
    if (blockIds.length === 0) return;
    supabase
      .from("building_blocks")
      .select("id, vat_rate")
      .in("id", blockIds)
      .then(({ data }) => {
        if (data) {
          const map: Record<string, number> = {};
          data.forEach(b => { map[b.id] = b.vat_rate ?? 21; });
          setVatRateMap(map);
        }
      });
  }, [items]);

  const getItemVatRate = useCallback((item: ItemWithBlockId): number => {
    if (item.block_id && vatRateMap[item.block_id] !== undefined) {
      return vatRateMap[item.block_id];
    }
    return 21;
  }, [vatRateMap]);

  return { vatRateMap, getItemVatRate };
};


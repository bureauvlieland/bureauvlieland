import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type ItemWithBlockId = { block_id: string | null };

/**
 * Resolves VAT rates per building block id.
 *
 * In the public customer portal we can no longer SELECT directly on
 * `building_blocks`. The caller (CustomerProgram → ProgramView) passes the
 * `blockVatRates` map already returned by the `get-customer-program` edge
 * function. In admin/back-office contexts the override is omitted and we fall
 * back to the original anon-key fetch.
 */
export const useItemVatRates = <T extends ItemWithBlockId>(
  items: T[],
  overrideMap?: Record<string, number>,
) => {
  const [vatRateMap, setVatRateMap] = useState<Record<string, number>>({});

  useEffect(() => {
    if (overrideMap) return;
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
  }, [items, overrideMap]);

  const effectiveMap = overrideMap ?? vatRateMap;

  const getItemVatRate = useCallback((item: ItemWithBlockId): number => {
    if (item.block_id && effectiveMap[item.block_id] !== undefined) {
      return effectiveMap[item.block_id];
    }
    return 21;
  }, [effectiveMap]);

  return { vatRateMap: effectiveMap, getItemVatRate };
};

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { BlockComponent, BlockComponentQuantityMode } from "@/types/blockComponent";
import type { BuildingBlock } from "@/types/buildingBlock";

/** All components (children) of a parent block, with the child block joined in. */
export const useBlockComponents = (parentBlockId: string | undefined) => {
  return useQuery({
    queryKey: ["block-components", parentBlockId],
    queryFn: async () => {
      if (!parentBlockId) return [];
      const { data, error } = await supabase
        .from("building_block_components")
        .select(`
          *,
          child:building_blocks!building_block_components_child_block_id_fkey(
            id, name, description, short_description, price_adult, price_type, price_extras, block_type,
            provider_id, category, image_url, image_asset, status, is_active,
            provider:partners!building_blocks_provider_id_fkey(id, name, email)
          )
        `)
        .eq("parent_block_id", parentBlockId)
        .order("sort_order");

      if (error) throw error;
      return (data ?? []) as unknown as (BlockComponent & {
        child: (BuildingBlock & { provider?: { id: string; name: string; email?: string } | null }) | null;
      })[];
    },
    enabled: !!parentBlockId,
  });
};

export const useCreateBlockComponent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      parent_block_id: string;
      child_block_id: string;
      is_required: boolean;
      quantity_mode: BlockComponentQuantityMode;
      quantity_value: number;
      sort_order?: number;
      notes?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("building_block_components")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["block-components", vars.parent_block_id] });
    },
  });
};

export const useUpdateBlockComponent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      parent_block_id: _parent,
      updates,
    }: {
      id: string;
      parent_block_id: string;
      updates: Partial<Pick<BlockComponent, "is_required" | "quantity_mode" | "quantity_value" | "sort_order" | "notes">>;
    }) => {
      const { error } = await supabase
        .from("building_block_components")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["block-components", vars.parent_block_id] });
    },
  });
};

export const useDeleteBlockComponent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, parent_block_id: _p }: { id: string; parent_block_id: string }) => {
      const { error } = await supabase
        .from("building_block_components")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["block-components", vars.parent_block_id] });
    },
  });
};

/** Lightweight fetch (no React Query) — for use in imperative add-flows. */
export async function fetchRequiredChildrenForBlock(blockId: string) {
  const { data, error } = await supabase
    .from("building_block_components")
    .select(`
      id, parent_block_id, child_block_id, is_required, quantity_mode, quantity_value, sort_order, notes,
      child:building_blocks!building_block_components_child_block_id_fkey(
        id, name, description, short_description, price_adult, price_type, price_extras, block_type,
        provider_id, category, duration, location_lat, location_lng, location_address,
        provider:partners!building_blocks_provider_id_fkey(id, name, email)
      )
    `)
    .eq("parent_block_id", blockId)
    .eq("is_required", true)
    .order("sort_order");

  if (error) throw error;
  return (data ?? []) as unknown as (BlockComponent & {
    child: (BuildingBlock & { provider?: { id: string; name: string; email?: string } | null }) | null;
  })[];
}

export async function fetchOptionalChildrenForBlock(blockId: string) {
  const { data, error } = await supabase
    .from("building_block_components")
    .select(`
      *,
      child:building_blocks!building_block_components_child_block_id_fkey(
        id, name, description, short_description, price_adult, price_type, provider_id,
        provider:partners!building_blocks_provider_id_fkey(id, name)
      )
    `)
    .eq("parent_block_id", blockId)
    .eq("is_required", false)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as unknown as (BlockComponent & { child: BuildingBlock | null })[];
}

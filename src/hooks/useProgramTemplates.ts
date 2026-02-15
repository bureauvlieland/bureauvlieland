import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ProgramTemplate, ProgramTemplateItem } from "@/types/programTemplate";
import type { BuildingBlock } from "@/types/buildingBlock";

/**
 * Fetch all published templates
 */
export const usePublishedTemplates = () => {
  return useQuery({
    queryKey: ["program-templates", "published"],
    queryFn: async (): Promise<ProgramTemplate[]> => {
      const { data, error } = await supabase
        .from("program_templates")
        .select("*")
        .eq("is_published", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      const templates = data || [];

      // For templates without image_url, fetch first block image as fallback
      const needsFallback = templates.filter((t) => !t.image_url);
      if (needsFallback.length > 0) {
        const { data: items } = await supabase
          .from("program_template_items")
          .select("template_id, block_id")
          .in("template_id", needsFallback.map((t) => t.id))
          .order("day_index", { ascending: true })
          .order("sort_order", { ascending: true });

        if (items && items.length > 0) {
          // Get first block_id per template
          const firstBlockPerTemplate = new Map<string, string>();
          for (const item of items) {
            if (!firstBlockPerTemplate.has(item.template_id)) {
              firstBlockPerTemplate.set(item.template_id, item.block_id);
            }
          }

          const blockIds = [...new Set(firstBlockPerTemplate.values())];
          const { data: blocks } = await supabase
            .from("building_blocks")
            .select("id, image_url")
            .in("id", blockIds);

          if (blocks) {
            const blockImageMap = new Map(blocks.map((b) => [b.id, b.image_url]));
            for (const t of templates) {
              if (!t.image_url) {
                const blockId = firstBlockPerTemplate.get(t.id);
                if (blockId) t.image_url = blockImageMap.get(blockId) || null;
              }
            }
          }
        }
      }

      return templates;
    },
  });
};

/**
 * Fetch templates filtered by duration
 */
export const useTemplatesByDuration = (durationDays: number) => {
  return useQuery({
    queryKey: ["program-templates", "duration", durationDays],
    queryFn: async (): Promise<ProgramTemplate[]> => {
      const { data, error } = await supabase
        .from("program_templates")
        .select("*")
        .eq("is_published", true)
        .eq("duration_days", durationDays)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: durationDays > 0,
  });
};

/**
 * Fetch a single template with all its items and joined building block data
 */
export const useTemplateWithItems = (templateId: string | null) => {
  return useQuery({
    queryKey: ["program-template", templateId, "with-items"],
    queryFn: async (): Promise<ProgramTemplate | null> => {
      if (!templateId) return null;

      // Fetch template
      const { data: template, error: templateError } = await supabase
        .from("program_templates")
        .select("*")
        .eq("id", templateId)
        .single();

      if (templateError) throw templateError;
      if (!template) return null;

      // Fetch template items
      const { data: items, error: itemsError } = await supabase
        .from("program_template_items")
        .select("*")
        .eq("template_id", templateId)
        .order("day_index", { ascending: true })
        .order("sort_order", { ascending: true });

      if (itemsError) throw itemsError;

      // Fetch building blocks for all items
      const blockIds = items?.map((item) => item.block_id) || [];
      let blocks: BuildingBlock[] = [];

      if (blockIds.length > 0) {
        const { data: blocksData, error: blocksError } = await supabase
          .from("building_blocks")
          .select("*")
          .in("id", blockIds);

        if (blocksError) throw blocksError;
        blocks = (blocksData || []) as BuildingBlock[];
      }

      // Join blocks to items
      const itemsWithBlocks: ProgramTemplateItem[] = (items || []).map((item) => ({
        ...item,
        block: blocks.find((b) => b.id === item.block_id),
      }));

      return {
        ...template,
        items: itemsWithBlocks,
      } as ProgramTemplate;
    },
    enabled: !!templateId,
  });
};

// ============ ADMIN HOOKS ============

/**
 * Fetch all templates (including unpublished) with items for admin
 */
export const useAdminTemplates = () => {
  return useQuery({
    queryKey: ["program-templates", "admin"],
    queryFn: async (): Promise<ProgramTemplate[]> => {
      // Fetch all templates
      const { data: templates, error: templatesError } = await supabase
        .from("program_templates")
        .select("*")
        .order("sort_order", { ascending: true });

      if (templatesError) throw templatesError;
      if (!templates || templates.length === 0) return [];

      // Fetch all template items
      const { data: allItems, error: itemsError } = await supabase
        .from("program_template_items")
        .select("*")
        .order("day_index", { ascending: true })
        .order("sort_order", { ascending: true });

      if (itemsError) throw itemsError;

      // Fetch all building blocks for items
      const blockIds = [...new Set(allItems?.map((item) => item.block_id) || [])];
      let blocks: BuildingBlock[] = [];

      if (blockIds.length > 0) {
        const { data: blocksData, error: blocksError } = await supabase
          .from("building_blocks")
          .select("*")
          .in("id", blockIds);

        if (blocksError) throw blocksError;
        blocks = (blocksData || []) as BuildingBlock[];
      }

      // Join items with blocks and group by template
      const templatesWithItems = templates.map((template) => {
        const templateItems = (allItems || [])
          .filter((item) => item.template_id === template.id)
          .map((item) => ({
            ...item,
            block: blocks.find((b) => b.id === item.block_id),
          }));

        return {
          ...template,
          items: templateItems,
        } as ProgramTemplate;
      });

      return templatesWithItems;
    },
  });
};

/**
 * Create a new template
 */
export const useCreateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<ProgramTemplate, "items" | "created_at" | "updated_at">) => {
      const { error } = await supabase
        .from("program_templates")
        .insert({
          id: data.id,
          name: data.name,
          description: data.description,
          short_description: data.short_description,
          duration_days: data.duration_days,
          target_group: data.target_group,
          image_url: data.image_url,
          indicative_price_pp: data.indicative_price_pp,
          is_published: data.is_published,
          sort_order: data.sort_order,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-templates"] });
    },
  });
};

/**
 * Update an existing template
 */
export const useUpdateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ProgramTemplate> }) => {
      const { error } = await supabase
        .from("program_templates")
        .update({
          name: updates.name,
          description: updates.description,
          short_description: updates.short_description,
          duration_days: updates.duration_days,
          target_group: updates.target_group,
          image_url: updates.image_url,
          indicative_price_pp: updates.indicative_price_pp,
          is_published: updates.is_published,
          sort_order: updates.sort_order,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-templates"] });
    },
  });
};

/**
 * Delete a template
 */
export const useDeleteTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("program_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-templates"] });
    },
  });
};

/**
 * Toggle template publish status
 */
export const useToggleTemplatePublish = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { error } = await supabase
        .from("program_templates")
        .update({ is_published })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-templates"] });
    },
  });
};

// ============ TEMPLATE ITEM HOOKS ============

/**
 * Add an item to a template
 */
export const useAddTemplateItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<ProgramTemplateItem, "id" | "created_at" | "block">) => {
      // Get current max sort_order for this template/day
      const { data: existing } = await supabase
        .from("program_template_items")
        .select("sort_order")
        .eq("template_id", data.template_id)
        .eq("day_index", data.day_index)
        .order("sort_order", { ascending: false })
        .limit(1);

      const nextSortOrder = (existing?.[0]?.sort_order ?? -1) + 1;

      const { error } = await supabase
        .from("program_template_items")
        .insert({
          template_id: data.template_id,
          block_id: data.block_id,
          day_index: data.day_index,
          preferred_time: data.preferred_time,
          notes: data.notes,
          sort_order: nextSortOrder,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-templates"] });
      queryClient.invalidateQueries({ queryKey: ["program-template"] });
    },
  });
};

/**
 * Update a template item
 */
export const useUpdateTemplateItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ProgramTemplateItem> }) => {
      const { error } = await supabase
        .from("program_template_items")
        .update({
          day_index: updates.day_index,
          preferred_time: updates.preferred_time,
          notes: updates.notes,
          sort_order: updates.sort_order,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-templates"] });
      queryClient.invalidateQueries({ queryKey: ["program-template"] });
    },
  });
};

/**
 * Delete a template item
 */
export const useDeleteTemplateItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("program_template_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-templates"] });
      queryClient.invalidateQueries({ queryKey: ["program-template"] });
    },
  });
};

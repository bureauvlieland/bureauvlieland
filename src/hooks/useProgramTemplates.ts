import { useQuery } from "@tanstack/react-query";
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
      return data || [];
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

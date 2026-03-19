import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { BuildingBlock, BuildingBlockFormData } from "@/types/buildingBlock";

// Fetch all published building blocks (for public configurator)
export const usePublishedBuildingBlocks = () => {
  return useQuery({
    queryKey: ["building-blocks", "published"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("building_blocks")
        .select(`
          *,
          provider:partners!building_blocks_provider_id_fkey(id, name, email)
        `)
        .eq("status", "published")
        .order("sort_order");
      
      if (error) throw error;
      return data as unknown as BuildingBlock[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
};

// Get a single block by ID from an array
export const getBlockById = (blocks: BuildingBlock[], id: string): BuildingBlock | undefined => {
  return blocks.find((block) => block.id === id);
};

// Fetch all building blocks (for admin)
export const useAdminBuildingBlocks = () => {
  return useQuery({
    queryKey: ["building-blocks", "admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("building_blocks")
        .select(`
          *,
          provider:partners!building_blocks_provider_id_fkey(id, name, email)
        `)
        .eq("is_active", true)
        .order("category")
        .order("sort_order");
      
      if (error) throw error;
      return data as unknown as BuildingBlock[];
    },
  });
};

// Fetch single building block
export const useBuildingBlock = (id: string | undefined) => {
  return useQuery({
    queryKey: ["building-blocks", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("building_blocks")
        .select(`
          *,
          provider:partners!building_blocks_provider_id_fkey(id, name, email)
        `)
        .eq("id", id)
        .maybeSingle();
      
      if (error) throw error;
      return data as unknown as BuildingBlock | null;
    },
    enabled: !!id,
  });
};

// Create building block
export const useCreateBuildingBlock = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (block: BuildingBlockFormData) => {
      const { data: session } = await supabase.auth.getSession();
      
      const { price_type, ...rest } = block;
      const { data, error } = await supabase
        .from("building_blocks")
        .insert({
          ...rest,
          price_type: price_type as any,
          provider_id: block.provider_id || null,
          created_by: session.session?.user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["building-blocks"] });
    },
  });
};

// Update building block
export const useUpdateBuildingBlock = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<BuildingBlockFormData> }) => {
      const { price_type, ...rest } = updates;
      const { data, error } = await supabase
        .from("building_blocks")
        .update({
          ...rest,
          ...(price_type ? { price_type: price_type as any } : {}),
          provider_id: updates.provider_id || null,
        })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["building-blocks"] });
      queryClient.invalidateQueries({ queryKey: ["building-blocks", id] });
    },
  });
};

// Check if a building block is used in any templates
export const useBlockTemplateUsage = (blockId: string | undefined) => {
  return useQuery({
    queryKey: ["block-template-usage", blockId],
    queryFn: async () => {
      if (!blockId) return [];
      const { data, error } = await supabase
        .from("program_template_items")
        .select(`
          id,
          template_id,
          template:program_templates!program_template_items_template_id_fkey(id, name)
        `)
        .eq("block_id", blockId);
      
      if (error) throw error;
      return data as unknown as { id: string; template_id: string; template: { id: string; name: string } }[];
    },
    enabled: !!blockId,
  });
};

// Replace a building block in all template items
export const useReplaceBlockInTemplates = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ oldBlockId, newBlockId }: { oldBlockId: string; newBlockId: string }) => {
      const { error } = await supabase
        .from("program_template_items")
        .update({ block_id: newBlockId })
        .eq("block_id", oldBlockId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["block-template-usage"] });
    },
  });
};

// Delete building block
export const useDeleteBuildingBlock = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("building_blocks")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["building-blocks"] });
    },
  });
};

// Duplicate a building block
export const useDuplicateBuildingBlock = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sourceBlock: BuildingBlock) => {
      const { data: session } = await supabase.auth.getSession();
      
      // Generate a unique ID based on original
      let newId = `${sourceBlock.id}-kopie`;
      let suffix = 2;
      
      // Check if the ID already exists
      while (true) {
        const { data: existing } = await supabase
          .from("building_blocks")
          .select("id")
          .eq("id", newId)
          .maybeSingle();
        
        if (!existing) break;
        newId = `${sourceBlock.id}-kopie-${suffix}`;
        suffix++;
      }
      
      const { data, error } = await supabase
        .from("building_blocks")
        .insert({
          id: newId,
          name: `${sourceBlock.name} (kopie)`,
          description: sourceBlock.description,
          short_description: sourceBlock.short_description,
          category: sourceBlock.category,
          block_type: sourceBlock.block_type,
          provider_id: sourceBlock.provider_id,
          min_people: sourceBlock.min_people,
          max_people: sourceBlock.max_people,
          duration: sourceBlock.duration,
          price_adult: sourceBlock.price_adult,
          price_adult_note: sourceBlock.price_adult_note,
          price_type: sourceBlock.price_type as any,
          price_child: sourceBlock.price_child,
          price_child_note: sourceBlock.price_child_note,
          price_child_min_age: sourceBlock.price_child_min_age,
          price_child_max_age: sourceBlock.price_child_max_age,
          price_pet: sourceBlock.price_pet,
          price_pet_note: sourceBlock.price_pet_note,
          is_from_price: sourceBlock.is_from_price,
          price_display_override: sourceBlock.price_display_override,
          price_extras: sourceBlock.price_extras as any,
          external_url: sourceBlock.external_url,
          price_includes_vat: sourceBlock.price_includes_vat,
          vat_rate: sourceBlock.vat_rate,
          image_url: sourceBlock.image_url,
          image_asset: sourceBlock.image_asset,
          status: "concept",
          is_published: false,
          is_active: true,
          sort_order: sourceBlock.sort_order,
          location_lat: sourceBlock.location_lat,
          location_lng: sourceBlock.location_lng,
          location_address: sourceBlock.location_address,
          tags: sourceBlock.tags,
          seasonal_notes: sourceBlock.seasonal_notes,
          created_by: session.session?.user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["building-blocks"] });
    },
  });
};

// Update block status
export const useUpdateBlockStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("building_blocks")
        .update({ 
          status,
          is_published: status === "published",
          is_active: status !== "concept",
        })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["building-blocks"] });
    },
  });
};

// Upload image to storage
export const useUploadBlockImage = () => {
  return useMutation({
    mutationFn: async ({ blockId, file }: { blockId: string; file: File }) => {
      const fileExt = file.name.split(".").pop();
      const filePath = `${blockId}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("building-block-images")
        .upload(filePath, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from("building-block-images")
        .getPublicUrl(filePath);
      
      return publicUrl;
    },
  });
};

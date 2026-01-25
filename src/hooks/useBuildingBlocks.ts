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
          provider:partners(id, name, email)
        `)
        .eq("is_published", true)
        .eq("is_active", true)
        .order("sort_order");
      
      if (error) throw error;
      return data as BuildingBlock[];
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
          provider:partners(id, name)
        `)
        .order("category")
        .order("sort_order");
      
      if (error) throw error;
      return data as BuildingBlock[];
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
          provider:partners(id, name)
        `)
        .eq("id", id)
        .maybeSingle();
      
      if (error) throw error;
      return data as BuildingBlock | null;
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
      
      const { data, error } = await supabase
        .from("building_blocks")
        .insert({
          ...block,
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
      const { data, error } = await supabase
        .from("building_blocks")
        .update({
          ...updates,
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

// Delete building block (soft delete by setting is_active to false)
export const useDeleteBuildingBlock = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("building_blocks")
        .update({ is_active: false })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["building-blocks"] });
    },
  });
};

// Toggle publish status
export const useTogglePublishBlock = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { error } = await supabase
        .from("building_blocks")
        .update({ is_published })
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

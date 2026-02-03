import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { assetFiles, assetCategories, type AssetFile } from "@/assets";

export interface MediaFile {
  id: string;
  name: string;
  url: string;
  size: number;
  createdAt: string;
}

export { type AssetFile, assetFiles, assetCategories };

const BUCKET_NAME = "building-block-images";

export function useMediaFiles() {
  return useQuery({
    queryKey: ["media-files"],
    queryFn: async (): Promise<MediaFile[]> => {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .list("", {
          limit: 500,
          sortBy: { column: "created_at", order: "desc" },
        });

      if (error) throw error;

      // Filter out folders, only get files
      const files = (data || []).filter((item) => item.id);

      return files.map((file) => {
        const { data: urlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(file.name);

        return {
          id: file.id,
          name: file.name,
          url: urlData.publicUrl,
          size: file.metadata?.size || 0,
          createdAt: file.created_at || "",
        };
      });
    },
  });
}

export function useAssetFiles() {
  return assetFiles;
}

export function useUploadMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File): Promise<MediaFile> => {
      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(fileName);

      return {
        id: fileName,
        name: fileName,
        url: urlData.publicUrl,
        size: file.size,
        createdAt: new Date().toISOString(),
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-files"] });
    },
  });
}

export function useDeleteMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fileName: string): Promise<void> => {
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([fileName]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-files"] });
    },
  });
}

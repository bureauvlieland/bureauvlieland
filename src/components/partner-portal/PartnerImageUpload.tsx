import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ImageItem {
  url: string;
  alt?: string;
}

interface PartnerImageUploadProps {
  partnerId: string;
  images: ImageItem[];
  onImagesChange: (images: ImageItem[]) => void;
  storagePath: string; // e.g. "gallery" or "rooms/room-id"
  maxImages?: number;
  label?: string;
}

export function PartnerImageUpload({
  partnerId,
  images,
  onImagesChange,
  storagePath,
  maxImages = 8,
  label = "Foto's",
}: PartnerImageUploadProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remaining = maxImages - images.length;
    if (remaining <= 0) {
      toast({
        title: "Maximum bereikt",
        description: `U kunt maximaal ${maxImages} foto's toevoegen.`,
        variant: "destructive",
      });
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remaining);
    setIsUploading(true);

    try {
      const newImages: ImageItem[] = [];

      for (const file of filesToUpload) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const fileName = `${partnerId}/${storagePath}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("partner-images")
          .upload(fileName, file, { cacheControl: "3600", upsert: false });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          toast({
            title: "Upload mislukt",
            description: `Kon ${file.name} niet uploaden.`,
            variant: "destructive",
          });
          continue;
        }

        const { data: urlData } = supabase.storage
          .from("partner-images")
          .getPublicUrl(fileName);

        newImages.push({ url: urlData.publicUrl });
      }

      if (newImages.length > 0) {
        onImagesChange([...images, ...newImages]);
        toast({
          title: "Foto's geüpload",
          description: `${newImages.length} foto('s) toegevoegd.`,
        });
      }
    } catch (err) {
      console.error("Upload error:", err);
      toast({
        title: "Fout",
        description: "Er ging iets mis bij het uploaden.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = async (index: number) => {
    const image = images[index];
    // Try to delete from storage
    try {
      const url = new URL(image.url);
      const pathMatch = url.pathname.match(/\/partner-images\/(.+)$/);
      if (pathMatch) {
        await supabase.storage.from("partner-images").remove([pathMatch[1]]);
      }
    } catch {
      // Ignore deletion errors
    }
    const updated = images.filter((_, i) => i !== index);
    onImagesChange(updated);
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">{label}</label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {images.map((img, i) => (
          <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border bg-muted">
            <img
              src={img.url}
              alt={img.alt || `Foto ${i + 1}`}
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => handleRemove(i)}
              className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {images.length < maxImages && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors cursor-pointer disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <ImagePlus className="h-6 w-6" />
                <span className="text-xs">Toevoegen</span>
              </>
            )}
          </button>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
      <p className="text-xs text-muted-foreground">
        Maximaal {maxImages} foto's. JPG, PNG of WebP.
      </p>
    </div>
  );
}

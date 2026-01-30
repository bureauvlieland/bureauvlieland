import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, ImageIcon, AlertCircle, CheckCircle } from "lucide-react";
import type { PartnerBuildingBlock } from "@/types/partner";

// Image validation constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MIN_WIDTH = 800;
const MIN_HEIGHT = 600;

interface ImageValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
}

interface PartnerBlockSheetProps {
  isOpen: boolean;
  onClose: () => void;
  block: PartnerBuildingBlock | null;
  isNew: boolean;
  partnerId: string;
  onSaved: () => void;
}

// Validate image file
const validateImageFile = (file: File): Promise<ImageValidationResult> => {
  return new Promise((resolve) => {
    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      resolve({
        valid: false,
        error: "Ongeldig bestandstype. Gebruik JPG, PNG of WebP.",
      });
      return;
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      resolve({
        valid: false,
        error: `Bestand is te groot (max ${MAX_FILE_SIZE / 1024 / 1024}MB).`,
      });
      return;
    }

    // Check dimensions
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      
      if (img.width < MIN_WIDTH || img.height < MIN_HEIGHT) {
        resolve({
          valid: false,
          error: `Afbeelding is te klein. Minimaal ${MIN_WIDTH}x${MIN_HEIGHT} pixels vereist.`,
        });
        return;
      }

      // Check for portrait orientation (warning only)
      if (img.height > img.width) {
        resolve({
          valid: true,
          warning: "Let op: een liggend (landscape) formaat werkt beter voor de website.",
        });
        return;
      }

      resolve({ valid: true });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      resolve({
        valid: false,
        error: "Kon afbeelding niet laden. Probeer een ander bestand.",
      });
    };
    
    img.src = URL.createObjectURL(file);
  });
};

export const PartnerBlockSheet = ({
  isOpen,
  onClose,
  block,
  isNew,
  partnerId,
  onSaved,
}: PartnerBlockSheetProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageValidation, setImageValidation] = useState<ImageValidationResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    short_description: "",
    description: "",
    category: "activiteiten" as "activiteiten" | "catering" | "vervoer",
    duration: "",
    price_adult: "",
    price_type: "per_person" as string,
    min_people: "",
    max_people: "",
    image_url: "",
  });

  useEffect(() => {
    if (block) {
      setFormData({
        name: block.name || "",
        short_description: block.short_description || "",
        description: block.description || "",
        category: block.category as "activiteiten" | "catering" | "vervoer",
        duration: block.duration || "",
        price_adult: block.price_adult?.toString() || "",
        price_type: block.price_type || "per_person",
        min_people: block.min_people?.toString() || "",
        max_people: block.max_people?.toString() || "",
        image_url: block.image_url || "",
      });
      setImagePreview(block.image_url || null);
    } else {
      setFormData({
        name: "",
        short_description: "",
        description: "",
        category: "activiteiten",
        duration: "",
        price_adult: "",
        price_type: "per_person",
        min_people: "",
        max_people: "",
        image_url: "",
      });
      setImagePreview(null);
    }
    setImageValidation(null);
  }, [block, isOpen]);

  const handleImageUpload = async (file: File) => {
    if (!block?.id && isNew) {
      toast({
        title: "Eerst opslaan",
        description: "Sla eerst uw activiteit op voordat u een afbeelding uploadt.",
        variant: "destructive",
      });
      return;
    }

    const blockId = block?.id;
    if (!blockId) return;

    // Validate the image
    setIsUploading(true);
    setUploadProgress(10);
    
    const validation = await validateImageFile(file);
    setImageValidation(validation);
    
    if (!validation.valid) {
      setIsUploading(false);
      setUploadProgress(0);
      return;
    }

    setUploadProgress(30);

    try {
      // Upload to Supabase storage
      const fileExt = file.name.split(".").pop();
      const filePath = `${blockId}.${fileExt}`;

      setUploadProgress(50);

      const { error: uploadError } = await supabase.storage
        .from("building-block-images")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      setUploadProgress(80);

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from("building-block-images")
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Update the building block with the new image URL
      const { error: updateError } = await supabase
        .from("building_blocks")
        .update({ image_url: publicUrl })
        .eq("id", blockId);

      if (updateError) throw updateError;

      setUploadProgress(100);
      setFormData({ ...formData, image_url: publicUrl });
      setImagePreview(publicUrl);

      toast({
        title: "Afbeelding geüpload",
        description: validation.warning || "Je afbeelding is succesvol opgeslagen.",
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Upload mislukt",
        description: "Kon de afbeelding niet uploaden. Probeer het opnieuw.",
        variant: "destructive",
      });
      setImageValidation({ valid: false, error: "Upload mislukt. Probeer het opnieuw." });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Validatiefout",
        description: "Naam is verplicht.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const blockData = {
        name: formData.name.trim(),
        short_description: formData.short_description.trim() || null,
        description: formData.description.trim() || null,
        category: formData.category,
        duration: formData.duration.trim() || null,
        price_adult: formData.price_adult ? parseFloat(formData.price_adult) : null,
        price_type: formData.price_type,
        min_people: formData.min_people ? parseInt(formData.min_people) : null,
        max_people: formData.max_people ? parseInt(formData.max_people) : null,
        provider_id: partnerId,
        block_type: "partner" as const,
        is_published: false, // New blocks are always unpublished (need admin approval)
        is_active: true,
      };

      if (isNew) {
        // Generate a unique ID for new blocks
        const blockId = `partner-${partnerId}-${Date.now()}`;
        
        const { error } = await supabase
          .from("building_blocks")
          .insert({
            id: blockId,
            name: blockData.name,
            short_description: blockData.short_description,
            description: blockData.description,
            category: blockData.category,
            duration: blockData.duration,
            price_adult: blockData.price_adult,
            price_type: blockData.price_type as "per_person" | "total" | "per_hour" | "per_day" | "on_request",
            min_people: blockData.min_people,
            max_people: blockData.max_people,
            provider_id: partnerId,
            block_type: "partner" as const,
            is_published: false,
            is_active: true,
          });

        if (error) throw error;

        toast({
          title: "Voorstel ingediend",
          description: "Uw nieuwe activiteit is ingediend ter goedkeuring door Bureau Vlieland. U kunt nu een afbeelding toevoegen.",
        });
      } else if (block) {
        // Update existing block (partners can only update certain fields)
        const { error } = await supabase
          .from("building_blocks")
          .update({
            name: blockData.name,
            short_description: blockData.short_description,
            description: blockData.description,
            duration: blockData.duration,
            price_adult: blockData.price_adult,
            price_type: blockData.price_type as "per_person" | "total" | "per_hour" | "per_day" | "on_request",
            min_people: blockData.min_people,
            max_people: blockData.max_people,
          })
          .eq("id", block.id);

        if (error) throw error;

        toast({
          title: "Wijzigingen opgeslagen",
          description: "Uw activiteit is bijgewerkt.",
        });
      }

      onSaved();
    } catch (error) {
      console.error("Error saving block:", error);
      toast({
        title: "Fout",
        description: "Kon wijzigingen niet opslaan. Probeer het opnieuw.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isNew ? "Nieuwe activiteit voorstellen" : "Activiteit bewerken"}
          </SheetTitle>
          <SheetDescription>
            {isNew
              ? "Stel een nieuwe activiteit voor. Bureau Vlieland beoordeelt uw voorstel en publiceert het na goedkeuring."
              : "Pas de gegevens van uw activiteit aan."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* Image Upload Section (only for existing blocks) */}
          {!isNew && block && (
            <div className="space-y-3">
              <Label>Afbeelding</Label>
              
              {/* Image Preview */}
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden border">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                    <ImageIcon className="h-12 w-12 mb-2" />
                    <span className="text-sm">Geen afbeelding</span>
                  </div>
                )}
                
                {isUploading && (
                  <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin mb-2" />
                    <Progress value={uploadProgress} className="w-32" />
                    <span className="text-sm mt-2">Uploaden...</span>
                  </div>
                )}
              </div>

              {/* Upload Button */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isUploading}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {imagePreview ? "Afbeelding vervangen" : "Afbeelding uploaden"}
                </Button>
              </div>

              {/* Validation Result */}
              {imageValidation && (
                <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                  imageValidation.error 
                    ? "bg-destructive/10 text-destructive" 
                    : imageValidation.warning 
                      ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300"
                      : "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300"
                }`}>
                  {imageValidation.error ? (
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  ) : imageValidation.warning ? (
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  )}
                  <span>{imageValidation.error || imageValidation.warning || "Afbeelding voldoet aan alle eisen."}</span>
                </div>
              )}

              {/* Requirements */}
              <div className="text-xs text-muted-foreground space-y-1 bg-muted/50 rounded-lg p-3">
                <p className="font-medium mb-2">Vereisten:</p>
                <ul className="space-y-1">
                  <li>• Minimaal 800 × 600 pixels</li>
                  <li>• Formaat: JPG, PNG of WebP</li>
                  <li>• Maximaal 5 MB</li>
                  <li>• Landschapsoriëntatie (liggend)</li>
                  <li>• Geen tekst of logo's in de afbeelding</li>
                </ul>
              </div>
            </div>
          )}

          {/* Info for new blocks about image upload */}
          {isNew && (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm">
              <p className="text-blue-800 dark:text-blue-200">
                <strong>Tip:</strong> Na het opslaan kunt u een afbeelding toevoegen aan uw activiteit.
              </p>
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Naam *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Bijv. Zeehondentocht"
              required
            />
          </div>

          {/* Category (only for new blocks) */}
          {isNew && (
            <div className="space-y-2">
              <Label htmlFor="category">Categorie *</Label>
              <Select
                value={formData.category}
                onValueChange={(value: "activiteiten" | "catering" | "vervoer") =>
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activiteiten">Activiteiten</SelectItem>
                  <SelectItem value="catering">Catering</SelectItem>
                  <SelectItem value="vervoer">Vervoer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Short description */}
          <div className="space-y-2">
            <Label htmlFor="short_description">Korte beschrijving</Label>
            <Input
              id="short_description"
              value={formData.short_description}
              onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
              placeholder="Korte omschrijving voor overzichten"
              maxLength={150}
            />
            <p className="text-xs text-muted-foreground">
              {formData.short_description.length}/150 tekens
            </p>
          </div>

          {/* Full description */}
          <div className="space-y-2">
            <Label htmlFor="description">Volledige beschrijving</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Uitgebreide beschrijving van uw activiteit..."
              rows={4}
            />
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">Duur</Label>
            <Input
              id="duration"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              placeholder="Bijv. 2-3 uur"
            />
          </div>

          {/* Price */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price_adult">Prijs (€)</Label>
              <Input
                id="price_adult"
                type="number"
                step="0.01"
                min="0"
                value={formData.price_adult}
                onChange={(e) => setFormData({ ...formData, price_adult: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price_type">Prijstype</Label>
              <Select
                value={formData.price_type}
                onValueChange={(value) => setFormData({ ...formData, price_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_person">Per persoon</SelectItem>
                  <SelectItem value="total">Totaalprijs</SelectItem>
                  <SelectItem value="per_hour">Per uur</SelectItem>
                  <SelectItem value="per_day">Per dag</SelectItem>
                  <SelectItem value="on_request">Op aanvraag</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Min/Max people */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min_people">Min. personen</Label>
              <Input
                id="min_people"
                type="number"
                min="1"
                value={formData.min_people}
                onChange={(e) => setFormData({ ...formData, min_people: e.target.value })}
                placeholder="Bijv. 10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_people">Max. personen</Label>
              <Input
                id="max_people"
                type="number"
                min="1"
                value={formData.max_people}
                onChange={(e) => setFormData({ ...formData, max_people: e.target.value })}
                placeholder="Bijv. 40"
              />
            </div>
          </div>

          {/* Info notice for existing published blocks */}
          {block && block.is_published && (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm">
              <p className="text-blue-800 dark:text-blue-200">
                <strong>Let op:</strong> Wijzigingen aan gepubliceerde activiteiten worden direct zichtbaar.
              </p>
            </div>
          )}

          {/* Submit buttons */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Annuleren
            </Button>
            <Button type="submit" disabled={isSubmitting || isUploading} className="flex-1">
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isNew ? "Voorstel indienen" : "Opslaan"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, ImageIcon, AlertCircle, CheckCircle, Info, Euro, Settings, Image } from "lucide-react";
import type { PartnerBuildingBlock } from "@/types/partner";

// Slugify helper
const slugify = (text: string): string =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 80);

// Category type matching database ENUM
type BlockCategory = "outdoor" | "excursies" | "entertainment" | "locaties" | "catering" | "vervoer" | "services" | "overig" | "activiteiten";

// Category display map
const CATEGORY_OPTIONS: { value: BlockCategory; label: string }[] = [
  { value: "outdoor", label: "Outdoor & Sport" },
  { value: "excursies", label: "Excursies" },
  { value: "entertainment", label: "Entertainment" },
  { value: "locaties", label: "Locaties" },
  { value: "catering", label: "Catering" },
  { value: "vervoer", label: "Vervoer" },
  { value: "services", label: "Services" },
  { value: "overig", label: "Overig" },
  { value: "activiteiten", label: "Activiteiten" },
];

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
    const img = new window.Image();
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

interface FormData {
  name: string;
  short_description: string;
  description: string;
  category: BlockCategory;
  duration: string;
  price_adult: string;
  price_adult_note: string;
  price_type: string;
  price_child: string;
  price_child_note: string;
  price_child_min_age: string;
  price_child_max_age: string;
  price_pet: string;
  price_pet_note: string;
  is_from_price: boolean;
  price_includes_vat: boolean;
  vat_rate: string;
  min_people: string;
  max_people: string;
  seasonal_notes: string;
  tags: string;
  image_url: string;
}

const getInitialFormData = (block: PartnerBuildingBlock | null): FormData => {
  if (block) {
    return {
      name: block.name || "",
      short_description: block.short_description || "",
      description: block.description || "",
      category: (block.category as BlockCategory) || "outdoor",
      duration: block.duration || "",
      price_adult: block.price_adult?.toString() || "",
      price_adult_note: block.price_adult_note || "",
      price_type: block.price_type || "per_person",
      price_child: block.price_child?.toString() || "",
      price_child_note: block.price_child_note || "",
      price_child_min_age: block.price_child_min_age?.toString() || "4",
      price_child_max_age: block.price_child_max_age?.toString() || "12",
      price_pet: block.price_pet?.toString() || "",
      price_pet_note: block.price_pet_note || "",
      is_from_price: block.is_from_price ?? false,
      price_includes_vat: block.price_includes_vat ?? true,
      vat_rate: block.vat_rate?.toString() || "21",
      min_people: block.min_people?.toString() || "",
      max_people: block.max_people?.toString() || "",
      seasonal_notes: block.seasonal_notes || "",
      tags: block.tags?.join(", ") || "",
      image_url: block.image_url || "",
    };
  }
  return {
    name: "",
    short_description: "",
    description: "",
    category: "outdoor",
    duration: "",
    price_adult: "",
    price_adult_note: "",
    price_type: "per_person",
    price_child: "",
    price_child_note: "",
    price_child_min_age: "4",
    price_child_max_age: "12",
    price_pet: "",
    price_pet_note: "",
    is_from_price: false,
    price_includes_vat: true,
    vat_rate: "21",
    min_people: "",
    max_people: "",
    seasonal_notes: "",
    tags: "",
    image_url: "",
  };
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
  const [activeTab, setActiveTab] = useState("algemeen");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<FormData>(getInitialFormData(null));

  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialFormData(block));
      setImagePreview(block?.image_url || null);
      setImageValidation(null);
      setActiveTab("algemeen");
    }
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

    // Parse tags from comma-separated string
    const tagsArray = formData.tags
      .split(",")
      .map(t => t.trim())
      .filter(t => t.length > 0);

    try {
      const blockData = {
        name: formData.name.trim(),
        short_description: formData.short_description.trim() || null,
        description: formData.description.trim() || null,
        category: formData.category,
        duration: formData.duration.trim() || null,
        price_adult: formData.price_adult ? parseFloat(formData.price_adult) : null,
        price_adult_note: formData.price_adult_note.trim() || null,
        price_type: formData.price_type as "per_person" | "total" | "per_hour" | "per_day" | "on_request",
        price_child: formData.price_child ? parseFloat(formData.price_child) : null,
        price_child_note: formData.price_child_note.trim() || null,
        price_child_min_age: formData.price_child_min_age ? parseInt(formData.price_child_min_age) : 4,
        price_child_max_age: formData.price_child_max_age ? parseInt(formData.price_child_max_age) : 12,
        price_pet: formData.price_pet ? parseFloat(formData.price_pet) : null,
        price_pet_note: formData.price_pet_note.trim() || null,
        is_from_price: formData.is_from_price,
        price_includes_vat: formData.price_includes_vat,
        vat_rate: formData.vat_rate ? parseFloat(formData.vat_rate) : 21,
        min_people: formData.min_people ? parseInt(formData.min_people) : null,
        max_people: formData.max_people ? parseInt(formData.max_people) : null,
        seasonal_notes: formData.seasonal_notes.trim() || null,
        tags: tagsArray.length > 0 ? tagsArray : null,
        provider_id: partnerId,
        block_type: "partner" as const,
        is_published: false, // New blocks are always unpublished (need admin approval)
        is_active: true,
      };

      if (isNew) {
        // Generate a readable slug ID from the name
        const blockId = slugify(formData.name) || `partner-${Date.now()}`;
        
        const { error } = await supabase
          .from("building_blocks")
          .insert({
            id: blockId,
            ...blockData,
          });

        if (error) throw error;

        toast({
          title: "Voorstel ingediend",
          description: "Uw nieuwe activiteit is ingediend ter goedkeuring door Bureau Vlieland.",
        });

        // Reset form for next entry
        setFormData(getInitialFormData(null));
        setImagePreview(null);
        setImageValidation(null);
        setActiveTab("algemeen");
      } else if (block) {
        // Update existing block - partners can update all these fields including category
        const { error } = await supabase
          .from("building_blocks")
          .update({
            name: blockData.name,
            short_description: blockData.short_description,
            description: blockData.description,
            category: blockData.category,
            duration: blockData.duration,
            price_adult: blockData.price_adult,
            price_adult_note: blockData.price_adult_note,
            price_type: blockData.price_type,
            price_child: blockData.price_child,
            price_child_note: blockData.price_child_note,
            price_child_min_age: blockData.price_child_min_age,
            price_child_max_age: blockData.price_child_max_age,
            price_pet: blockData.price_pet,
            price_pet_note: blockData.price_pet_note,
            is_from_price: blockData.is_from_price,
            price_includes_vat: blockData.price_includes_vat,
            vat_rate: blockData.vat_rate,
            min_people: blockData.min_people,
            max_people: blockData.max_people,
            seasonal_notes: blockData.seasonal_notes,
            tags: blockData.tags,
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
      <SheetContent className="sm:max-w-xl overflow-y-auto">
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

        <form onSubmit={handleSubmit} className="mt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="algemeen" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Algemeen</span>
              </TabsTrigger>
              <TabsTrigger value="prijzen" className="flex items-center gap-2">
                <Euro className="h-4 w-4" />
                <span className="hidden sm:inline">Prijzen</span>
              </TabsTrigger>
              <TabsTrigger value="media" className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                <span className="hidden sm:inline">Media</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab: Algemeen */}
            <TabsContent value="algemeen" className="space-y-4">
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
                {isNew && formData.name.trim() && (
                  <p className="text-xs text-muted-foreground">
                    ID: <code className="bg-muted px-1 rounded">{slugify(formData.name)}</code>
                  </p>
                )}
              </div>

              {/* Category - always editable */}
              <div className="space-y-2">
                <Label htmlFor="category">Categorie *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: BlockCategory) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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

              {/* Seasonal notes */}
              <div className="space-y-2">
                <Label htmlFor="seasonal_notes">Seizoensnotities</Label>
                <Textarea
                  id="seasonal_notes"
                  value={formData.seasonal_notes}
                  onChange={(e) => setFormData({ ...formData, seasonal_notes: e.target.value })}
                  placeholder="Bijv. Alleen beschikbaar van april t/m oktober"
                  rows={2}
                />
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="Bijv. actief, buiten, groep (gescheiden door komma's)"
                />
                <p className="text-xs text-muted-foreground">
                  Meerdere tags scheiden met komma's
                </p>
              </div>
            </TabsContent>

            {/* Tab: Prijzen */}
            <TabsContent value="prijzen" className="space-y-4">
              {/* Price type */}
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

              {/* Is from price & VAT toggles */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_from_price"
                    checked={formData.is_from_price}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_from_price: checked })}
                  />
                  <Label htmlFor="is_from_price" className="text-sm">
                    "Vanaf" prijs
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="price_includes_vat"
                    checked={formData.price_includes_vat}
                    onCheckedChange={(checked) => setFormData({ ...formData, price_includes_vat: checked })}
                  />
                  <Label htmlFor="price_includes_vat" className="text-sm">
                    Incl. BTW
                  </Label>
                </div>
              </div>

              {/* VAT rate */}
              <div className="space-y-2">
                <Label htmlFor="vat_rate">BTW-tarief (%)</Label>
                <Select
                  value={formData.vat_rate}
                  onValueChange={(value) => setFormData({ ...formData, vat_rate: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="21">21% (standaard)</SelectItem>
                    <SelectItem value="9">9% (verlaagd)</SelectItem>
                    <SelectItem value="0">0% (vrijgesteld)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Adult price section */}
              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-medium">Volwassenen</h4>
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
                    <Label htmlFor="price_adult_note">Notitie</Label>
                    <Input
                      id="price_adult_note"
                      value={formData.price_adult_note}
                      onChange={(e) => setFormData({ ...formData, price_adult_note: e.target.value })}
                      placeholder="Bijv. incl. materiaal"
                    />
                  </div>
                </div>
              </div>

              {/* Child price section */}
              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-medium">Kinderen</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price_child">Prijs (€)</Label>
                    <Input
                      id="price_child"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price_child}
                      onChange={(e) => setFormData({ ...formData, price_child: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price_child_note">Notitie</Label>
                    <Input
                      id="price_child_note"
                      value={formData.price_child_note}
                      onChange={(e) => setFormData({ ...formData, price_child_note: e.target.value })}
                      placeholder="Bijv. onder begeleiding"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price_child_min_age">Leeftijd vanaf</Label>
                    <Input
                      id="price_child_min_age"
                      type="number"
                      min="0"
                      max="18"
                      value={formData.price_child_min_age}
                      onChange={(e) => setFormData({ ...formData, price_child_min_age: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price_child_max_age">Leeftijd t/m</Label>
                    <Input
                      id="price_child_max_age"
                      type="number"
                      min="0"
                      max="18"
                      value={formData.price_child_max_age}
                      onChange={(e) => setFormData({ ...formData, price_child_max_age: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Pet price section */}
              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-medium">Huisdieren</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price_pet">Prijs (€)</Label>
                    <Input
                      id="price_pet"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price_pet}
                      onChange={(e) => setFormData({ ...formData, price_pet: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price_pet_note">Notitie</Label>
                    <Input
                      id="price_pet_note"
                      value={formData.price_pet_note}
                      onChange={(e) => setFormData({ ...formData, price_pet_note: e.target.value })}
                      placeholder="Bijv. honden welkom"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab: Media */}
            <TabsContent value="media" className="space-y-4">
              {/* Info for new blocks about image upload */}
              {isNew && (
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm flex items-start gap-2">
                  <Info className="h-4 w-4 mt-0.5 shrink-0 text-blue-600" />
                  <p className="text-blue-800 dark:text-blue-200">
                    Na het opslaan kunt u een afbeelding toevoegen aan uw activiteit.
                  </p>
                </div>
              )}

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
            </TabsContent>
          </Tabs>

          {/* Info notice for existing published blocks */}
          {block && block.is_published && (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm mt-4 flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 shrink-0 text-blue-600" />
              <p className="text-blue-800 dark:text-blue-200">
                <strong>Let op:</strong> Wijzigingen aan gepubliceerde activiteiten worden direct zichtbaar.
              </p>
            </div>
          )}

          {/* Submit buttons */}
          <div className="flex gap-3 pt-6">
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

import { useState, useEffect } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import type { PartnerBuildingBlock } from "@/types/partner";

interface PartnerBlockSheetProps {
  isOpen: boolean;
  onClose: () => void;
  block: PartnerBuildingBlock | null;
  isNew: boolean;
  partnerId: string;
  onSaved: () => void;
}

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
      });
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
      });
    }
  }, [block, isOpen]);

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
          description: "Je nieuwe activiteit is ingediend ter goedkeuring door Bureau Vlieland.",
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
          description: "Je activiteit is bijgewerkt.",
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
              ? "Stel een nieuwe activiteit voor. Bureau Vlieland beoordeelt je voorstel en publiceert het na goedkeuring."
              : "Pas de gegevens van je activiteit aan."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
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
              placeholder="Uitgebreide beschrijving van je activiteit..."
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
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isNew ? "Voorstel indienen" : "Opslaan"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};
import { useState, useEffect } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAddPartnerExtraPreset, useUpdatePartnerExtraPreset } from "@/hooks/usePartnerExtraPresets";
import {
  type PartnerExtraPreset,
  type ExtraCategory,
  type ExtraPricingType,
  EXTRA_CATEGORY_LABELS,
} from "@/types/accommodationExtras";

interface PartnerExtraPresetSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preset: PartnerExtraPreset | null;
  partnerId: string;
}

export function PartnerExtraPresetSheet({
  open,
  onOpenChange,
  preset,
  partnerId,
}: PartnerExtraPresetSheetProps) {
  const { toast } = useToast();
  const addPreset = useAddPartnerExtraPreset();
  const updatePreset = useUpdatePartnerExtraPreset();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ExtraCategory>("fb");
  const [pricingType, setPricingType] = useState<ExtraPricingType>("per_person");
  const [unitPrice, setUnitPrice] = useState("");
  const [vatRate, setVatRate] = useState("9");
  const [priceIncludesVat, setPriceIncludesVat] = useState(true);

  const isEditing = !!preset;

  useEffect(() => {
    if (preset) {
      setName(preset.name);
      setDescription(preset.description || "");
      setCategory((preset.category as ExtraCategory) || "fb");
      setPricingType(preset.pricing_type);
      setUnitPrice(preset.unit_price.toString());
      setVatRate(preset.vat_rate.toString());
      setPriceIncludesVat(preset.price_includes_vat);
    } else {
      // Reset form for new preset
      setName("");
      setDescription("");
      setCategory("fb");
      setPricingType("per_person");
      setUnitPrice("");
      setVatRate("9");
      setPriceIncludesVat(true);
    }
  }, [preset, open]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({
        title: "Naam verplicht",
        description: "Vul een naam in voor de extra.",
        variant: "destructive",
      });
      return;
    }

    const price = parseFloat(unitPrice);
    if (isNaN(price) || price <= 0) {
      toast({
        title: "Ongeldige prijs",
        description: "Vul een geldige prijs in.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isEditing && preset) {
        await updatePreset.mutateAsync({
          id: preset.id,
          name: name.trim(),
          description: description.trim() || null,
          category,
          pricing_type: pricingType,
          unit_price: price,
          vat_rate: parseInt(vatRate),
          price_includes_vat: priceIncludesVat,
        });
        toast({
          title: "Extra bijgewerkt",
          description: `${name} is succesvol bijgewerkt.`,
        });
      } else {
        await addPreset.mutateAsync({
          partner_id: partnerId,
          name: name.trim(),
          description: description.trim() || null,
          category,
          pricing_type: pricingType,
          unit_price: price,
          vat_rate: parseInt(vatRate),
          price_includes_vat: priceIncludesVat,
        });
        toast({
          title: "Extra toegevoegd",
          description: `${name} is succesvol aangemaakt.`,
        });
      }
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Fout",
        description: "Er ging iets mis bij het opslaan.",
        variant: "destructive",
      });
    }
  };

  const isSubmitting = addPreset.isPending || updatePreset.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? "Extra bewerken" : "Nieuwe extra"}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Wijzig de gegevens van deze extra."
              : "Maak een nieuw sjabloon aan voor een extra dienst."}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Naam *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="bijv. Lunch (2-gangen)"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Omschrijving</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optionele beschrijving..."
              rows={2}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Categorie</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as ExtraCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EXTRA_CATEGORY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Pricing Type */}
          <div className="space-y-2">
            <Label>Prijstype</Label>
            <RadioGroup
              value={pricingType}
              onValueChange={(v) => setPricingType(v as ExtraPricingType)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="per_person" id="per_person" />
                <Label htmlFor="per_person" className="font-normal cursor-pointer">
                  Per persoon
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fixed" id="fixed" />
                <Label htmlFor="fixed" className="font-normal cursor-pointer">
                  Vast bedrag
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="price">Prijs *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                €
              </span>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="pl-7"
                placeholder="0,00"
              />
            </div>
          </div>

          {/* VAT */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vat">BTW-tarief</Label>
              <Select value={vatRate} onValueChange={setVatRate}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0%</SelectItem>
                  <SelectItem value="9">9%</SelectItem>
                  <SelectItem value="21">21%</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="includesVat"
                checked={priceIncludesVat}
                onCheckedChange={(checked) => setPriceIncludesVat(checked === true)}
              />
              <Label htmlFor="includesVat" className="font-normal cursor-pointer">
                Prijs is inclusief BTW
              </Label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Opslaan..." : "Opslaan"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

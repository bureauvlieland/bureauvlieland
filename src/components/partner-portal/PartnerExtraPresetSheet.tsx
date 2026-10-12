import { useEffect, useState } from "react";
import { Sheet, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { FormField, OptionCard, OptionGroup, ResponsiveSheetContent } from "@/components/system";
import { Euro, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAddPartnerExtraPreset, useUpdatePartnerExtraPreset } from "@/hooks/usePartnerExtraPresets";
import { EXTRA_CATEGORY_LABELS, type ExtraCategory, type ExtraPricingType, type PartnerExtraPreset } from "@/types/accommodationExtras";
import { SheetSection, selectClass } from "./SheetSection";

/**
 * De sheet voor een logies-extra (partnerportaal fase 4): dezelfde opbouw
 * als de kamersoortsheet, met de prijssoort als twee `OptionCard`s.
 */
interface PartnerExtraPresetSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preset: PartnerExtraPreset | null;
  partnerId: string;
}

export function PartnerExtraPresetSheet({ open, onOpenChange, preset, partnerId }: PartnerExtraPresetSheetProps) {
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
  const [errors, setErrors] = useState<{ name?: string; price?: string }>({});

  const isEditing = !!preset;

  useEffect(() => {
    if (!open) return;
    setName(preset?.name ?? "");
    setDescription(preset?.description ?? "");
    setCategory((preset?.category as ExtraCategory) || "fb");
    setPricingType(preset?.pricing_type ?? "per_person");
    setUnitPrice(preset ? preset.unit_price.toString() : "");
    setVatRate(preset ? preset.vat_rate.toString() : "9");
    setPriceIncludesVat(preset?.price_includes_vat ?? true);
    setErrors({});
  }, [preset, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(unitPrice.replace(",", "."));
    const next: { name?: string; price?: string } = {};
    if (!name.trim()) next.name = "Geef de extra een naam.";
    if (Number.isNaN(price) || price <= 0) next.price = "Vul een geldige prijs in.";
    setErrors(next);
    if (next.name || next.price) return;

    const data = {
      name: name.trim(),
      description: description.trim() || null,
      category,
      pricing_type: pricingType,
      unit_price: price,
      vat_rate: parseInt(vatRate, 10),
      price_includes_vat: priceIncludesVat,
    };
    try {
      if (isEditing && preset) await updatePreset.mutateAsync({ id: preset.id, ...data });
      else await addPreset.mutateAsync({ partner_id: partnerId, ...data });
      toast({ title: isEditing ? "Extra bijgewerkt" : "Extra toegevoegd", description: `${data.name} staat klaar voor uw offertes.` });
      onOpenChange(false);
    } catch {
      toast({ title: "Extra niet opgeslagen", description: "Er ging iets mis bij het opslaan. Probeer het opnieuw.", variant: "destructive" });
    }
  };

  const isSubmitting = addPreset.isPending || updatePreset.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResponsiveSheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="space-y-1 border-b px-6 py-4 text-left">
          <SheetTitle className="font-display text-display-md font-medium leading-tight">{isEditing ? "Extra bewerken" : "Nieuwe extra"}</SheetTitle>
          <SheetDescription>Een vaste extra die u met één klik aan een logiesofferte toevoegt.</SheetDescription>
        </SheetHeader>

        <form id="extra-formulier" onSubmit={(e) => void handleSubmit(e)} className="flex-1 space-y-6 overflow-y-auto px-6 py-4">
          <SheetSection title="Extra">
            <FormField label="Naam" htmlFor="extra-naam" required error={errors.name}>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bijvoorbeeld lunch, twee gangen" />
            </FormField>
            <FormField label="Omschrijving" htmlFor="extra-omschrijving">
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </FormField>
            <FormField label="Categorie" htmlFor="extra-categorie">
              <select className={selectClass} value={category} onChange={(e) => setCategory(e.target.value as ExtraCategory)}>
                {Object.entries(EXTRA_CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </FormField>
          </SheetSection>

          <SheetSection title="Prijs">
            <OptionGroup label="Prijssoort" columns={2}>
              <OptionCard selected={pricingType === "per_person"} onSelect={() => setPricingType("per_person")} title="Per persoon" description="Het bedrag keer het aantal gasten." />
              <OptionCard selected={pricingType === "fixed"} onSelect={() => setPricingType("fixed")} title="Vast bedrag" description="Eén bedrag voor de hele groep." />
            </OptionGroup>
            <FormField label="Prijs" htmlFor="extra-prijs" required leading={<Euro />} error={errors.price}>
              <Input type="text" inputMode="decimal" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} placeholder="0,00" />
            </FormField>
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex h-10 items-center gap-2">
                <Switch id="extra-inclbtw" checked={priceIncludesVat} onCheckedChange={setPriceIncludesVat} />
                <Label htmlFor="extra-inclbtw">Inclusief btw</Label>
              </div>
              <FormField label="Btw-tarief" htmlFor="extra-btw" className="w-28">
                <select className={selectClass} value={vatRate} onChange={(e) => setVatRate(e.target.value)}>
                  <option value="0">0%</option>
                  <option value="9">9%</option>
                  <option value="21">21%</option>
                </select>
              </FormField>
            </div>
          </SheetSection>
        </form>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t bg-background px-6 py-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button type="submit" form="extra-formulier" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />}
            {isEditing ? "Opslaan" : "Toevoegen"}
          </Button>
        </div>
      </ResponsiveSheetContent>
    </Sheet>
  );
}

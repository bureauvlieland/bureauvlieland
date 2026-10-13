import { useEffect, useState } from "react";
import { Sheet, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { FormField, OptionCard, OptionGroup, ResponsiveSheetContent } from "@/components/system";
import { Euro, Loader2 } from "lucide-react";
import { useAddPartnerRoomType, useUpdatePartnerRoomType } from "@/hooks/usePartnerRoomTypes";
import type { PartnerRoomType } from "@/types/partnerRoomTypes";
import { BED_CONFIGURATIONS, ROOM_FACILITIES } from "@/types/partnerRoomTypes";
import { PartnerImageUpload } from "./PartnerImageUpload";
import { SheetSection, selectClass } from "./SheetSection";

/**
 * De kamersoortsheet (partnerportaal fase 4): kop, scrollende body in
 * secties op `FormField`, faciliteiten als `OptionCard`s, vaste voet met
 * één primaire knop. Op een telefoon van onderen.
 */
interface PartnerRoomTypeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerId: string;
  roomType?: PartnerRoomType | null;
}

export function PartnerRoomTypeSheet({ open, onOpenChange, partnerId, roomType }: PartnerRoomTypeSheetProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sizeSqm, setSizeSqm] = useState("");
  const [bedConfiguration, setBedConfiguration] = useState("");
  const [maxOccupancy, setMaxOccupancy] = useState("2");
  const [facilities, setFacilities] = useState<string[]>([]);
  const [roomImages, setRoomImages] = useState<{ url: string; alt?: string }[]>([]);
  const [pricePerNight, setPricePerNight] = useState("");
  const [priceIncludesVat, setPriceIncludesVat] = useState(true);
  const [vatRate, setVatRate] = useState("9");
  const [nameError, setNameError] = useState<string | null>(null);

  const addMutation = useAddPartnerRoomType();
  const updateMutation = useUpdatePartnerRoomType();
  const isEditing = !!roomType;

  useEffect(() => {
    if (!open) return;
    setName(roomType?.name ?? "");
    setDescription(roomType?.description ?? "");
    setSizeSqm(roomType?.size_sqm?.toString() ?? "");
    setBedConfiguration(roomType?.bed_configuration ?? "");
    setMaxOccupancy(roomType?.max_occupancy?.toString() ?? "2");
    setFacilities(roomType?.facilities ?? []);
    setRoomImages(roomType?.images ?? []);
    setPricePerNight(roomType?.price_per_night?.toString() ?? "");
    setPriceIncludesVat(roomType?.price_includes_vat ?? true);
    setVatRate(roomType?.vat_rate?.toString() ?? "9");
    setNameError(null);
  }, [roomType, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError("Geef de kamersoort een naam.");
      return;
    }
    const data = {
      name: name.trim(),
      description: description.trim() || null,
      size_sqm: sizeSqm ? parseInt(sizeSqm, 10) : null,
      bed_configuration: bedConfiguration || null,
      max_occupancy: parseInt(maxOccupancy, 10) || 2,
      facilities,
      images: roomImages,
      price_per_night: pricePerNight ? parseFloat(pricePerNight) : null,
      price_includes_vat: priceIncludesVat,
      vat_rate: parseFloat(vatRate),
    };
    const onSuccess = () => onOpenChange(false);
    if (isEditing && roomType) updateMutation.mutate({ id: roomType.id, partnerId, data }, { onSuccess });
    else addMutation.mutate({ ...data, partner_id: partnerId }, { onSuccess });
  };

  const toggleFacility = (value: string) => setFacilities((prev) => (prev.includes(value) ? prev.filter((f) => f !== value) : [...prev, value]));
  const isLoading = addMutation.isPending || updateMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResponsiveSheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="space-y-1 border-b px-6 py-4 text-left">
          <SheetTitle className="font-display text-display-md font-medium leading-tight">{isEditing ? "Kamersoort bewerken" : "Nieuwe kamersoort"}</SheetTitle>
          <SheetDescription>De klant ziet de foto's, bedden en faciliteiten van deze kamersoort bij uw offerte.</SheetDescription>
        </SheetHeader>

        <form id="kamersoort-formulier" onSubmit={handleSubmit} className="flex-1 space-y-6 overflow-y-auto px-6 py-4">
          <SheetSection title="Kamersoort">
            <FormField label="Naam" htmlFor="kamersoort-naam" required error={nameError}>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameError(null);
                }}
                placeholder="Bijvoorbeeld Tweepersoonskamer Superior"
              />
            </FormField>
            <FormField label="Omschrijving" htmlFor="kamersoort-omschrijving">
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ruime kamer met zeezicht." rows={3} />
            </FormField>
          </SheetSection>

          <SheetSection title="Kamer">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Oppervlakte (m²)" htmlFor="kamersoort-oppervlakte">
                <Input type="number" min={0} value={sizeSqm} onChange={(e) => setSizeSqm(e.target.value)} placeholder="28" />
              </FormField>
              <FormField label="Maximaal personen" htmlFor="kamersoort-personen">
                <Input type="number" min={1} value={maxOccupancy} onChange={(e) => setMaxOccupancy(e.target.value)} />
              </FormField>
            </div>
            <FormField label="Bedden" htmlFor="kamersoort-bedden">
              <select className={selectClass} value={bedConfiguration} onChange={(e) => setBedConfiguration(e.target.value)}>
                <option value="">Kies de bedden</option>
                {BED_CONFIGURATIONS.map((config) => (
                  <option key={config.value} value={config.value}>
                    {config.label}
                  </option>
                ))}
              </select>
            </FormField>
            <OptionGroup label="Faciliteiten" selection="multiple" columns={2}>
              {ROOM_FACILITIES.map((facility) => (
                <OptionCard key={facility.value} selection="multiple" selected={facilities.includes(facility.value)} onSelect={() => toggleFacility(facility.value)} title={facility.label} />
              ))}
            </OptionGroup>
          </SheetSection>

          <SheetSection title="Foto's" help="Maximaal vier foto's; de eerste is de hoofdfoto.">
            <PartnerImageUpload partnerId={partnerId} images={roomImages} onImagesChange={setRoomImages} storagePath={`rooms/${roomType?.id || "new"}`} maxImages={4} label="" />
          </SheetSection>

          <SheetSection title="Prijs">
            <FormField label="Prijs per nacht" htmlFor="kamersoort-prijs" leading={<Euro />} help="Richtprijs; in de offerte vult u de prijs per aanvraag in.">
              <Input type="number" step="0.01" min={0} value={pricePerNight} onChange={(e) => setPricePerNight(e.target.value)} placeholder="125,00" />
            </FormField>
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex h-10 items-center gap-2">
                <Switch id="kamersoort-inclbtw" checked={priceIncludesVat} onCheckedChange={setPriceIncludesVat} />
                <Label htmlFor="kamersoort-inclbtw">Inclusief btw</Label>
              </div>
              <FormField label="Btw-tarief" htmlFor="kamersoort-btw" className="w-28">
                <select className={selectClass} value={vatRate} onChange={(e) => setVatRate(e.target.value)}>
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
          <Button type="submit" form="kamersoort-formulier" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />}
            {isEditing ? "Opslaan" : "Toevoegen"}
          </Button>
        </div>
      </ResponsiveSheetContent>
    </Sheet>
  );
}

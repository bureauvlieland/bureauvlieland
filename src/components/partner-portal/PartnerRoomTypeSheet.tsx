import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAddPartnerRoomType, useUpdatePartnerRoomType } from "@/hooks/usePartnerRoomTypes";
import type { PartnerRoomType } from "@/types/partnerRoomTypes";
import { ROOM_FACILITIES, BED_CONFIGURATIONS } from "@/types/partnerRoomTypes";
import { PartnerImageUpload } from "./PartnerImageUpload";



interface PartnerRoomTypeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerId: string;
  roomType?: PartnerRoomType | null;
}

export function PartnerRoomTypeSheet({
  open,
  onOpenChange,
  partnerId,
  roomType,
}: PartnerRoomTypeSheetProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sizeSqm, setSizeSqm] = useState<string>("");
  const [bedConfiguration, setBedConfiguration] = useState("");
  const [maxOccupancy, setMaxOccupancy] = useState<string>("2");
  const [facilities, setFacilities] = useState<string[]>([]);
  const [roomImages, setRoomImages] = useState<{ url: string; alt?: string }[]>([]);
  const [pricePerNight, setPricePerNight] = useState<string>("");
  const [priceIncludesVat, setPriceIncludesVat] = useState(true);
  const [vatRate, setVatRate] = useState("9");

  const addMutation = useAddPartnerRoomType();
  const updateMutation = useUpdatePartnerRoomType();
  const isEditing = !!roomType;

  useEffect(() => {
    if (roomType) {
      setName(roomType.name);
      setDescription(roomType.description || "");
      setSizeSqm(roomType.size_sqm?.toString() || "");
      setBedConfiguration(roomType.bed_configuration || "");
      setMaxOccupancy(roomType.max_occupancy?.toString() || "2");
      setRoomImages(roomType.images || []);
      setPricePerNight(roomType.price_per_night?.toString() || "");
      setPriceIncludesVat(roomType.price_includes_vat);
      setVatRate(roomType.vat_rate?.toString() || "9");
    } else {
      resetForm();
    }
  }, [roomType, open]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setSizeSqm("");
    setBedConfiguration("");
    setMaxOccupancy("2");
    setFacilities([]);
    setRoomImages([]);
    setPricePerNight("");
    setPriceIncludesVat(true);
    setVatRate("9");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      name,
      description: description || null,
      size_sqm: sizeSqm ? parseInt(sizeSqm) : null,
      bed_configuration: bedConfiguration || null,
      max_occupancy: parseInt(maxOccupancy) || 2,
      facilities,
      images: roomImages,
      price_per_night: pricePerNight ? parseFloat(pricePerNight) : null,
      price_includes_vat: priceIncludesVat,
      vat_rate: parseFloat(vatRate),
    };

    if (isEditing && roomType) {
      updateMutation.mutate(
        { id: roomType.id, partnerId, data },
        {
          onSuccess: () => {
            onOpenChange(false);
            resetForm();
          },
        }
      );
    } else {
      addMutation.mutate(
        { ...data, partner_id: partnerId },
        {
          onSuccess: () => {
            onOpenChange(false);
            resetForm();
          },
        }
      );
    }
  };

  const toggleFacility = (value: string) => {
    setFacilities(prev =>
      prev.includes(value)
        ? prev.filter(f => f !== value)
        : [...prev, value]
    );
  };

  const isLoading = addMutation.isPending || updateMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? "Kamertype bewerken" : "Nieuw kamertype"}
          </SheetTitle>
          <SheetDescription>
            Configureer de details van dit kamertype voor hergebruik in offertes.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Naam *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="bijv. Tweepersoonskamer Superior"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Omschrijving</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ruime kamer met zeezicht..."
                rows={3}
              />
            </div>
          </div>

          {/* Specifications */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">Specificaties</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sizeSqm">Oppervlakte (m²)</Label>
                <Input
                  id="sizeSqm"
                  type="number"
                  value={sizeSqm}
                  onChange={(e) => setSizeSqm(e.target.value)}
                  placeholder="28"
                />
              </div>

              <div>
                <Label htmlFor="maxOccupancy">Max. personen</Label>
                <Input
                  id="maxOccupancy"
                  type="number"
                  min="1"
                  value={maxOccupancy}
                  onChange={(e) => setMaxOccupancy(e.target.value)}
                  placeholder="2"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="bedConfiguration">Bedconfiguratie</Label>
              <Select value={bedConfiguration} onValueChange={setBedConfiguration}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer bedtype" />
                </SelectTrigger>
                <SelectContent>
                  {BED_CONFIGURATIONS.map((config) => (
                    <SelectItem key={config.value} value={config.value}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Facilities */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">Faciliteiten</h4>
            <div className="grid grid-cols-2 gap-2">
              {ROOM_FACILITIES.map((facility) => (
                <div key={facility.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={facility.value}
                    checked={facilities.includes(facility.value)}
                    onCheckedChange={() => toggleFacility(facility.value)}
                  />
                  <Label htmlFor={facility.value} className="text-sm font-normal cursor-pointer">
                    {facility.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">Prijs</h4>
            
            <div>
              <Label htmlFor="pricePerNight">Prijs per nacht (€)</Label>
              <Input
                id="pricePerNight"
                type="number"
                step="0.01"
                value={pricePerNight}
                onChange={(e) => setPricePerNight(e.target.value)}
                placeholder="125.00"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="priceIncludesVat"
                  checked={priceIncludesVat}
                  onCheckedChange={(checked) => setPriceIncludesVat(checked === true)}
                />
                <Label htmlFor="priceIncludesVat" className="text-sm font-normal">
                  Inclusief BTW
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor="vatRate" className="text-sm whitespace-nowrap">
                  BTW-tarief:
                </Label>
                <Select value={vatRate} onValueChange={setVatRate}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="9">9%</SelectItem>
                    <SelectItem value="21">21%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Annuleren
            </Button>
            <Button type="submit" disabled={!name || isLoading} className="flex-1">
              {isLoading ? "Bezig..." : isEditing ? "Opslaan" : "Toevoegen"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Info, Trash2, Save, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { logAdminActivity, AdminActions, EntityTypes } from "@/lib/adminLogger";
import { LocationPicker } from "@/components/admin/LocationPicker";
import { resolveAutoTodo } from "@/lib/autoTodoCreator";
import { getPriceTypeSuffix } from "@/lib/portalPricing";

interface PartnerOption {
  id: string;
  name: string;
  email: string | null;
}

interface ProgramRequestItem {
  id: string;
  block_id: string;
  block_name: string;
  block_category: string;
  block_type: string;
  provider_name: string;
  provider_id: string;
  provider_email: string | null;
  day_index: number;
  preferred_time: string | null;
  customer_notes: string | null;
  status: string;
  admin_price_override: number | null;
  admin_price_notes: string | null;
  price_type?: string | null;
  override_people?: number | null;
  location_lat?: number | null;
  location_lng?: number | null;
  location_address?: string | null;
}

interface AdminEditActivitySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ProgramRequestItem | null;
  requestId: string;
  selectedDates: string[];
  onSuccess: () => void;
  numberOfPeople: number;
}

export const AdminEditActivitySheet = ({
  open,
  onOpenChange,
  item,
  requestId,
  selectedDates,
  onSuccess,
  numberOfPeople,
}: AdminEditActivitySheetProps) => {
  // Form state — lazy-init from `item` so the first render already has the
  // correct values (LocationPicker mounts immediately and bakes lat/lng into Leaflet).
  const [customName, setCustomName] = useState(item?.block_name ?? "");
  const [customDescription, setCustomDescription] = useState(item?.admin_price_notes ?? "");
  const [selectedDayIndex, setSelectedDayIndex] = useState(item?.day_index ?? 0);
  const [preferredTime, setPreferredTime] = useState(item?.preferred_time ?? "flexibel");
  const [priceOverride, setPriceOverride] = useState(item?.admin_price_override?.toString() ?? "");
  const [priceType, setPriceType] = useState<"per_person" | "per_person_per_day" | "total">(
    (item?.price_type === "per_person_per_day" || item?.price_type === "total")
      ? item.price_type
      : "per_person"
  );
  const [invoicedBy, setInvoicedBy] = useState<"bureau" | "partner">(
    item?.block_type === "bureau" ? "bureau" : "partner"
  );
  const [notes, setNotes] = useState(item?.customer_notes ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [locationLat, setLocationLat] = useState<number | null>(item?.location_lat ?? null);
  const [locationLng, setLocationLng] = useState<number | null>(item?.location_lng ?? null);
  const [locationAddress, setLocationAddress] = useState(item?.location_address ?? "");
  const [selectedProviderId, setSelectedProviderId] = useState(item?.provider_id ?? "bureau");
  const [partners, setPartners] = useState<PartnerOption[]>([]);

  // Fetch partners for executor dropdown
  useEffect(() => {
    const fetchPartners = async () => {
      const { data } = await supabase
        .from("partners")
        .select("id, name, email")
        .eq("is_active", true)
        .order("name");
      if (data) setPartners(data);
    };
    if (open) fetchPartners();
  }, [open]);

  // Initialize form when item changes
  useEffect(() => {
    if (item) {
      setCustomName(item.block_name);
      setCustomDescription(item.admin_price_notes || "");
      setSelectedDayIndex(item.day_index);
      setPreferredTime(item.preferred_time || "flexibel");
      setPriceOverride(item.admin_price_override?.toString() || "");
      const pt = (item.price_type as "per_person" | "per_person_per_day" | "total" | null) || "per_person";
      setPriceType(pt === "per_person_per_day" || pt === "total" ? pt : "per_person");
      setInvoicedBy(item.block_type === "bureau" ? "bureau" : "partner");
      setNotes(item.customer_notes || "");
      setSelectedProviderId(item.provider_id || "bureau");
      setLocationLat(item.location_lat ?? null);
      setLocationLng(item.location_lng ?? null);
      setLocationAddress(item.location_address || "");
    }
  }, [item]);

  const handleSave = async () => {
    if (!item) return;

    // --- Validatie ---
    const trimmedName = customName.trim();
    if (!trimmedName) {
      toast.error("Omschrijving is verplicht");
      return;
    }
    const rawPrice = priceOverride.trim();
    if (rawPrice === "") {
      toast.error("Prijs is verplicht — vul een bedrag in groter dan €0");
      return;
    }
    const price = parseFloat(rawPrice);
    if (!isFinite(price)) {
      toast.error("Prijs is geen geldig getal");
      return;
    }
    if (price < 0) {
      toast.error("Prijs mag niet negatief zijn");
      return;
    }
    if (price === 0) {
      toast.error("Prijs moet groter zijn dan €0");
      return;
    }
    if (!["per_person", "per_person_per_day", "total"].includes(priceType)) {
      toast.error("Ongeldig prijstype geselecteerd");
      return;
    }
    if (invoicedBy === "partner" && (!selectedProviderId || selectedProviderId === "bureau")) {
      toast.error("Kies een partner als uitvoerder, of zet facturatie op Bureau Vlieland");
      return;
    }

    setIsSubmitting(true);
    try {
      const time = preferredTime === "flexibel" ? null : preferredTime;
      // Fase 4b — admin-tijd is altijd één bron van waarheid: zowel preferred_time
      // als confirmed_time mee-updaten zodat alle weergaven (lijst, popup, klant,
      // partner) hetzelfde tonen. Geen "was: X" meer als gevolg van out-of-sync.
      const timeChanged = (item?.preferred_time || null) !== time;

      // Determine provider based on selected executor
      const isBureauInvoiced = invoicedBy === "bureau";
      const selectedPartner = partners.find(p => p.id === selectedProviderId);
      
      const updateData: Record<string, unknown> = {
        block_name: trimmedName,
        admin_price_notes: customDescription || null,
        day_index: selectedDayIndex,
        preferred_time: time,
        ...(timeChanged
          ? {
              confirmed_time: time,
              proposed_time: null,
              status_note: time
                ? `Tijd ${time} ingesteld door admin`
                : "Tijd verwijderd door admin",
              status_updated_at: new Date().toISOString(),
            }
          : {}),
        admin_price_override: price,
        price_type: priceType,
        customer_notes: notes || null,
        block_type: isBureauInvoiced ? "bureau" : "partner",
        location_lat: locationLat,
        location_lng: locationLng,
        location_address: locationAddress || null,
        provider_id: selectedProviderId || "bureau",
        provider_name: selectedProviderId === "bureau" 
          ? "Bureau Vlieland" 
          : (selectedPartner?.name || item.provider_name),
        provider_email: selectedProviderId === "bureau" 
          ? null 
          : (selectedPartner?.email || item.provider_email),
      };

      // Bureau-eigen kostenposten met een prijs hoeven geen klant-akkoord:
      // direct als bevestigd markeren zodat de status-teller klopt.
      if (isBureauInvoiced && item.status === "pending") {
        const nowIso = new Date().toISOString();
        updateData.status = "confirmed";
        updateData.item_quote_status = "bevestigd";
        updateData.quoted_at = nowIso;
        updateData.customer_approved_at = nowIso;
        updateData.customer_accepted_at = nowIso;
        updateData.skip_partner_notification = true;
      }

      const { error } = await supabase
        .from("program_request_items")
        .update(updateData)
        .eq("id", item.id);

      if (error) throw error;

      // Resolve bureau_item_pricing todo if price was set on a bureau item
      if (isBureauInvoiced) {
        await resolveAutoTodo("bureau_item_pricing", item.id);
      }

      // Log admin activity
      await logAdminActivity({
        action: AdminActions.ITEM_STATUS_CHANGED,
        entityType: EntityTypes.REQUEST,
        entityId: requestId,
        details: {
          action: "activity_edited",
          item_id: item.id,
          block_name: customName,
        },
      });

      toast.success("Activiteit bijgewerkt");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error updating activity:", error);
      toast.error("Fout bij bijwerken activiteit");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("program_request_items")
        .delete()
        .eq("id", item.id);

      if (error) throw error;

      // Log admin activity
      await logAdminActivity({
        action: AdminActions.ITEM_STATUS_CHANGED,
        entityType: EntityTypes.REQUEST,
        entityId: requestId,
        details: {
          action: "activity_deleted",
          item_id: item.id,
          block_name: item.block_name,
        },
      });

      toast.success(`${item.block_name} verwijderd uit de offerte`);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error deleting activity:", error);
      toast.error("Fout bij verwijderen activiteit");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!item) return null;

  const selectedProviderName = selectedProviderId === "bureau"
    ? "Bureau Vlieland"
    : (partners.find(p => p.id === selectedProviderId)?.name || item.provider_name);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b shrink-0">
          <SheetTitle>Activiteit bewerken</SheetTitle>
          <SheetDescription>
            Pas de details van deze activiteit aan
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Custom name */}
          <div className="space-y-2">
            <Label htmlFor="editName">Omschrijving</Label>
            <Input
              id="editName"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Naam van de activiteit..."
            />
          </div>

          {/* Custom description for customer */}
          <div className="space-y-2">
            <Label htmlFor="editDescription">Beschrijving voor klant (optioneel)</Label>
            <Textarea
              id="editDescription"
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              placeholder="Bijv. 'Met 2 boten' of 'Inclusief gids'..."
              rows={2}
            />
          </div>

          {/* Uitvoerder (executor) selection */}
          <div className="space-y-2">
            <Label htmlFor="editProvider">Uitvoerder</Label>
            <Select value={selectedProviderId} onValueChange={setSelectedProviderId}>
              <SelectTrigger id="editProvider">
                <SelectValue placeholder="Kies een uitvoerder..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bureau">Bureau Vlieland</SelectItem>
                {partners.map((partner) => (
                  <SelectItem key={partner.id} value={partner.id}>
                    {partner.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Invoiced by */}
          <div className="space-y-3">
            <Label>Gefactureerd door</Label>
            <RadioGroup
              value={invoicedBy}
              onValueChange={(v) => setInvoicedBy(v as "bureau" | "partner")}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bureau" id="edit-invoice-bureau" />
                <Label htmlFor="edit-invoice-bureau" className="font-normal cursor-pointer">
                  Bureau Vlieland
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="partner" id="edit-invoice-partner" />
                <Label htmlFor="edit-invoice-partner" className="font-normal cursor-pointer">
                  {selectedProviderName}
                </Label>
              </div>
            </RadioGroup>

            {/* Info when Bureau invoicing is selected but executor is a partner */}
            {invoicedBy === "bureau" && selectedProviderId && selectedProviderId !== "bureau" && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-blue-50 border border-blue-200 text-sm">
                <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <div className="text-blue-800">
                  <p className="font-medium">Facturatie via Bureau Vlieland</p>
                  <p className="text-blue-700 mt-1">
                    {selectedProviderName} ontvangt wel een aanvraag en ziet dit item in hun portaal, maar hoeft geen factuur in te dienen. De facturatie loopt via Bureau Vlieland.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Day selection */}
          {selectedDates.length > 1 && (
            <div className="space-y-3">
              <Label>Op welke dag?</Label>
              <RadioGroup
                value={String(selectedDayIndex)}
                onValueChange={(v) => setSelectedDayIndex(Number(v))}
              >
                {selectedDates.map((date, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <RadioGroupItem value={String(index)} id={`edit-day-${index}`} />
                    <Label htmlFor={`edit-day-${index}`} className="font-normal cursor-pointer">
                      Dag {index + 1} - {format(new Date(date), "d MMMM yyyy", { locale: nl })}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Time preference */}
          <div className="space-y-2">
            <Label>Voorkeurstijd</Label>
            <div className="flex items-center gap-3">
              <Checkbox
                id="editFlexibel"
                checked={preferredTime === "flexibel"}
                onCheckedChange={(checked) => {
                  setPreferredTime(checked ? "flexibel" : "10:00");
                }}
              />
              <Label htmlFor="editFlexibel" className="font-normal cursor-pointer">Flexibel</Label>
            </div>
            {preferredTime !== "flexibel" && (
              <Input
                type="time"
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
              />
            )}
          </div>

          {/* Price override */}
          <div className="space-y-2">
            <Label htmlFor="editPrice">Prijs voor klant (€)</Label>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Input
                id="editPrice"
                type="number"
                step="0.01"
                min="0"
                value={priceOverride}
                onChange={(e) => setPriceOverride(e.target.value)}
                placeholder={priceType === "total" ? "Totaalprijs" : "Prijs per persoon"}
              />
              <Select value={priceType} onValueChange={(v) => setPriceType(v as typeof priceType)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_person">Per persoon</SelectItem>
                  <SelectItem value="per_person_per_day">Per persoon per dag</SelectItem>
                  <SelectItem value="total">Totaalbedrag</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(() => {
              const fmt = (n: number) =>
                n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              const price = parseFloat(priceOverride);
              const hasPrice = isFinite(price) && price > 0;
              const days = Math.max(selectedDates.length, 1);
              // Mirror portalPricing: gebruik override_people indien gezet, anders programma-totaal
              const effectivePeople = Math.max(item?.override_people ?? numberOfPeople, 1);

              const total = !hasPrice
                ? 0
                : priceType === "total"
                  ? price
                  : priceType === "per_person_per_day"
                    ? price * effectivePeople * days
                    : price * effectivePeople;

              const breakdown =
                priceType === "total"
                  ? "Vast totaalbedrag voor de hele groep"
                  : priceType === "per_person_per_day"
                    ? `€${fmt(price)} p.p.p.d. × ${effectivePeople} personen × ${days} dagen`
                    : `€${fmt(price)} p.p. × ${effectivePeople} personen`;

              return (
                <div className="space-y-2 rounded-md border bg-muted/40 p-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm text-muted-foreground">{breakdown}</span>
                    <span className="text-base font-semibold text-foreground">
                      €{fmt(total)}
                    </span>
                  </div>
                  {!hasPrice && (
                    <p className="text-xs text-muted-foreground italic">
                      Vul een bedrag in om het totaal te berekenen.
                    </p>
                  )}
                  {priceType === "per_person" && hasPrice && price > 500 && (
                    <div className="flex items-start gap-2 p-2 rounded-md bg-amber-50 border border-amber-200 text-sm">
                      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                      <p className="text-amber-800">
                        Weet je zeker dat dit een prijs <strong>per persoon</strong> is en geen totaalbedrag? Wijzig anders het prijstype hiernaast.
                      </p>
                    </div>
                  )}
                  {priceType === "total" && hasPrice && price < 50 && effectivePeople > 10 && (
                    <div className="flex items-start gap-2 p-2 rounded-md bg-amber-50 border border-amber-200 text-sm">
                      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                      <p className="text-amber-800">
                        Weet je zeker dat dit een <strong>totaalbedrag</strong> is voor de hele groep en geen prijs per persoon? Wijzig anders het prijstype hiernaast.
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label>Locatie (optioneel)</Label>
            <LocationPicker
              key={item.id}
              lat={locationLat}
              lng={locationLng}
              address={locationAddress}
              onChange={(lat, lng, addr) => {
                setLocationLat(lat);
                setLocationLng(lng);
                setLocationAddress(addr);
              }}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="editNotes">Opmerking klant (optioneel)</Label>
            <Textarea
              id="editNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Specifieke wensen van de klant..."
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isDeleting || isSubmitting}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Verwijderen
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Activiteit verwijderen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Weet je zeker dat je "{item.block_name}" wilt verwijderen uit deze offerte? 
                    Dit kan niet ongedaan worden gemaakt.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuleren</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Verwijderen
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="flex-1" />

            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Annuleren
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting || isDeleting}>
              <Save className="h-4 w-4 mr-2" />
              Opslaan
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

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
import { useAutoSaveField } from "@/hooks/useAutoSaveField";
import { FieldSaveIndicator } from "@/components/admin/FieldSaveIndicator";
import { formatTimeHHmm } from "@/lib/timeUtils";
import { checkCapacity } from "@/lib/capacityCheck";

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
  partner_instructions?: string | null;
  pending_partner_instructions?: string | null;
  pending_block_name?: string | null;
  pending_admin_price_notes?: string | null;
  pending_customer_notes?: string | null;
  price_type?: string | null;
  override_people?: number | null;
  location_lat?: number | null;
  location_lng?: number | null;
  location_address?: string | null;
  pending_added?: boolean | null;
  pending_marked_for_removal?: boolean | null;
  is_custom_quote?: boolean | null;
  custom_briefing?: string | null;
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
  // Facturatie is altijd centraal via Bureau Vlieland; block_type wordt afgeleid van de provider.
  const [notes, setNotes] = useState(item?.customer_notes ?? "");
  const [partnerInstructions, setPartnerInstructions] = useState(
    item?.pending_partner_instructions ?? item?.partner_instructions ?? ""
  );
  const [customBriefing, setCustomBriefing] = useState(item?.custom_briefing ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [locationLat, setLocationLat] = useState<number | null>(item?.location_lat ?? null);
  const [locationLng, setLocationLng] = useState<number | null>(item?.location_lng ?? null);
  const [locationAddress, setLocationAddress] = useState(item?.location_address ?? "");
  const [selectedProviderId, setSelectedProviderId] = useState(item?.provider_id ?? "bureau");
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [showDirtyConfirm, setShowDirtyConfirm] = useState(false);

  // --- Auto-save voor de tekstvelden zonder validatie. Schrijft naar
  // pending_<col> met debounce; status zichtbaar onder elk veld zodat
  // admin nooit twijfelt of het opgeslagen is.
  const autoNameInitial = (item as any)?.pending_block_name ?? item?.block_name ?? "";
  const autoDescInitial = (item as any)?.pending_admin_price_notes ?? item?.admin_price_notes ?? "";
  const autoNotesInitial = (item as any)?.pending_customer_notes ?? item?.customer_notes ?? "";
  const autoInstrInitial = item?.pending_partner_instructions ?? item?.partner_instructions ?? "";

  const nameSave = useAutoSaveField({
    item,
    field: "block_name",
    value: customName,
    initialValue: autoNameInitial,
    disabled: !open || !item,
  });
  const descSave = useAutoSaveField({
    item,
    field: "admin_price_notes",
    value: customDescription,
    initialValue: autoDescInitial,
    disabled: !open || !item,
  });
  const notesSave = useAutoSaveField({
    item,
    field: "customer_notes",
    value: notes,
    initialValue: autoNotesInitial,
    disabled: !open || !item,
  });
  const instrSave = useAutoSaveField({
    item,
    field: "partner_instructions",
    value: partnerInstructions,
    initialValue: autoInstrInitial,
    disabled: !open || !item,
  });
  const briefingSave = useAutoSaveField({
    item,
    field: "custom_briefing",
    value: customBriefing,
    initialValue: item?.custom_briefing ?? "",
    disabled: !open || !item || !item?.is_custom_quote,
  });

  const anyAutoSaveBusy = [nameSave, descSave, notesSave, instrSave, briefingSave].some(
    (s) => s.status === "saving" || s.isDirty,
  );

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
      // invoicedBy is verwijderd — facturatie is altijd centraal.
      setNotes(item.customer_notes || "");
      setPartnerInstructions(item.pending_partner_instructions ?? item.partner_instructions ?? "");
      setSelectedProviderId(item.provider_id || "bureau");
      setLocationLat(item.location_lat ?? null);
      setLocationLng(item.location_lng ?? null);
      setLocationAddress(item.location_address || "");
      setCustomBriefing(item.custom_briefing ?? "");
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
    if (!selectedProviderId) {
      toast.error("Kies een uitvoerder (Bureau Vlieland of een partner)");
      return;
    }

    setIsSubmitting(true);
    try {
      const time = preferredTime === "flexibel" ? null : preferredTime;
      const selectedPartner = partners.find(p => p.id === selectedProviderId);
      const newProviderId = selectedProviderId || "bureau";
      const newProviderName = newProviderId === "bureau"
        ? "Bureau Vlieland"
        : (selectedPartner?.name || item.provider_name);
      const newProviderEmail = newProviderId === "bureau"
        ? null
        : (selectedPartner?.email || item.provider_email);
      // block_type wordt afgeleid van de provider (facturatie is altijd centraal).
      const BUREAU_IDS = new Set(["bureau", "bureau-vlieland", "rederij", "fietsverhuur", "bagagevervoer-vlieland"]);
      const newBlockType: "bureau" | "partner" | "self_arranged" =
        BUREAU_IDS.has(newProviderId)
          ? "bureau"
          : (item.block_type === "self_arranged" ? "self_arranged" : "partner");

      // Onderdeel is nog niet gepubliceerd (pending_added) → bewerkingen mogen
      // direct live, want klant/partner zien dit item nog niet.
      const isStillDraft = item.pending_added === true;

      const liveTimeChanged = (item?.preferred_time || null) !== time;

      if (isStillDraft) {
        const updateData: Record<string, unknown> = {
          block_name: trimmedName,
          admin_price_notes: customDescription || null,
          day_index: selectedDayIndex,
          preferred_time: time,
          ...(liveTimeChanged
            ? {
                confirmed_time: time,
                proposed_time: null,
                // Draft (pending_added): geen status_note schrijven — de klant
                // ziet dit item nog niet, dus er is geen wijziging te melden.
              }
            : {}),
          admin_price_override: price,
          price_type: priceType,
          customer_notes: notes || null,
          partner_instructions: partnerInstructions || null,
          block_type: newBlockType,
          location_lat: locationLat,
          location_lng: locationLng,
          location_address: locationAddress || null,
          provider_id: newProviderId,
          provider_name: newProviderName,
          provider_email: newProviderEmail,
        };

        // Bureau-post conceptueel voorbereiden, maar nooit namens de klant
        // goedkeuren. Klantgoedkeuring loopt uitsluitend via de klantportal.
        const isBureauItemNow = newBlockType === "bureau";
        if (isBureauItemNow && item.status === "pending" && !item.pending_added) {
          const nowIso = new Date().toISOString();
          updateData.status = "confirmed";
          updateData.item_quote_status = "bevestigd";
          updateData.quoted_at = nowIso;
          updateData.skip_partner_notification = true;
        }

        const { error } = await supabase
          .from("program_request_items")
          .update(updateData as any)
          .eq("id", item.id);
        if (error) throw error;

        if (isBureauItemNow) {
          await resolveAutoTodo("bureau_item_pricing", item.id);
        }
      } else {
        // Pending-flow: schrijf wijzigingen naar pending_* kolommen. Pas bij
        // "Publiceer & notificeer" worden ze live + krijgen klant/partner mail.
        // Per veld: alleen pending zetten als waarde echt afwijkt van live;
        // anders pending_ leegmaken zodat hij niet meer als "wijziging" telt.
        const diff = <T,>(live: T, next: T): T | null =>
          JSON.stringify(live ?? null) === JSON.stringify(next ?? null) ? null : next;

        const pendingUpdate: Record<string, unknown> = {
          pending_block_name: diff(item.block_name, trimmedName),
          pending_admin_price_notes: diff(item.admin_price_notes ?? null, customDescription || null),
          pending_day_index: diff(item.day_index, selectedDayIndex),
          pending_preferred_time: diff(item.preferred_time ?? null, time),
          pending_admin_price_override: diff(item.admin_price_override ?? null, price),
          pending_price_type: diff(item.price_type ?? "per_person", priceType),
          pending_customer_notes: diff(item.customer_notes ?? null, notes || null),
          pending_partner_instructions: diff(item.partner_instructions ?? null, partnerInstructions || null),
          pending_block_type: diff(item.block_type, newBlockType),
          // Locatie als groep behandelen: zodra adres, lat of lng wijzigt,
          // schrijven we alle drie naar pending. Zo kan bv. een adres-wijziging
          // zonder nieuwe coördinaten de oude lat/lng leegmaken i.p.v. te laten staan.
          ...(() => {
            const addrChanged = (item.location_address ?? null) !== (locationAddress || null);
            const latChanged = (item.location_lat ?? null) !== locationLat;
            const lngChanged = (item.location_lng ?? null) !== locationLng;
            if (!addrChanged && !latChanged && !lngChanged) {
              return {
                pending_location_lat: null,
                pending_location_lng: null,
                pending_location_address: null,
              };
            }
            // Gebruik "" als sentinel voor "expliciet leeg gemaakt"; de edge
            // function vertaalt dat terug naar NULL bij promotie naar live.
            return {
              pending_location_lat: locationLat,
              pending_location_lng: locationLng,
              pending_location_address: locationAddress ?? "",
            };
          })(),
          // Provider als groep behandelen: zodra id, naam of email wijzigt,
          // schrijven we alle drie naar pending. Voorkomt dat naam los kan
          // afwijken van id en blokkeert later inconsistente publicaties.
          ...(() => {
            const idChanged = item.provider_id !== newProviderId;
            const nameChanged = item.provider_name !== newProviderName;
            const emailChanged = (item.provider_email ?? null) !== (newProviderEmail ?? null);
            if (!idChanged && !nameChanged && !emailChanged) {
              return {
                pending_provider_id: null,
                pending_provider_name: null,
                pending_provider_email: null,
              };
            }
            return {
              pending_provider_id: newProviderId,
              pending_provider_name: newProviderName,
              pending_provider_email: newProviderEmail,
            };
          })(),
        };

        const hasAnyPending = Object.values(pendingUpdate).some((v) => v !== null);
        pendingUpdate.pending_changed_at = hasAnyPending ? new Date().toISOString() : null;

        const { error } = await supabase
          .from("program_request_items")
          .update(pendingUpdate as any)
          .eq("id", item.id);
        if (error) throw error;
      }

      // Log admin activity
      await logAdminActivity({
        action: AdminActions.ITEM_STATUS_CHANGED,
        entityType: EntityTypes.REQUEST,
        entityId: requestId,
        details: {
          action: isStillDraft ? "activity_edited" : "activity_edited_pending",
          item_id: item.id,
          block_name: customName,
        },
      });

      toast.success(
        isStillDraft
          ? "Activiteit bijgewerkt"
          : "Wijzigingen klaargezet — publiceer via de gele balk om klant/partner te notificeren",
      );
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
      // pending_added items zijn nog niet gepubliceerd → hard delete is veilig.
      // Voor live items: markeer als pending_marked_for_removal en publiceer
      // de annulering pas via "Publiceer & notificeer".
      if (item.pending_added) {
        const { error } = await supabase
          .from("program_request_items")
          .delete()
          .eq("id", item.id);
        if (error) throw error;
        toast.success(`${item.block_name} verwijderd`);
      } else {
        const { error } = await supabase
          .from("program_request_items")
          .update({
            pending_marked_for_removal: true,
            pending_changed_at: new Date().toISOString(),
          })
          .eq("id", item.id);
        if (error) throw error;
        toast.success(
          `${item.block_name} gemarkeerd voor annulering — geen mail verstuurd. Kies bij 'Publiceer wijzigingen' of de partner geïnformeerd wordt.`,
        );
      }

      await logAdminActivity({
        action: AdminActions.ITEM_STATUS_CHANGED,
        entityType: EntityTypes.REQUEST,
        entityId: requestId,
        details: {
          action: item.pending_added ? "activity_deleted" : "activity_marked_removal",
          item_id: item.id,
          block_name: item.block_name,
        },
      });

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

  // Sluiten alleen bevestigen als er nog een auto-save loopt of als de
  // overige (niet-auto-saved) velden zijn gewijzigd t.o.v. het item.
  const otherDirty = (() => {
    if (!item) return false;
    const liveTime = item.preferred_time || "flexibel";
    const livePrice = item.admin_price_override?.toString() ?? "";
    const livePT = (item.price_type === "per_person_per_day" || item.price_type === "total")
      ? item.price_type
      : "per_person";
    return (
      preferredTime !== liveTime ||
      priceOverride !== livePrice ||
      priceType !== livePT ||
      selectedDayIndex !== item.day_index ||
      (selectedProviderId || "bureau") !== (item.provider_id || "bureau") ||
      (locationLat ?? null) !== (item.location_lat ?? null) ||
      (locationLng ?? null) !== (item.location_lng ?? null) ||
      (locationAddress || "") !== (item.location_address || "")
    );
  })();
  const hasUnsaved = anyAutoSaveBusy || otherDirty;

  const requestClose = () => {
    if (hasUnsaved) {
      setShowDirtyConfirm(true);
      return;
    }
    onOpenChange(false);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) requestClose();
        else onOpenChange(true);
      }}
    >
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b shrink-0">
          <SheetTitle>Activiteit bewerken</SheetTitle>
          <SheetDescription>
            Tekstvelden worden automatisch opgeslagen. Wijzigingen zijn pas
            zichtbaar voor klant en partner ná <strong>Publiceer &amp; verstuur</strong>.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Maatwerk-briefing (alleen voor maatwerk-items) */}
          {item?.is_custom_quote && (
            <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50/60 p-3">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="editBriefing" className="text-amber-900">
                  Maatwerk-briefing
                </Label>
                <FieldSaveIndicator status={briefingSave.status} savedAt={briefingSave.savedAt} error={briefingSave.error} />
              </div>
              <Textarea
                id="editBriefing"
                value={customBriefing}
                onChange={(e) => setCustomBriefing(e.target.value)}
                onBlur={() => briefingSave.flush()}
                rows={6}
                placeholder="Beschrijf zo concreet mogelijk wat je nodig hebt (aantallen, tijd, locatie, wensen)."
              />
              <p className="text-xs text-amber-800/80">
                De partner ziet deze briefing in zijn offerte-editor. Fallback voor de klant als er nog geen "Beschrijving voor klant" is ingevuld.
              </p>
            </div>
          )}

          {/* Custom name */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <Label htmlFor="editName">Omschrijving</Label>
              <FieldSaveIndicator status={nameSave.status} savedAt={nameSave.savedAt} error={nameSave.error} />
            </div>
            <Input
              id="editName"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              onBlur={() => nameSave.flush()}
              placeholder="Naam van de activiteit..."
            />
          </div>

          {/* Custom description for customer */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <Label htmlFor="editDescription">Beschrijving voor klant (optioneel)</Label>
              <FieldSaveIndicator status={descSave.status} savedAt={descSave.savedAt} error={descSave.error} />
            </div>
            <Textarea
              id="editDescription"
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              onBlur={() => descSave.flush()}
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

          {/* Facturatie verloopt altijd centraal via Bureau Vlieland */}
          {selectedProviderId && selectedProviderId !== "bureau" && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-blue-50 border border-blue-200 text-sm">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-blue-800">
                <p className="font-medium">Facturatie via Bureau Vlieland</p>
                <p className="text-blue-700 mt-1">
                  {selectedProviderName} ontvangt een aanvraag en ziet dit item in hun portaal, maar hoeft geen factuur naar de klant te sturen. Alle facturatie loopt centraal via Bureau Vlieland.
                </p>
              </div>
            </div>
          )}

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
            <div className="flex items-baseline justify-between gap-3">
              <Label htmlFor="editNotes">Opmerking klant (optioneel)</Label>
              <FieldSaveIndicator status={notesSave.status} savedAt={notesSave.savedAt} error={notesSave.error} />
            </div>
            <Textarea
              id="editNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => notesSave.flush()}
              placeholder="Specifieke wensen van de klant..."
              rows={2}
            />
          </div>

          {/* Partner instructions — operationeel, alleen zichtbaar voor partner */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <Label htmlFor="editPartnerInstructions">Instructie voor partner (optioneel)</Label>
              <FieldSaveIndicator status={instrSave.status} savedAt={instrSave.savedAt} error={instrSave.error} />
            </div>
            <Textarea
              id="editPartnerInstructions"
              value={partnerInstructions}
              onChange={(e) => setPartnerInstructions(e.target.value)}
              onBlur={() => instrSave.flush()}
              placeholder="Bijv. '10 minuten van tevoren aanwezig zijn' of 'geen krentenbollen meenemen'..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Niet zichtbaar voor de klant. Alleen de partner ziet deze instructie in zijn portaal — pas zichtbaar na <strong>Publiceer &amp; verstuur</strong>.
            </p>
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

            <Button variant="outline" onClick={requestClose} disabled={isSubmitting}>
              Sluiten
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting || isDeleting}>
              <Save className="h-4 w-4 mr-2" />
              Opslaan (overige velden)
            </Button>
          </div>
        </div>
      </SheetContent>

      {/* Dirty-close confirmation */}
      <AlertDialog open={showDirtyConfirm} onOpenChange={setShowDirtyConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Niet-opgeslagen wijzigingen</AlertDialogTitle>
            <AlertDialogDescription>
              Er staan nog wijzigingen klaar die niet zijn opgeslagen (prijs, locatie, uitvoerder, tijd of dag).
              Weet je zeker dat je wilt sluiten zonder op <strong>Opslaan</strong> te klikken?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Terug naar bewerken</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowDirtyConfirm(false);
                onOpenChange(false);
              }}
            >
              Sluiten en weggooien
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
};

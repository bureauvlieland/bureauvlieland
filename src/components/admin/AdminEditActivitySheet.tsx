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
import { Info, Trash2, Save } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { timeSlots } from "@/types/buildingBlock";
import { logAdminActivity, AdminActions, EntityTypes } from "@/lib/adminLogger";
import { LocationPicker } from "@/components/admin/LocationPicker";
import { resolveAutoTodo } from "@/lib/autoTodoCreator";

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
}

export const AdminEditActivitySheet = ({
  open,
  onOpenChange,
  item,
  requestId,
  selectedDates,
  onSuccess,
}: AdminEditActivitySheetProps) => {
  // Form state
  const [customName, setCustomName] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [preferredTime, setPreferredTime] = useState("flexibel");
  const [priceOverride, setPriceOverride] = useState("");
  const [invoicedBy, setInvoicedBy] = useState<"bureau" | "partner">("partner");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [locationAddress, setLocationAddress] = useState("");
  const [selectedProviderId, setSelectedProviderId] = useState("");
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
      setInvoicedBy(item.block_type === "bureau" ? "bureau" : "partner");
      setNotes(item.customer_notes || "");
      setSelectedProviderId(item.provider_id || "bureau-vlieland");
      setLocationLat(item.location_lat ?? null);
      setLocationLng(item.location_lng ?? null);
      setLocationAddress(item.location_address || "");
    }
  }, [item]);

  const handleSave = async () => {
    if (!item) return;

    setIsSubmitting(true);
    try {
      const time = preferredTime === "flexibel" ? null : preferredTime;
      const price = priceOverride ? parseFloat(priceOverride) : null;

      // Determine provider based on selected executor
      const isBureauInvoiced = invoicedBy === "bureau";
      const selectedPartner = partners.find(p => p.id === selectedProviderId);
      
      const updateData: Record<string, unknown> = {
        block_name: customName,
        admin_price_notes: customDescription || null,
        day_index: selectedDayIndex,
        preferred_time: time,
        admin_price_override: price,
        customer_notes: notes || null,
        block_type: isBureauInvoiced ? "bureau" : "partner",
        location_lat: locationLat,
        location_lng: locationLng,
        location_address: locationAddress || null,
        provider_id: selectedProviderId || "bureau-vlieland",
        provider_name: selectedProviderId === "bureau-vlieland" 
          ? "Bureau Vlieland" 
          : (selectedPartner?.name || item.provider_name),
        provider_email: selectedProviderId === "bureau-vlieland" 
          ? null 
          : (selectedPartner?.email || item.provider_email),
      };

      const { error } = await supabase
        .from("program_request_items")
        .update(updateData)
        .eq("id", item.id);

      if (error) throw error;

      // Resolve bureau_item_pricing todo if price was set on a bureau item
      if (isBureauInvoiced && price !== null) {
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

  const selectedProviderName = selectedProviderId === "bureau-vlieland"
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
                <SelectItem value="bureau-vlieland">Bureau Vlieland</SelectItem>
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
            {invoicedBy === "bureau" && selectedProviderId && selectedProviderId !== "bureau-vlieland" && (
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
            <Label htmlFor="editTime">Voorkeurstijd</Label>
            <Select value={preferredTime} onValueChange={setPreferredTime}>
              <SelectTrigger id="editTime">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((slot) => (
                  <SelectItem key={slot.value} value={slot.value}>
                    {slot.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Price override */}
          <div className="space-y-2">
            <Label htmlFor="editPrice">Prijs voor klant (€)</Label>
            <Input
              id="editPrice"
              type="number"
              step="0.01"
              min="0"
              value={priceOverride}
              onChange={(e) => setPriceOverride(e.target.value)}
              placeholder="Prijs per persoon"
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label>Locatie (optioneel)</Label>
            <LocationPicker
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

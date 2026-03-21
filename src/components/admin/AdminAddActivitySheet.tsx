import { useState, useMemo, useEffect } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, ArrowLeft, Plus, Info } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAdminBuildingBlocks } from "@/hooks/useBuildingBlocks";
import { getBlockImage } from "@/lib/buildingBlockUtils";
import { type BuildingBlock, type BuildingBlockCategory } from "@/types/buildingBlock";
import { Checkbox } from "@/components/ui/checkbox";
import { logAdminActivity, AdminActions, EntityTypes } from "@/lib/adminLogger";
import { LocationPicker } from "@/components/admin/LocationPicker";

interface AdminAddActivitySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  selectedDates: string[];
  existingBlockIds: string[];
  onSuccess: () => void;
}

type CategoryFilter = "all" | BuildingBlockCategory;

export const AdminAddActivitySheet = ({
  open,
  onOpenChange,
  requestId,
  selectedDates,
  existingBlockIds,
  onSuccess,
}: AdminAddActivitySheetProps) => {
  const { data: blocks = [], isLoading } = useAdminBuildingBlocks();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [selectedBlock, setSelectedBlock] = useState<BuildingBlock | null>(null);
  
  // Partners list for executor selection
  const [partners, setPartners] = useState<{ id: string; name: string; email: string | null }[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");

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

  // Form state
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [preferredTime, setPreferredTime] = useState<string>("flexibel");
  const [notes, setNotes] = useState("");
  const [priceOverride, setPriceOverride] = useState<string>("");
  const [customName, setCustomName] = useState<string>("");
  const [customDescription, setCustomDescription] = useState<string>("");
  const [invoicedBy, setInvoicedBy] = useState<"bureau" | "partner">("partner");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [locationAddress, setLocationAddress] = useState("");

  // Filter blocks: active blocks only
  const availableBlocks = useMemo(() => {
    return blocks.filter((block) => {
      // Only show active blocks
      if (!block.is_active) return false;
      
      // Optionally exclude blocks already in program
      // (admin might want to add duplicate blocks)
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = block.name.toLowerCase().includes(query);
        const matchesDescription = block.short_description?.toLowerCase().includes(query);
        const matchesProvider = block.provider?.name?.toLowerCase().includes(query);
        if (!matchesName && !matchesDescription && !matchesProvider) return false;
      }
      
      // Category filter
      if (categoryFilter !== "all" && block.category !== categoryFilter) return false;
      
      return true;
    });
  }, [blocks, searchQuery, categoryFilter]);

  const handleSelectBlock = (block: BuildingBlock) => {
    setSelectedBlock(block);
    setSelectedDayIndex(0);
    setPreferredTime("flexibel");
    setNotes("");
    setPriceOverride(block.price_adult ? String(block.price_adult) : "");
    setCustomName(block.name);
    setCustomDescription(block.description || block.short_description || "");
    setInvoicedBy(block.block_type === "bureau" ? "bureau" : "partner");
    setSelectedProviderId(block.provider_id || "bureau-vlieland");
    setLocationLat(block.location_lat ?? null);
    setLocationLng(block.location_lng ?? null);
    setLocationAddress(block.location_address || "");
  };

  const handleBack = () => {
    setSelectedBlock(null);
  };

  const handleConfirmAdd = async () => {
    if (!selectedBlock) return;
    
    setIsSubmitting(true);
    try {
      const time = preferredTime === "flexibel" ? null : preferredTime;
      const price = priceOverride ? parseFloat(priceOverride) : null;
      
      // Determine provider based on selected executor
      const isBureauInvoiced = invoicedBy === "bureau";
      const selectedPartner = partners.find(p => p.id === selectedProviderId);
      const providerId = selectedProviderId || "bureau-vlieland";
      const providerName = selectedProviderId === "bureau-vlieland" 
        ? "Bureau Vlieland" 
        : (selectedPartner?.name || selectedBlock.provider?.name || "Bureau Vlieland");
      const providerEmail = selectedProviderId === "bureau-vlieland" 
        ? null 
        : (selectedPartner?.email || selectedBlock.provider?.email || null);
      const blockType = isBureauInvoiced ? "bureau" : selectedBlock.block_type;
      
      // Insert the new item
      const { data: newItem, error } = await supabase
        .from("program_request_items")
        .insert({
          request_id: requestId,
          block_id: selectedBlock.id,
          block_name: customName || selectedBlock.name,
          block_category: selectedBlock.category,
          block_type: blockType,
          provider_id: providerId,
          provider_name: providerName,
          provider_email: providerEmail,
          day_index: selectedDayIndex,
          preferred_time: time,
          customer_notes: notes || null,
          duration: selectedBlock.duration,
          status: "pending",
          item_quote_status: "concept",
          admin_price_override: price,
          admin_price_notes: customDescription || null,
          skip_partner_notification: true,
          price_type: selectedBlock.price_type || "per_person",
          location_lat: locationLat,
          location_lng: locationLng,
          location_address: locationAddress || null,
        })
        .select()
        .single();

      if (error) throw error;
      
      // Log admin activity
      await logAdminActivity({
        action: AdminActions.ITEM_STATUS_CHANGED,
        entityType: EntityTypes.REQUEST,
        entityId: requestId,
        details: {
          action: "activity_added",
          block_name: selectedBlock.name,
          item_id: newItem.id,
        },
      });

      // Create bureau_item_pricing todo if bureau item without price (null = no price, 0 = free)
      if (blockType === "bureau" && price === null) {
        const { createAutoTodo, autoTodoTitles } = await import("@/lib/autoTodoCreator");
        // Fetch customer name for the todo title
        const { data: reqData } = await supabase
          .from("program_requests")
          .select("customer_name, customer_company")
          .eq("id", requestId)
          .single();
        const custName = reqData?.customer_company || reqData?.customer_name || "Onbekend";
        await createAutoTodo({
          type: "bureau_item_pricing",
          requestId,
          itemId: newItem.id,
          title: autoTodoTitles.bureau_item_pricing(customName || selectedBlock.name, custName),
        });
      }
      
      toast.success(`${selectedBlock.name} toegevoegd aan de offerte`);
      
      // Reset and close
      setSelectedBlock(null);
      setSearchQuery("");
      setCategoryFilter("all");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error adding activity:", error);
      toast.error("Fout bij toevoegen activiteit");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedBlock(null);
    setSearchQuery("");
    setCategoryFilter("all");
    setCustomName("");
    setCustomDescription("");
    setInvoicedBy("partner");
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b shrink-0">
          {selectedBlock ? (
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <SheetTitle>{selectedBlock.name} toevoegen</SheetTitle>
                <SheetDescription>Kies dag, tijd en prijs</SheetDescription>
              </div>
            </div>
          ) : (
            <>
              <SheetTitle>Activiteit toevoegen</SheetTitle>
              <SheetDescription>
                Kies een activiteit om toe te voegen aan deze offerte
              </SheetDescription>
            </>
          )}
        </SheetHeader>

        {selectedBlock ? (
          // Add form
          <div className="flex-1 overflow-auto p-6 space-y-6">
            {/* Custom name */}
            <div className="space-y-2">
              <Label htmlFor="customName">Omschrijving</Label>
              <Input
                id="customName"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Naam van de activiteit..."
              />
            </div>

            {/* Custom description for customer */}
            <div className="space-y-2">
              <Label htmlFor="customDescription">Beschrijving voor klant (optioneel)</Label>
              <Textarea
                id="customDescription"
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                placeholder="Bijv. 'Met 2 boten' of 'Inclusief gids'..."
                rows={2}
              />
            </div>

            {/* Uitvoerder (executor) selection */}
            <div className="space-y-2">
              <Label htmlFor="provider">Uitvoerder</Label>
              <Select value={selectedProviderId} onValueChange={setSelectedProviderId}>
                <SelectTrigger id="provider">
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
                  <RadioGroupItem value="bureau" id="invoice-bureau" />
                  <Label htmlFor="invoice-bureau" className="font-normal cursor-pointer">
                    Bureau Vlieland
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="partner" id="invoice-partner" />
                  <Label htmlFor="invoice-partner" className="font-normal cursor-pointer">
                    {partners.find(p => p.id === selectedProviderId)?.name || selectedBlock.provider?.name || "Partner"}
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
                      {partners.find(p => p.id === selectedProviderId)?.name || selectedBlock.provider?.name} ontvangt wel een aanvraag en ziet dit item in hun portaal, maar hoeft geen factuur in te dienen. De facturatie loopt via Bureau Vlieland.
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
                      <RadioGroupItem value={String(index)} id={`day-${index}`} />
                      <Label htmlFor={`day-${index}`} className="font-normal cursor-pointer">
                        Dag {index + 1} - {format(new Date(date), "EEE d MMMM yyyy", { locale: nl })}
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
                  id="flexibel"
                  checked={preferredTime === "flexibel"}
                  onCheckedChange={(checked) => {
                    setPreferredTime(checked ? "flexibel" : "10:00");
                  }}
                />
                <Label htmlFor="flexibel" className="font-normal cursor-pointer">Flexibel</Label>
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
              <Label htmlFor="price">Prijs voor klant (€)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={priceOverride}
                onChange={(e) => setPriceOverride(e.target.value)}
                placeholder="Laat leeg voor standaard prijs"
              />
              <p className="text-xs text-muted-foreground">
                Standaard: €{selectedBlock.price_adult?.toFixed(2) || "Op aanvraag"}
              </p>
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
              <Label htmlFor="notes">Opmerking (optioneel)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Interne notitie of specifieke wensen..."
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                Terug
              </Button>
              <Button onClick={handleConfirmAdd} disabled={isSubmitting} className="flex-1">
                <Plus className="h-4 w-4 mr-2" />
                Toevoegen
              </Button>
            </div>
          </div>
        ) : (
          // Browse blocks
          <>
            {/* Search and filters */}
            <div className="p-4 pb-2 space-y-3 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek op naam, partner..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={categoryFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategoryFilter("all")}
                >
                  Alle
                </Button>
                <Button
                  variant={categoryFilter === "outdoor" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategoryFilter("outdoor")}
                >
                  Outdoor
                </Button>
                <Button
                  variant={categoryFilter === "excursies" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategoryFilter("excursies")}
                >
                  Excursies
                </Button>
                <Button
                  variant={categoryFilter === "entertainment" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategoryFilter("entertainment")}
                >
                  Entertainment
                </Button>
                <Button
                  variant={categoryFilter === "locaties" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategoryFilter("locaties")}
                >
                  Locaties
                </Button>
                <Button
                  variant={categoryFilter === "catering" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategoryFilter("catering")}
                >
                  Catering
                </Button>
                <Button
                  variant={categoryFilter === "vervoer" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategoryFilter("vervoer")}
                >
                  Vervoer
                </Button>
              </div>
            </div>

            {/* Blocks list */}
            <ScrollArea className="flex-1">
              <div className="p-4 pt-2 space-y-2">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Laden...
                  </div>
                ) : availableBlocks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchQuery || categoryFilter !== "all"
                      ? "Geen activiteiten gevonden met deze filters"
                      : "Geen activiteiten beschikbaar"}
                  </div>
                ) : (
                  availableBlocks.map((block) => (
                    <div
                      key={block.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => handleSelectBlock(block)}
                    >
                      <img
                        src={getBlockImage(block)}
                        alt={block.name}
                        className="w-16 h-16 rounded-md object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium truncate">{block.name}</h4>
                          {(block as any).status === "concept" && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                              Concept
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {block.provider?.name || "Bureau Vlieland"}
                        </p>
                        <p className="text-sm font-medium text-primary">
                          {block.price_adult ? `€${block.price_adult}` : "Op aanvraag"}
                        </p>
                      </div>
                      <Button size="sm" variant="ghost">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

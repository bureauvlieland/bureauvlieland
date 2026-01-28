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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { format, differenceInDays, addDays } from "date-fns";
import { nl } from "date-fns/locale";
import {
  Calendar,
  Users,
  Euro,
  Send,
  Building2,
  Clock,
  Plus,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { LOCATION_PREFERENCES, BUDGET_RANGES, ACCOMMODATION_TYPES, ROOM_TYPES } from "@/types/accommodation";

interface AccommodationRequest {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_company: string | null;
  arrival_date: string;
  departure_date: string;
  number_of_guests: number;
  accommodation_type: string;
  room_count: number | null;
  room_occupancy: string | null;
  room_types: string[];
  location_preference: string[];
  budget_range: string | null;
  special_requests: string | null;
  wants_activities: boolean;
  status: string;
  created_at: string;
}

interface AccommodationQuote {
  id: string;
  status: string;
  accommodation_name: string;
  description: string | null;
  price_total: number;
  price_per_person_per_night: number | null;
  price_includes_vat: boolean;
  vat_rate: number;
  includes: unknown;
  conditions: string | null;
  valid_until: string;
  partner_notes: string | null;
  room_configuration: Record<string, unknown>[] | null;
  submitted_at: string | null;
  quote_attachment_path: string | null;
  quote_attachment_filename: string | null;
  quote_external_url: string | null;
}

interface RoomConfig {
  type: string;
  count: number;
  price_per_night: number;
  occupancy: number;
}

interface PartnerAccommodationQuoteSheetProps {
  isOpen: boolean;
  onClose: () => void;
  request: { quote: AccommodationQuote | null } & AccommodationRequest | null;
  existingQuote: AccommodationQuote | null;
  onSubmit: (data: {
    accommodationName: string;
    description: string;
    priceTotal: number;
    pricePerPersonPerNight: number | null;
    priceIncludesVat: boolean;
    vatRate: number;
    includes: string[];
    conditions: string;
    validUntil: string;
    partnerNotes: string;
    roomConfiguration: RoomConfig[];
    quoteExternalUrl: string;
  }) => Promise<boolean>;
}

const INCLUDE_OPTIONS = [
  "Ontbijt",
  "Lunch",
  "Diner",
  "Beddengoed",
  "Handdoeken",
  "Eindschoonmaak",
  "WiFi",
  "Parkeren",
  "Toeristenbelasting",
];

export const PartnerAccommodationQuoteSheet = ({
  isOpen,
  onClose,
  request,
  existingQuote,
  onSubmit,
}: PartnerAccommodationQuoteSheetProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accommodationName, setAccommodationName] = useState("");
  const [description, setDescription] = useState("");
  const [priceTotal, setPriceTotal] = useState<string>("");
  const [priceIncludesVat, setPriceIncludesVat] = useState(true);
  const [vatRate, setVatRate] = useState("9");
  const [includes, setIncludes] = useState<string[]>([]);
  const [conditions, setConditions] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [partnerNotes, setPartnerNotes] = useState("");
  const [roomConfiguration, setRoomConfiguration] = useState<RoomConfig[]>([]);
  const [quoteExternalUrl, setQuoteExternalUrl] = useState("");

  // Initialize form when opening
  useEffect(() => {
    if (isOpen && existingQuote) {
      setAccommodationName(existingQuote.accommodation_name || "");
      setDescription(existingQuote.description || "");
      setPriceTotal(existingQuote.price_total > 0 ? existingQuote.price_total.toString() : "");
      setPriceIncludesVat(existingQuote.price_includes_vat);
      setVatRate(existingQuote.vat_rate?.toString() || "9");
      setIncludes(Array.isArray(existingQuote.includes) ? existingQuote.includes as string[] : []);
      setConditions(existingQuote.conditions || "");
      setValidUntil(existingQuote.valid_until || format(addDays(new Date(), 14), "yyyy-MM-dd"));
      setPartnerNotes(existingQuote.partner_notes || "");
      setRoomConfiguration(Array.isArray(existingQuote.room_configuration) 
        ? (existingQuote.room_configuration as unknown as RoomConfig[])
        : []);
      setQuoteExternalUrl(existingQuote.quote_external_url || "");
    } else if (isOpen) {
      // Default values for new quote
      setAccommodationName("");
      setDescription("");
      setPriceTotal("");
      setPriceIncludesVat(true);
      setVatRate("9");
      setIncludes([]);
      setConditions("");
      setValidUntil(format(addDays(new Date(), 14), "yyyy-MM-dd"));
      setPartnerNotes("");
      setRoomConfiguration([]);
      setQuoteExternalUrl("");
    }
  }, [isOpen, existingQuote]);

  if (!request) return null;

  const nights = differenceInDays(new Date(request.departure_date), new Date(request.arrival_date));
  const typeConfig = ACCOMMODATION_TYPES.find(t => t.value === request.accommodation_type);
  const locationLabels = request.location_preference
    .map(loc => LOCATION_PREFERENCES.find(l => l.value === loc)?.label)
    .filter(Boolean);
  const budgetLabel = BUDGET_RANGES.find(b => b.value === request.budget_range)?.label;
  const roomTypeLabels = request.room_types
    .map(rt => ROOM_TYPES.find(r => r.value === rt)?.label)
    .filter(Boolean);

  const toggleInclude = (item: string) => {
    setIncludes(prev => 
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const addRoom = () => {
    setRoomConfiguration(prev => [...prev, { type: "double", count: 1, price_per_night: 0, occupancy: 2 }]);
  };

  const updateRoom = (index: number, updates: Partial<RoomConfig>) => {
    setRoomConfiguration(prev => prev.map((room, i) => 
      i === index ? { ...room, ...updates } : room
    ));
  };

  const removeRoom = (index: number) => {
    setRoomConfiguration(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!accommodationName.trim()) {
      return;
    }
    
    const price = parseFloat(priceTotal);
    if (isNaN(price) || price <= 0) {
      return;
    }

    setIsSubmitting(true);
    
    const pricePerPersonPerNight = price / request.number_of_guests / nights;

    const success = await onSubmit({
      accommodationName: accommodationName.trim(),
      description: description.trim(),
      priceTotal: price,
      pricePerPersonPerNight,
      priceIncludesVat,
      vatRate: parseInt(vatRate),
      includes,
      conditions: conditions.trim(),
      validUntil,
      partnerNotes: partnerNotes.trim(),
      roomConfiguration,
      quoteExternalUrl: quoteExternalUrl.trim(),
    });

    setIsSubmitting(false);
    if (success) {
      onClose();
    }
  };

  const isReadOnly = existingQuote?.status === "selected" || existingQuote?.status === "rejected";
  const canSubmit = existingQuote?.status === "pending" || existingQuote?.status === "submitted";

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isReadOnly ? "Offerte details" : existingQuote?.submitted_at ? "Offerte aanpassen" : "Offerte indienen"}
          </SheetTitle>
          <SheetDescription>
            {request.customer_company || request.customer_name}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Request Summary */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="text-xl">{typeConfig?.icon}</span>
                {typeConfig?.label}
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {format(new Date(request.arrival_date), "d MMM", { locale: nl })} - {format(new Date(request.departure_date), "d MMM", { locale: nl })}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {nights} nachten
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  {request.number_of_guests} personen
                </div>
                {request.room_count && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    ±{request.room_count} kamers
                  </div>
                )}
              </div>

              {locationLabels.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {locationLabels.map((label, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{label}</Badge>
                  ))}
                </div>
              )}

              {budgetLabel && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Euro className="h-4 w-4" />
                  Budget: {budgetLabel}
                </div>
              )}

              {roomTypeLabels.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  Kamervoorkeur: {roomTypeLabels.join(", ")}
                </div>
              )}

              {request.special_requests && (
                <div className="text-sm bg-muted/50 p-2 rounded">
                  <span className="font-medium">Speciale wensen: </span>
                  {request.special_requests}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status message for closed quotes */}
          {existingQuote?.status === "selected" && (
            <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg">
              <Check className="h-5 w-5" />
              <span className="font-medium">Deze offerte is geaccepteerd door de klant!</span>
            </div>
          )}

          {existingQuote?.status === "rejected" && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
              <X className="h-5 w-5" />
              <span className="font-medium">De klant heeft een andere accommodatie gekozen.</span>
            </div>
          )}

          <Separator />

          {/* Quote Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accommodationName">Naam accommodatie *</Label>
              <Input
                id="accommodationName"
                placeholder="Bijv. Hotel Zeezicht"
                value={accommodationName}
                onChange={(e) => setAccommodationName(e.target.value)}
                disabled={isReadOnly}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Omschrijving</Label>
              <Textarea
                id="description"
                placeholder="Korte beschrijving van de accommodatie..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isReadOnly}
                rows={3}
                maxLength={1000}
              />
            </div>

            <Separator />

            {/* Room Configuration */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Kamerconfiguratie (optioneel)</Label>
                {!isReadOnly && (
                  <Button type="button" variant="outline" size="sm" onClick={addRoom}>
                    <Plus className="h-4 w-4 mr-1" />
                    Kamer toevoegen
                  </Button>
                )}
              </div>

              {roomConfiguration.map((room, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                  <Input
                    placeholder="Type"
                    value={room.type}
                    onChange={(e) => updateRoom(index, { type: e.target.value })}
                    className="flex-1"
                    disabled={isReadOnly}
                  />
                  <Input
                    type="number"
                    placeholder="Aantal"
                    value={room.count}
                    onChange={(e) => updateRoom(index, { count: parseInt(e.target.value) || 0 })}
                    className="w-20"
                    disabled={isReadOnly}
                  />
                  <Input
                    type="number"
                    placeholder="€/nacht"
                    value={room.price_per_night || ""}
                    onChange={(e) => updateRoom(index, { price_per_night: parseFloat(e.target.value) || 0 })}
                    className="w-24"
                    disabled={isReadOnly}
                  />
                  {!isReadOnly && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeRoom(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <Separator />

            {/* Pricing */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="priceTotal">Totaalprijs *</Label>
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="priceTotal"
                    type="number"
                    placeholder="0.00"
                    value={priceTotal}
                    onChange={(e) => setPriceTotal(e.target.value)}
                    className="pl-10"
                    step="0.01"
                    min="0"
                    disabled={isReadOnly}
                  />
                </div>
                {priceTotal && !isNaN(parseFloat(priceTotal)) && (
                  <p className="text-xs text-muted-foreground">
                    = €{(parseFloat(priceTotal) / request.number_of_guests / nights).toFixed(2)} p.p.p.n.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="priceIncludesVat"
                    checked={priceIncludesVat}
                    onCheckedChange={setPriceIncludesVat}
                    disabled={isReadOnly}
                  />
                  <Label htmlFor="priceIncludesVat">Inclusief BTW</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="vatRate">BTW %</Label>
                  <Input
                    id="vatRate"
                    type="number"
                    value={vatRate}
                    onChange={(e) => setVatRate(e.target.value)}
                    className="w-16"
                    disabled={isReadOnly}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Includes */}
            <div className="space-y-3">
              <Label>Inbegrepen</Label>
              <div className="flex flex-wrap gap-2">
                {INCLUDE_OPTIONS.map((item) => (
                  <Badge
                    key={item}
                    variant={includes.includes(item) ? "default" : "outline"}
                    className={`cursor-pointer transition-colors ${isReadOnly ? "pointer-events-none" : ""}`}
                    onClick={() => !isReadOnly && toggleInclude(item)}
                  >
                    {includes.includes(item) && <Check className="h-3 w-3 mr-1" />}
                    {item}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="conditions">Voorwaarden / Annuleringsbeleid</Label>
              <Textarea
                id="conditions"
                placeholder="Eventuele voorwaarden of annuleringsbeleid..."
                value={conditions}
                onChange={(e) => setConditions(e.target.value)}
                disabled={isReadOnly}
                rows={3}
                maxLength={1000}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="validUntil">Offerte geldig tot</Label>
              <Input
                id="validUntil"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                disabled={isReadOnly}
                min={format(new Date(), "yyyy-MM-dd")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quoteExternalUrl">Link naar uw offerte (optioneel)</Label>
              <Input
                id="quoteExternalUrl"
                type="url"
                placeholder="https://uwsite.nl/offerte/..."
                value={quoteExternalUrl}
                onChange={(e) => setQuoteExternalUrl(e.target.value)}
                disabled={isReadOnly}
              />
              <p className="text-xs text-muted-foreground">
                Voeg een link toe naar uw eigen offerte, boekingssysteem of prijsopgave
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="partnerNotes">Interne notities (alleen voor u)</Label>
              <Textarea
                id="partnerNotes"
                placeholder="Notities voor uzelf..."
                value={partnerNotes}
                onChange={(e) => setPartnerNotes(e.target.value)}
                disabled={isReadOnly}
                rows={2}
                maxLength={500}
              />
            </div>
          </div>

          {/* Actions */}
          {canSubmit && (
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Annuleren
              </Button>
              <Button 
                onClick={handleSubmit} 
                className="flex-1"
                disabled={isSubmitting || !accommodationName.trim() || !priceTotal}
              >
                {isSubmitting ? (
                  "Bezig..."
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {existingQuote?.submitted_at ? "Offerte bijwerken" : "Offerte indienen"}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

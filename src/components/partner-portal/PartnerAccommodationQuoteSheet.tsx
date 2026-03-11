import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  FileText,
  Ban,
  BedDouble,
} from "lucide-react";
import { LOCATION_PREFERENCES, BUDGET_RANGES, ACCOMMODATION_TYPES, ROOM_TYPES } from "@/types/accommodation";
import { AccommodationInvoiceDialog } from "./AccommodationInvoiceDialog";
import { QuoteExtrasList } from "./QuoteExtrasList";
import { usePartnerRoomTypes } from "@/hooks/usePartnerRoomTypes";

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
  linked_program_id?: string | null;
  invoicingMode?: string | null;
}

interface BillingDetails {
  billing_company_name: string | null;
  billing_kvk_number: string | null;
  billing_vat_number: string | null;
  billing_address_street: string | null;
  billing_address_postal: string | null;
  billing_address_city: string | null;
  billing_contact_name: string | null;
  billing_contact_email: string | null;
  billing_reference: string | null;
  terms_accepted_at: string | null;
  invoicing_mode: string | null;
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
  invoiced_amount: number | null;
  invoiced_number: string | null;
  invoiced_date: string | null;
  commission_percentage: number | null;
  commission_amount: number | null;
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
  partnerToken: string;
  partnerId: string;
  partnerName?: string;
  partnerDescription?: string;
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
  onDecline?: (reason: string, proposedArrival?: string, proposedDeparture?: string) => Promise<boolean>;
  onRefresh?: () => void;
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
  partnerToken,
  partnerId,
  partnerName = "",
  partnerDescription = "",
  onSubmit,
  onDecline,
  onRefresh,
}: PartnerAccommodationQuoteSheetProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [responseType, setResponseType] = useState<"submit_quote" | "decline" | "alternative_dates">("submit_quote");
  const [declineReason, setDeclineReason] = useState("");
  const [proposedArrivalDate, setProposedArrivalDate] = useState("");
  const [proposedDepartureDate, setProposedDepartureDate] = useState("");
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
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [billingDetails, setBillingDetails] = useState<BillingDetails | null>(null);
  const [searchParams] = useSearchParams();

  // Fetch billing details when quote is selected and linked to a program
  useEffect(() => {
    if (!isOpen || existingQuote?.status !== "selected" || !request?.linked_program_id) {
      setBillingDetails(null);
      return;
    }

    const fetchBilling = async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const isImpersonating = Boolean(searchParams.get("impersonate"));

      const { data } = await supabase
        .from("program_requests")
        .select("billing_company_name, billing_kvk_number, billing_vat_number, billing_address_street, billing_address_postal, billing_address_city, billing_contact_name, billing_contact_email, billing_reference, terms_accepted_at, invoicing_mode")
        .eq("id", request.linked_program_id!)
        .maybeSingle();

      if (data) {
        setBillingDetails(data);
        return;
      }

      // Fallback: for real partner sessions we still resolve invoicing_mode via helper function.
      if (!isImpersonating) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: mode } = await supabase.rpc("get_invoicing_mode_for_accommodation", {
            _user_id: session.user.id,
            _accommodation_request_id: request.id,
          });
          if (mode) {
            setBillingDetails({ invoicing_mode: mode as string } as BillingDetails);
          }
        }
      }
    };

    fetchBilling();
  }, [isOpen, existingQuote?.status, request?.linked_program_id, request?.id, searchParams]);

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
      setResponseType("submit_quote");
      setDeclineReason(existingQuote.status === "declined" ? existingQuote.partner_notes || "" : "");
      setProposedArrivalDate("");
      setProposedDepartureDate("");
    } else if (isOpen) {
      // Default values for new quote - use partner name and description as defaults
      setAccommodationName(partnerName);
      setDescription(partnerDescription);
      setPriceTotal("");
      setPriceIncludesVat(true);
      setVatRate("9");
      setIncludes([]);
      setConditions("");
      setValidUntil(format(addDays(new Date(), 14), "yyyy-MM-dd"));
      setPartnerNotes("");
      setRoomConfiguration([]);
      setQuoteExternalUrl("");
      setResponseType("submit_quote");
      setDeclineReason("");
      setProposedArrivalDate("");
      setProposedDepartureDate("");
    }
  }, [isOpen, existingQuote, partnerName, partnerDescription]);

  // Fetch partner room types for selection - must be before any early returns
  const { data: partnerRoomTypes = [] } = usePartnerRoomTypes(partnerId);
  const [isExtending, setIsExtending] = useState(false);
  const [newValidUntil, setNewValidUntil] = useState("");

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

  const effectiveInvoicingMode = billingDetails?.invoicing_mode ?? request.invoicingMode ?? null;

  const toggleInclude = (item: string) => {
    setIncludes(prev => 
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const addRoom = () => {
    setRoomConfiguration(prev => [...prev, { type: "", count: 1, price_per_night: 0, occupancy: 2 }]);
  };

  const addRoomFromPreset = (roomTypeId: string) => {
    const roomType = partnerRoomTypes.find(rt => rt.id === roomTypeId);
    if (roomType) {
      setRoomConfiguration(prev => [...prev, {
        type: roomType.name,
        count: 1,
        price_per_night: roomType.price_per_night || 0,
        occupancy: roomType.max_occupancy,
      }]);
    }
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

  const handleDecline = async () => {
    console.log("handleDecline called, onDecline:", typeof onDecline, "declineReason:", declineReason);
    if (!onDecline) {
      console.error("onDecline is not provided!");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const arrival = responseType === "alternative_dates" ? proposedArrivalDate : undefined;
      const departure = responseType === "alternative_dates" ? proposedDepartureDate : undefined;
      const success = await onDecline(declineReason.trim(), arrival, departure);
      console.log("onDecline result:", success);
      if (success) {
        onClose();
      }
    } catch (err) {
      console.error("Error in handleDecline:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isExpired = existingQuote?.status === "expired";
  const isReadOnly = existingQuote?.status === "selected" || existingQuote?.status === "rejected" || existingQuote?.status === "declined";
  const canSubmit = existingQuote?.status === "pending" || existingQuote?.status === "submitted";
  const isDeclined = existingQuote?.status === "declined";

  const handleExtendValidity = async () => {
    if (!existingQuote || !newValidUntil) return;
    setIsExtending(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase
        .from("accommodation_quotes")
        .update({ status: "submitted", valid_until: newValidUntil })
        .eq("id", existingQuote.id);
      if (error) throw error;

      // Create admin todo for notification
      const { createAutoTodo } = await import("@/lib/autoTodoCreator");
      const customerName = request?.customer_company || request?.customer_name || "";
      await createAutoTodo({
        type: "quote_expired_partner",
        requestId: existingQuote.id,
        partnerId: partnerId,
        title: `Offerte verlengd: ${accommodationName} voor ${customerName} (nieuw: ${newValidUntil})`,
        description: `De partner heeft de geldigheid van de offerte verlengd tot ${newValidUntil}.`,
        priority: "normal",
      });

      const { toast } = await import("@/hooks/use-toast");
      toast.call(null, { title: "Geldigheid verlengd", description: "De offerte is weer beschikbaar." });
      onRefresh?.();
      onClose();
    } catch (err) {
      console.error("Error extending validity:", err);
    } finally {
      setIsExtending(false);
    }
  };

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
                  {format(new Date(request.arrival_date), "EEE d MMM", { locale: nl })} - {format(new Date(request.departure_date), "EEE d MMM", { locale: nl })}
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
            <div className="space-y-3">
              <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium">
                  <Check className="h-5 w-5" />
                  <span>Deze offerte is geaccepteerd door de klant!</span>
                </div>
                <div className="text-sm text-muted-foreground space-y-1.5">
                  <p className="font-medium text-foreground">Wat nu?</p>
                  {effectiveInvoicingMode === "bureau_central" ? (
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Bureau Vlieland coördineert de reservering met de klant</li>
                      <li>Na afloop van het verblijf stuurt u uw factuur (geoffreerde prijs) naar <strong>Bureau Vlieland</strong></li>
                      <li>Registreer de factuur hieronder in het portaal</li>
                      <li>Bureau Vlieland stuurt u vervolgens een commissiefactuur ({existingQuote?.commission_percentage ?? 10}%)</li>
                    </ol>
                  ) : (
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Bureau Vlieland coördineert de reservering met de klant</li>
                      <li>Na afloop van het verblijf stuurt u uw factuur naar <strong>Bureau Vlieland</strong></li>
                      <li>Registreer de factuur hieronder in het portaal</li>
                    </ol>
                  )}
                </div>
              </div>

              {/* Always show Bureau Vlieland billing details */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-sm space-y-2">
                <p className="font-medium text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Factureer aan Bureau Vlieland
                </p>
                <div className="text-amber-700 dark:text-amber-400 space-y-0.5">
                  <p className="font-medium">Bureau Vlieland</p>
                  <p>administratie@bureauvlieland.nl</p>
                </div>
                  <p className="text-muted-foreground text-xs">U factureert dezelfde geoffreerde prijs als bij directe facturatie. Bureau Vlieland stuurt u apart een commissiefactuur.</p>
                </div>
              
              {/* Invoice registration section */}
              {existingQuote.invoiced_number ? (
                <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Factuur geregistreerd
                  </p>
                  <div className="text-sm text-muted-foreground grid grid-cols-2 gap-1">
                    <span>Factuurnr:</span>
                    <span className="font-medium text-foreground">{existingQuote.invoiced_number}</span>
                    <span>Bedrag:</span>
                    <span className="font-medium text-foreground">€{existingQuote.invoiced_amount?.toFixed(2)}</span>
                    <span>Commissie ({existingQuote.commission_percentage}%):</span>
                    <span className="font-medium text-foreground">€{existingQuote.commission_amount?.toFixed(2)}</span>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowInvoiceDialog(true)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Factuur registreren
                </Button>
              )}
            </div>
          )}

          {existingQuote?.status === "rejected" && (
            <div className="flex gap-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
              <X className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-medium text-red-700 dark:text-red-400">
                  {request.status === "cancelled"
                    ? "De hele logiesaanvraag is geannuleerd"
                    : "De klant heeft voor een andere accommodatie gekozen"}
                </span>
                <p className="text-sm text-muted-foreground">
                  {request.status === "cancelled"
                    ? "Het bijbehorende programma of de logiesaanvraag is geannuleerd door de klant."
                    : "Uw offerte is helaas niet geselecteerd. Bedankt voor uw voorstel."}
                </p>
              </div>
            </div>
          )}

          {existingQuote?.status === "declined" && (
            <div className="flex gap-3 p-3 bg-muted/50 border border-border rounded-lg">
              <Ban className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-medium">U heeft deze aanvraag afgewezen</span>
                {existingQuote.partner_notes && (
                  <p className="text-sm text-muted-foreground">
                    Reden: {existingQuote.partner_notes}
                  </p>
                )}
              </div>
            </div>
          )}

          {isExpired && (
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 text-amber-800 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  <span className="font-medium">Deze offerte is verlopen</span>
                </div>
                <p className="text-sm">
                  Pas de geldigheid aan om de offerte opnieuw beschikbaar te maken.
                </p>
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="newValidUntil" className="text-xs">Nieuwe geldigheid</Label>
                    <Input
                      id="newValidUntil"
                      type="date"
                      value={newValidUntil}
                      onChange={(e) => setNewValidUntil(e.target.value)}
                      min={format(new Date(), "yyyy-MM-dd")}
                    />
                  </div>
                  <Button
                    onClick={handleExtendValidity}
                    disabled={!newValidUntil || isExtending}
                    size="sm"
                  >
                    {isExtending ? "Bezig..." : "Verlengen"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {isDeclined && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-muted text-muted-foreground rounded-lg">
                <Ban className="h-5 w-5" />
                <span className="font-medium">U heeft deze aanvraag afgewezen.</span>
              </div>
              {existingQuote?.partner_notes && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-1">Reden:</p>
                  <p className="text-sm text-muted-foreground">{existingQuote.partner_notes}</p>
                </div>
              )}
            </div>
          )}

          {!isReadOnly && <Separator />}

          {/* Response Type Selection for pending quotes */}
          {canSubmit && (
            <div className="space-y-4">
              <Label className="text-base font-medium">Uw reactie</Label>
              <RadioGroup
                value={responseType}
                onValueChange={(value) => setResponseType(value as "submit_quote" | "decline")}
                className="space-y-3"
              >
                <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="submit_quote" id="submit_quote" className="mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor="submit_quote" className="font-medium cursor-pointer">
                      Offerte indienen
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Vul onderstaand formulier in met uw prijsopgave
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="alternative_dates" id="alternative_dates" className="mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor="alternative_dates" className="font-medium cursor-pointer">
                      Niet beschikbaar, maar wel op andere datum
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Stel alternatieve datums voor aan Bureau Vlieland
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="decline" id="decline" className="mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor="decline" className="font-medium cursor-pointer">
                      Niet beschikbaar
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Deze aanvraag afwijzen (bijv. geen beschikbaarheid)
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Alternative Dates Form */}
          {canSubmit && responseType === "alternative_dates" && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="proposedArrival">Voorgestelde aankomst *</Label>
                    <Input
                      id="proposedArrival"
                      type="date"
                      value={proposedArrivalDate}
                      onChange={(e) => setProposedArrivalDate(e.target.value)}
                      min={format(new Date(), "yyyy-MM-dd")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="proposedDeparture">Voorgesteld vertrek *</Label>
                    <Input
                      id="proposedDeparture"
                      type="date"
                      value={proposedDepartureDate}
                      onChange={(e) => setProposedDepartureDate(e.target.value)}
                      min={proposedArrivalDate || format(new Date(), "yyyy-MM-dd")}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="altReason">Toelichting (optioneel)</Label>
                  <Textarea
                    id="altReason"
                    placeholder="Bijv. In deze week hebben wij wel kamers beschikbaar..."
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    rows={3}
                    maxLength={500}
                  />
                </div>
              </div>
            </>
          )}

          {/* Decline Form */}
          {canSubmit && responseType === "decline" && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="declineReason">Reden voor afwijzing (optioneel)</Label>
                  <Textarea
                    id="declineReason"
                    placeholder="Bijv. Volgeboekt in deze periode, Geen geschikte kamers beschikbaar..."
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    rows={3}
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">
                    Deze informatie wordt gedeeld met Bureau Vlieland
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Quote Form - only show when submitting quote */}
          {canSubmit && responseType === "submit_quote" && <Separator />}

          {/* Quote Form */}
          {(!canSubmit || responseType === "submit_quote") && !isDeclined && <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accommodationName">Naam accommodatie *</Label>
              <Input
                id="accommodationName"
                placeholder="Bijv. Uw accommodatienaam"
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
              </div>

              {/* Room Type Presets Selection */}
              {!isReadOnly && partnerRoomTypes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Selecteer uit uw kamersoorten:</p>
                  <div className="flex flex-wrap gap-2">
                    {partnerRoomTypes.map((roomType) => (
                      <Button
                        key={roomType.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addRoomFromPreset(roomType.id)}
                        className="flex items-center gap-2"
                      >
                        <BedDouble className="h-3.5 w-3.5" />
                        <span>{roomType.name}</span>
                        {roomType.price_per_night && (
                          <span className="text-muted-foreground">
                            €{roomType.price_per_night.toFixed(0)}
                          </span>
                        )}
                        <Plus className="h-3 w-3" />
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Added rooms */}
              {roomConfiguration.length > 0 && (
                <div className="space-y-2">
                  {roomConfiguration.map((room, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <Input
                          placeholder="Kamertype"
                          value={room.type}
                          onChange={(e) => updateRoom(index, { type: e.target.value })}
                          disabled={isReadOnly}
                        />
                      </div>
                      <div className="w-20">
                        <Input
                          type="number"
                          placeholder="Aantal"
                          value={room.count}
                          onChange={(e) => updateRoom(index, { count: parseInt(e.target.value) || 0 })}
                          min={1}
                          disabled={isReadOnly}
                        />
                      </div>
                      <div className="w-28 relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                        <Input
                          type="number"
                          placeholder="per nacht"
                          value={room.price_per_night || ""}
                          onChange={(e) => updateRoom(index, { price_per_night: parseFloat(e.target.value) || 0 })}
                          className="pl-6"
                          disabled={isReadOnly}
                        />
                      </div>
                      {!isReadOnly && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeRoom(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Manual add button */}
              {!isReadOnly && (
                <Button type="button" variant="ghost" size="sm" onClick={addRoom} className="w-full">
                  <Plus className="h-4 w-4 mr-1" />
                  Handmatig kamer toevoegen
                </Button>
              )}
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

            {/* Quote Extras - only show when quote exists */}
            {existingQuote && (
              <QuoteExtrasList
                quoteId={existingQuote.id}
                numberOfGuests={request.number_of_guests}
                partnerId={partnerId}
                readOnly={isReadOnly}
              />
            )}

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
          </div>}

          {/* Actions */}
          {canSubmit && responseType === "submit_quote" && (
            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Annuleren
              </Button>
              <Button 
                type="button"
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

          {canSubmit && responseType === "alternative_dates" && (
            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Annuleren
              </Button>
              <Button 
                type="button"
                onClick={handleDecline} 
                className="flex-1"
                disabled={isSubmitting || !proposedArrivalDate || !proposedDepartureDate}
              >
                {isSubmitting ? (
                  "Bezig..."
                ) : (
                  <>
                    <Calendar className="h-4 w-4 mr-2" />
                    Alternatieve datums voorstellen
                  </>
                )}
              </Button>
            </div>
          )}

          {canSubmit && responseType === "decline" && (
            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Annuleren
              </Button>
              <Button 
                type="button"
                onClick={handleDecline} 
                variant="destructive"
                className="flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  "Bezig..."
                ) : (
                  <>
                    <Ban className="h-4 w-4 mr-2" />
                    Afwijzen
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>

      {/* Invoice Registration Dialog */}
      {existingQuote && (
        <AccommodationInvoiceDialog
          isOpen={showInvoiceDialog}
          onClose={() => setShowInvoiceDialog(false)}
          quoteId={existingQuote.id}
          partnerToken={partnerToken}
          accommodationName={existingQuote.accommodation_name}
          priceTotal={existingQuote.price_total}
          commissionPercentage={existingQuote.commission_percentage || 10}
          onSuccess={() => {
            setShowInvoiceDialog(false);
            onRefresh?.();
          }}
        />
      )}
    </Sheet>
  );
};

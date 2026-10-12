import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { Sheet, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { FactList, FormField, Notice, OptionCard, OptionGroup, Pill, ResponsiveSheetContent, SuccessScreen } from "@/components/system";
import { addDays, differenceInDays, format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { Ban, BedDouble, Building2, Calendar, Euro, FileText, Loader2, MapPin, Moon, Plus, Send, Trash2, Users, Utensils } from "lucide-react";
import { ACCOMMODATION_TYPES, BOARD_TYPES, BUDGET_RANGES, LOCATION_PREFERENCES, ROOM_TYPES, getBoardLabel, validateBoardSelection } from "@/types/accommodation";
import type { RoomConfiguration } from "@/types/accommodation";
import { InvoiceRegistrationDialog, type InvoiceTarget } from "./InvoiceRegistrationDialog";
import { QuoteExtrasList } from "./QuoteExtrasList";
import { PartnerCustomerMessagesPanel } from "./PartnerCustomerMessagesPanel";
import { PartnerImageUpload } from "./PartnerImageUpload";
import { usePartnerRoomTypes } from "@/hooks/usePartnerRoomTypes";
import { roomSnapshotFromType } from "@/lib/accommodationQuotePresentation";
import { ProjectDocumentsPanel } from "@/components/shared/ProjectDocumentsPanel";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { reportError } from "@/lib/errorReporting";
import { formatEuro } from "@/lib/formatEuro";
import { partnerQuoteStatus } from "@/lib/accommodationQuoteStatus";
import { PURCHASE_INVOICE_INBOX } from "@/lib/bureauContact";
import { usePartnerContext } from "@/lib/partnerPortalContext";

/**
 * De offertesheet van een logiesaanvraag (partnerportaal fase 3). Dezelfde
 * opbouw als de onderdeelsheet: wat er nu speelt als `Notice`, de aanvraag
 * als `FactList`, de reactie als drie `OptionCard`s, het formulier in
 * secties op `FormField`, en onderaan één primaire knop in een vaste voet.
 * Na versturen blijft de sheet open met een `SuccessScreen`; een gekozen,
 * niet gekozen of afgewezen offerte staat er als samenvatting, niet als
 * uitgeschakeld formulier.
 */
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
  room_assignment?: string | null;
  guest_details_updated_at?: string | null;
  wants_activities: boolean;
  status: string;
  created_at: string;
  linked_program_id?: string | null;
  invoicingMode?: string | null;
}

interface BillingDetails {
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
  board_type?: string | null;
  board_notes?: string | null;
  valid_until: string;
  partner_notes: string | null;
  room_configuration: Record<string, unknown>[] | null;
  images?: { url: string; alt?: string }[] | null;
  submitted_at: string | null;
  reset_reason?: string | null;
  quote_attachment_path: string | null;
  quote_attachment_filename: string | null;
  quote_external_url: string | null;
  invoiced_amount: number | null;
  invoiced_number: string | null;
  invoiced_date: string | null;
  commission_percentage: number | null;
  commission_amount: number | null;
}

type RoomConfig = RoomConfiguration;

export interface AccommodationQuoteSubmitData {
  accommodationName: string;
  description: string;
  priceTotal: number;
  pricePerPersonPerNight: number | null;
  priceIncludesVat: boolean;
  vatRate: number;
  includes: string[];
  conditions: string;
  boardType: string;
  boardNotes: string;
  validUntil: string;
  partnerNotes: string;
  roomConfiguration: RoomConfig[];
  images: { url: string; alt?: string }[];
  quoteExternalUrl: string;
  attachmentFile?: File | null;
}

interface PartnerAccommodationQuoteSheetProps {
  isOpen: boolean;
  onClose: () => void;
  request: ({ quote: AccommodationQuote | null } & AccommodationRequest) | null;
  existingQuote: AccommodationQuote | null;
  partnerToken: string;
  partnerId: string;
  partnerName?: string;
  partnerDescription?: string;
  /** Geeft `true` terug als het is gelukt; de sheet toont dan de bevestiging en sluit zelf. */
  onSubmit: (data: AccommodationQuoteSubmitData) => Promise<boolean>;
  onDecline?: (reason: string, proposedArrival?: string, proposedDeparture?: string) => Promise<boolean>;
  onRefresh?: () => void;
}

const INCLUDE_OPTIONS = ["Ontbijt", "Lunch", "Diner", "Beddengoed", "Handdoeken", "Eindschoonmaak", "WiFi", "Parkeren", "Toeristenbelasting"];

type ResponseType = "submit_quote" | "alternative_dates" | "decline";
type Done = "submitted" | "alternative" | "declined" | "extended";

const DONE_TEXT: Record<Done, { title: string; intro: string }> = {
  submitted: { title: "Offerte verstuurd", intro: "Bureau Vlieland beoordeelt uw offerte en stuurt hem door naar de klant. U hoort het zodra de klant kiest." },
  alternative: { title: "Andere datums voorgesteld", intro: "Bureau Vlieland legt uw voorstel aan de klant voor en laat u weten wat hij kiest." },
  declined: { title: "Aanvraag afgewezen", intro: "Bureau Vlieland weet dat u geen plek heeft en zoekt verder voor de klant." },
  extended: { title: "Geldigheid verlengd", intro: "Uw offerte staat weer open voor de klant." },
};

const Section = ({ title, help, children }: { title: string; help?: string; children: ReactNode }) => (
  <section className="space-y-3">
    <div>
      <h3 className="font-medium">{title}</h3>
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
    </div>
    {children}
  </section>
);

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
  const { toast } = useToast();
  const { demo } = usePartnerContext();
  const isDemo = Boolean(demo);
  const requestBoardPreference = (request as { board_preference?: string | null } | null)?.board_preference ?? null;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [responseType, setResponseType] = useState<ResponseType>("submit_quote");
  const [declineReason, setDeclineReason] = useState("");
  const [proposedArrivalDate, setProposedArrivalDate] = useState("");
  const [proposedDepartureDate, setProposedDepartureDate] = useState("");
  const [accommodationName, setAccommodationName] = useState("");
  const [description, setDescription] = useState("");
  const [priceTotal, setPriceTotal] = useState<string>("");
  const [priceIncludesVat, setPriceIncludesVat] = useState(true);
  const [vatRate, setVatRate] = useState("9");
  const [includes, setIncludes] = useState<string[]>([]);
  const [boardType, setBoardType] = useState<string>("");
  const [boardNotes, setBoardNotes] = useState("");
  const [boardError, setBoardError] = useState<string | null>(null);
  const [conditions, setConditions] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [partnerNotes, setPartnerNotes] = useState("");
  const [roomConfiguration, setRoomConfiguration] = useState<RoomConfig[]>([]);
  const [quoteImages, setQuoteImages] = useState<{ url: string; alt?: string }[]>([]);
  const [quoteExternalUrl, setQuoteExternalUrl] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [invoiceTarget, setInvoiceTarget] = useState<InvoiceTarget | null>(null);
  const [billingDetails, setBillingDetails] = useState<BillingDetails | null>(null);
  const [isExtending, setIsExtending] = useState(false);
  const [newValidUntil, setNewValidUntil] = useState("");
  const [searchParams] = useSearchParams();
  const { data: partnerRoomTypes = [] } = usePartnerRoomTypes(isDemo ? "" : partnerId);

  // De bevestiging hoort bij één openen; een nieuwe sheet begint schoon.
  useEffect(() => {
    if (isOpen) setDone(null);
  }, [isOpen]);

  // De facturatiewijze van het gekoppelde programma, alleen voor een gekozen offerte.
  useEffect(() => {
    if (!isOpen || isDemo || existingQuote?.status !== "selected" || !request?.linked_program_id) {
      setBillingDetails(null);
      return;
    }
    const fetchBilling = async () => {
      const isImpersonating = Boolean(searchParams.get("impersonate"));
      const { data } = await supabase.from("program_requests").select("invoicing_mode").eq("id", request.linked_program_id!).maybeSingle();
      if (data) {
        setBillingDetails(data);
        return;
      }
      if (!isImpersonating) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          const { data: mode } = await supabase.rpc("get_invoicing_mode_for_accommodation", {
            _user_id: session.user.id,
            _accommodation_request_id: request.id,
          });
          if (mode) setBillingDetails({ invoicing_mode: mode as string });
        }
      }
    };
    void fetchBilling();
  }, [isOpen, isDemo, existingQuote?.status, request?.linked_program_id, request?.id, searchParams]);

  useEffect(() => {
    if (!isOpen) return;
    const preferredBoard = requestBoardPreference && requestBoardPreference !== "no_preference" ? requestBoardPreference : "";
    if (existingQuote) {
      setAccommodationName(existingQuote.accommodation_name || partnerName);
      setDescription(existingQuote.description || "");
      setPriceTotal(existingQuote.price_total > 0 ? existingQuote.price_total.toString() : "");
      setPriceIncludesVat(existingQuote.price_includes_vat);
      setVatRate(existingQuote.vat_rate?.toString() || "9");
      setIncludes(Array.isArray(existingQuote.includes) ? (existingQuote.includes as string[]) : []);
      setBoardType(existingQuote.board_type || preferredBoard);
      setBoardNotes(existingQuote.board_notes || "");
      setConditions(existingQuote.conditions || "");
      setValidUntil(existingQuote.valid_until || format(addDays(new Date(), 14), "yyyy-MM-dd"));
      setPartnerNotes(existingQuote.partner_notes || "");
      setRoomConfiguration(Array.isArray(existingQuote.room_configuration) ? (existingQuote.room_configuration as unknown as RoomConfig[]) : []);
      setQuoteImages(Array.isArray(existingQuote.images) ? existingQuote.images : []);
      setQuoteExternalUrl(existingQuote.quote_external_url || "");
    } else {
      setAccommodationName(partnerName);
      setDescription(partnerDescription);
      setPriceTotal("");
      setPriceIncludesVat(true);
      setVatRate("9");
      setIncludes([]);
      setBoardType(preferredBoard);
      setBoardNotes("");
      setConditions("");
      setValidUntil(format(addDays(new Date(), 14), "yyyy-MM-dd"));
      setPartnerNotes("");
      setRoomConfiguration([]);
      setQuoteImages([]);
      setQuoteExternalUrl("");
    }
    setAttachmentFile(null);
    setResponseType("submit_quote");
    setDeclineReason("");
    setProposedArrivalDate("");
    setProposedDepartureDate("");
    setBoardError(null);
    setNewValidUntil("");
  }, [isOpen, existingQuote, partnerName, partnerDescription, requestBoardPreference]);

  if (!request) return null;

  const status = partnerQuoteStatus(existingQuote?.status);
  const customerLabel = request.customer_company || request.customer_name;
  const nights = Math.max(1, differenceInDays(parseISO(request.departure_date), parseISO(request.arrival_date)));
  const typeLabel = ACCOMMODATION_TYPES.find((t) => t.value === request.accommodation_type)?.label ?? request.accommodation_type;
  const locationLabels = request.location_preference.map((loc) => LOCATION_PREFERENCES.find((l) => l.value === loc)?.label).filter(Boolean) as string[];
  const budgetLabel = BUDGET_RANGES.find((b) => b.value === request.budget_range)?.label;
  const roomTypeLabels = request.room_types.map((rt) => ROOM_TYPES.find((r) => r.value === rt)?.label ?? rt).filter(Boolean) as string[];
  const effectiveInvoicingMode = billingDetails?.invoicing_mode ?? request.invoicingMode ?? null;

  const canSubmit = status.key === "requested" || status.key === "submitted";
  const isExpired = status.key === "expired";
  const isSelected = status.key === "selected";
  const showSummary = !canSubmit && existingQuote && existingQuote.submitted_at && status.key !== "declined";
  const pricePerPersonPerNight = priceTotal && !Number.isNaN(parseFloat(priceTotal)) ? parseFloat(priceTotal) / request.number_of_guests / nights : null;

  const requestFacts = [
    { label: "Periode", value: `${format(parseISO(request.arrival_date), "EEEE d MMMM", { locale: nl })} tot ${format(parseISO(request.departure_date), "EEEE d MMMM yyyy", { locale: nl })} (${nights === 1 ? "1 nacht" : `${nights} nachten`})`, icon: Calendar },
    { label: "Personen", value: `${request.number_of_guests}`, icon: Users },
    { label: "Soort", value: typeLabel, icon: BedDouble },
    ...(request.room_count || roomTypeLabels.length > 0
      ? [{ label: "Kamers", value: [request.room_count ? `ongeveer ${request.room_count}` : null, ...roomTypeLabels].filter(Boolean).join(", "), icon: Building2 }]
      : []),
    ...(locationLabels.length > 0 ? [{ label: "Ligging", value: locationLabels.join(", "), icon: MapPin }] : []),
    ...(budgetLabel ? [{ label: "Budget", value: budgetLabel, icon: Euro }] : []),
    ...(requestBoardPreference ? [{ label: "Verzorging", value: getBoardLabel(requestBoardPreference) ?? requestBoardPreference, icon: Utensils }] : []),
  ];

  const toggleInclude = (item: string) => setIncludes((prev) => (prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]));
  const addRoom = () => setRoomConfiguration((prev) => [...prev, { type: "", count: 1, price_per_night: 0, occupancy: 2 }]);
  const addRoomFromPreset = (roomTypeId: string) => {
    const roomType = partnerRoomTypes.find((rt) => rt.id === roomTypeId);
    // Momentopname van het kamertype: de klant ziet foto's en faciliteiten zoals ze op het moment van offreren waren.
    if (roomType) setRoomConfiguration((prev) => [...prev, roomSnapshotFromType(roomType)]);
  };
  const updateRoom = (index: number, updates: Partial<RoomConfig>) => setRoomConfiguration((prev) => prev.map((room, i) => (i === index ? { ...room, ...updates } : room)));
  const removeRoom = (index: number) => setRoomConfiguration((prev) => prev.filter((_, i) => i !== index));

  const price = parseFloat(priceTotal);
  const submitReady = accommodationName.trim().length > 0 && !Number.isNaN(price) && price > 0;

  const handleSubmit = async () => {
    if (!submitReady) return;
    // Verzorging is verplicht: zonder weet de klant niet of ontbijt of pension in de prijs zit.
    const boardValidation = validateBoardSelection(boardType, boardNotes);
    if (boardValidation) {
      setBoardError(boardValidation);
      return;
    }
    setBoardError(null);
    setIsSubmitting(true);
    const success = await onSubmit({
      accommodationName: accommodationName.trim(),
      description: description.trim(),
      priceTotal: price,
      pricePerPersonPerNight: price / request.number_of_guests / nights,
      priceIncludesVat,
      vatRate: parseInt(vatRate, 10),
      includes,
      conditions: conditions.trim(),
      boardType,
      boardNotes: boardNotes.trim(),
      validUntil,
      partnerNotes: partnerNotes.trim(),
      roomConfiguration,
      images: quoteImages,
      quoteExternalUrl: quoteExternalUrl.trim(),
      attachmentFile,
    });
    setIsSubmitting(false);
    if (success) setDone("submitted");
  };

  const handleDecline = async () => {
    if (!onDecline) return;
    setIsSubmitting(true);
    try {
      const alternative = responseType === "alternative_dates";
      const success = await onDecline(declineReason.trim(), alternative ? proposedArrivalDate : undefined, alternative ? proposedDepartureDate : undefined);
      if (success) setDone(alternative ? "alternative" : "declined");
    } catch (err) {
      reportError(err, { where: "PartnerAccommodationQuoteSheet: Error in handleDecline" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExtendValidity = async () => {
    if (!existingQuote || !newValidUntil || isDemo) return;
    setIsExtending(true);
    try {
      const { error } = await supabase.from("accommodation_quotes").update({ status: "submitted", valid_until: newValidUntil }).eq("id", existingQuote.id);
      if (error) throw error;
      const { createAutoTodo } = await import("@/lib/autoTodoCreator");
      await createAutoTodo({
        type: "quote_expired_partner",
        requestId: existingQuote.id,
        partnerId,
        title: `Offerte verlengd: ${existingQuote.accommodation_name} voor ${customerLabel} (nieuw: ${newValidUntil})`,
        description: `De partner heeft de geldigheid van de offerte verlengd tot ${newValidUntil}.`,
        priority: "normal",
      });
      onRefresh?.();
      setDone("extended");
    } catch (err) {
      reportError(err, { where: "PartnerAccommodationQuoteSheet: Error extending validity" });
      toast({ title: "Verlengen mislukt", description: "Kon de geldigheid niet verlengen. Probeer het opnieuw.", variant: "destructive" });
    } finally {
      setIsExtending(false);
    }
  };

  const title = done ? DONE_TEXT[done].title : canSubmit ? (existingQuote?.submitted_at ? "Offerte aanpassen" : "Offerte indienen") : "Uw offerte";

  // Samenvatting van een verstuurde offerte die niet meer te bewerken is.
  const summaryFacts = existingQuote
    ? [
        { label: "Accommodatie", value: existingQuote.accommodation_name },
        { label: "Prijs", value: `${formatEuro(existingQuote.price_total)} ${existingQuote.price_includes_vat ? "inclusief" : "exclusief"} ${existingQuote.vat_rate}% btw${existingQuote.price_per_person_per_night ? ` (${formatEuro(existingQuote.price_per_person_per_night)} p.p.p.n.)` : ""}` },
        ...(existingQuote.board_type ? [{ label: "Verzorging", value: [getBoardLabel(existingQuote.board_type), existingQuote.board_notes].filter(Boolean).join(": ") }] : []),
        ...(Array.isArray(existingQuote.includes) && existingQuote.includes.length > 0 ? [{ label: "Inbegrepen", value: (existingQuote.includes as string[]).join(", ") }] : []),
        ...(Array.isArray(existingQuote.room_configuration) && existingQuote.room_configuration.length > 0
          ? [{ label: "Kamers", value: (existingQuote.room_configuration as unknown as RoomConfig[]).map((r) => `${r.count} × ${r.type || "kamer"}`).join(", ") }]
          : []),
        { label: "Geldig tot", value: format(parseISO(existingQuote.valid_until), "d MMMM yyyy", { locale: nl }) },
        ...(existingQuote.conditions ? [{ label: "Voorwaarden", value: existingQuote.conditions }] : []),
        ...(existingQuote.partner_notes ? [{ label: "Toelichting voor de klant", value: existingQuote.partner_notes }] : []),
        ...(existingQuote.quote_external_url ? [{ label: "Link", value: existingQuote.quote_external_url }] : []),
        ...(existingQuote.quote_attachment_filename ? [{ label: "Bijlage", value: existingQuote.quote_attachment_filename }] : []),
      ]
    : [];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <ResponsiveSheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="space-y-1 border-b px-6 py-4 text-left">
          <SheetTitle className="font-display text-display-md font-medium leading-tight">{title}</SheetTitle>
          <div className="flex flex-wrap items-center gap-1.5">
            <Pill tone={status.tone} title={status.hint}>
              {status.label}
            </Pill>
          </div>
          <SheetDescription className="flex flex-wrap items-center gap-x-2 text-sm">
            <span className="font-medium text-foreground">{customerLabel}</span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              {format(parseISO(request.arrival_date), "d MMM", { locale: nl })} tot {format(parseISO(request.departure_date), "d MMM", { locale: nl })}
            </span>
            <span className="inline-flex items-center gap-1">
              <Moon className="h-3.5 w-3.5" aria-hidden="true" />
              {nights === 1 ? "1 nacht" : `${nights} nachten`}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {request.number_of_guests} pers.
            </span>
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
          {done ? (
            <SuccessScreen title={DONE_TEXT[done].title} intro={DONE_TEXT[done].intro} primary={{ label: "Sluiten", onClick: onClose }} />
          ) : (
            <>
              {/* Wat er nu speelt */}
              {status.key === "requested" && existingQuote?.reset_reason && (
                <Notice tone="warning" title="Wijziging ontvangen">
                  <p>{existingQuote.reset_reason}. Controleer uw offerte en dien hem opnieuw in.</p>
                </Notice>
              )}
              {isExpired && (
                <Notice tone="warning" title="De geldigheid is verstreken">
                  <p>Kies een nieuwe datum; daarna staat de offerte weer open voor de klant.</p>
                  <div className="mt-3 flex flex-wrap items-end gap-2">
                    <FormField label="Geldig tot" htmlFor="newValidUntil" className="min-w-40 flex-1">
                      <Input type="date" value={newValidUntil} onChange={(e) => setNewValidUntil(e.target.value)} min={format(new Date(), "yyyy-MM-dd")} />
                    </FormField>
                    <Button size="sm" onClick={() => void handleExtendValidity()} disabled={!newValidUntil || isExtending || isDemo}>
                      {isExtending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                      Verlengen
                    </Button>
                  </div>
                </Notice>
              )}
              {isSelected && (
                <Notice tone="success" title="De klant heeft uw offerte gekozen">
                  <ol className="mt-1 list-decimal space-y-0.5 pl-5">
                    <li>Bureau Vlieland regelt de reservering met de klant.</li>
                    <li>
                      Na het verblijf stuurt u uw factuur voor de geoffreerde prijs naar{" "}
                      <a href={`mailto:${PURCHASE_INVOICE_INBOX}`} className="font-medium underline">
                        {PURCHASE_INVOICE_INBOX}
                      </a>
                      , of u registreert hem hier met de pdf.
                    </li>
                    <li>Bureau Vlieland factureert de klant{effectiveInvoicingMode === "bureau_central" ? ` en stuurt u een commissiefactuur (${existingQuote?.commission_percentage ?? 10}%)` : " en verrekent de commissie"}.</li>
                  </ol>
                </Notice>
              )}
              {status.key === "not_selected" && (
                <Notice tone="info" title={request.status === "cancelled" ? "De logiesaanvraag is geannuleerd" : "De klant koos een andere accommodatie"}>
                  <p>{request.status === "cancelled" ? "Het programma of de logiesaanvraag is door de klant geannuleerd." : "Uw offerte is niet gekozen. Dank voor uw voorstel."}</p>
                </Notice>
              )}
              {status.key === "declined" && (
                <Notice tone="info" title="U heeft deze aanvraag afgewezen" icon={<Ban className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}>
                  {existingQuote?.partner_notes && <p>Reden: {existingQuote.partner_notes}</p>}
                </Notice>
              )}
              {status.key === "cancelled" && (
                <Notice tone="danger" title="De aanvraag is geannuleerd">
                  <p>U hoeft niets meer te doen.</p>
                </Notice>
              )}

              {/* Factuur bij een gekozen offerte */}
              {isSelected && existingQuote?.invoiced_number && (
                <FactList
                  title="Factuur geregistreerd"
                  items={[
                    { label: "Factuurnummer", value: existingQuote.invoiced_number },
                    { label: "Bedrag", value: formatEuro(existingQuote.invoiced_amount) },
                    { label: `Commissie (${existingQuote.commission_percentage ?? 10}%)`, value: formatEuro(existingQuote.commission_amount) },
                  ]}
                />
              )}

              {isSelected && existingQuote && !isDemo && (
                <PartnerCustomerMessagesPanel quoteId={existingQuote.id} accommodationRequestId={request.id} customerLabel={customerLabel} accommodationName={existingQuote.accommodation_name || ""} />
              )}

              {/* De aanvraag */}
              <FactList title="De aanvraag" items={requestFacts} />
              {request.special_requests && (
                <Notice tone="info" title="Wensen van de klant">
                  <p className="whitespace-pre-wrap">{request.special_requests}</p>
                </Notice>
              )}
              {request.room_assignment && (
                <Notice tone="info" title="Kamerindeling van de klant">
                  <p className="whitespace-pre-wrap">{request.room_assignment}</p>
                </Notice>
              )}
              {!isDemo && <ProjectDocumentsPanel accommodationRequestId={request.id} viewer="partner" canUpload={false} compact title="Documenten van Bureau Vlieland en de klant" emptyHint="Geen documenten gedeeld." />}

              {/* Samenvatting van een offerte die niet meer te bewerken is */}
              {showSummary && existingQuote && (
                <>
                  <FactList title="Uw offerte" items={summaryFacts} />
                  {Array.isArray(existingQuote.images) && existingQuote.images.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {existingQuote.images.map((img, i) => (
                        <img key={i} src={img.url} alt={img.alt || ""} className="h-16 w-24 rounded-md object-cover" />
                      ))}
                    </div>
                  )}
                  {!isDemo && <QuoteExtrasList quoteId={existingQuote.id} numberOfGuests={request.number_of_guests} partnerId={partnerId} readOnly />}
                </>
              )}

              {/* De reactie */}
              {canSubmit && (
                <OptionGroup label="Uw reactie" columns={1}>
                  <OptionCard selected={responseType === "submit_quote"} onSelect={() => setResponseType("submit_quote")} icon={<Send />} title="Offerte indienen" description="Vul de prijs en de kamers in; Bureau Vlieland stuurt de offerte door naar de klant." />
                  <OptionCard selected={responseType === "alternative_dates"} onSelect={() => setResponseType("alternative_dates")} icon={<Calendar />} title="Niet op deze datum, wel op een andere" description="Stel andere datums voor; het bureau legt ze aan de klant voor." />
                  <OptionCard selected={responseType === "decline"} onSelect={() => setResponseType("decline")} icon={<Ban />} title="Niet beschikbaar" description="Wijs de aanvraag af, bijvoorbeeld omdat u vol zit." />
                </OptionGroup>
              )}

              {canSubmit && responseType === "alternative_dates" && (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField label="Voorgestelde aankomst" htmlFor="proposedArrival" required>
                      <Input type="date" value={proposedArrivalDate} onChange={(e) => setProposedArrivalDate(e.target.value)} min={format(new Date(), "yyyy-MM-dd")} />
                    </FormField>
                    <FormField label="Voorgesteld vertrek" htmlFor="proposedDeparture" required>
                      <Input type="date" value={proposedDepartureDate} onChange={(e) => setProposedDepartureDate(e.target.value)} min={proposedArrivalDate || format(new Date(), "yyyy-MM-dd")} />
                    </FormField>
                  </div>
                  <FormField label="Toelichting" htmlFor="altReason" help="Bureau Vlieland leest dit mee.">
                    <Textarea placeholder="Bijvoorbeeld: in deze week hebben wij wel kamers vrij." value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} rows={3} maxLength={500} />
                  </FormField>
                </div>
              )}

              {canSubmit && responseType === "decline" && (
                <FormField label="Reden" htmlFor="declineReason" help="Bureau Vlieland leest dit mee; de klant ziet het niet.">
                  <Textarea placeholder="Bijvoorbeeld: volgeboekt in deze periode." value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} rows={3} maxLength={500} />
                </FormField>
              )}

              {canSubmit && responseType === "submit_quote" && (
                <div className="space-y-6">
                  <Section title="Accommodatie">
                    <FormField label="Naam" htmlFor="accommodationName" required>
                      <Input value={accommodationName} onChange={(e) => setAccommodationName(e.target.value)} maxLength={100} />
                    </FormField>
                    <FormField label="Omschrijving" htmlFor="description">
                      <Textarea placeholder="Korte beschrijving van de accommodatie." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={1000} />
                    </FormField>
                  </Section>

                  <Section title="Kamers" help="Kies bij voorkeur een van uw kamertypes: de klant ziet dan de foto's, bedden en faciliteiten van die kamer. Handmatig invullen kan ook.">
                    {partnerRoomTypes.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {partnerRoomTypes.map((roomType) => (
                          <Button key={roomType.id} type="button" variant="outline" size="sm" onClick={() => addRoomFromPreset(roomType.id)}>
                            <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                            {roomType.name}
                            {roomType.price_per_night ? <span className="ml-1.5 text-muted-foreground">{formatEuro(roomType.price_per_night)}</span> : null}
                          </Button>
                        ))}
                      </div>
                    )}
                    {roomConfiguration.length > 0 && (
                      <ul className="space-y-2">
                        {roomConfiguration.map((room, index) => (
                          <li key={index} className="rounded-md border bg-muted/30 p-3">
                            <div className="grid grid-cols-[1fr_4.5rem_6.5rem_auto] items-end gap-2">
                              <FormField label="Kamertype" htmlFor={`kamer-${index}-type`}>
                                <Input value={room.type} onChange={(e) => updateRoom(index, { type: e.target.value })} />
                              </FormField>
                              <FormField label="Aantal" htmlFor={`kamer-${index}-aantal`}>
                                <Input type="number" min={1} value={room.count} onChange={(e) => updateRoom(index, { count: parseInt(e.target.value, 10) || 0 })} />
                              </FormField>
                              <FormField label="Per nacht" htmlFor={`kamer-${index}-prijs`} leading={<Euro />}>
                                <Input type="number" min={0} step="0.01" value={room.price_per_night || ""} onChange={(e) => updateRoom(index, { price_per_night: parseFloat(e.target.value) || 0 })} />
                              </FormField>
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeRoom(index)} aria-label="Kamer verwijderen">
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </div>
                            <p className="mt-1.5 text-xs text-muted-foreground">
                              {room.room_type_id ? `Gekoppeld aan uw kamertype · ${room.images?.length ?? 0} foto's · ${room.facilities?.length ?? 0} faciliteiten` : "Handmatig; zonder foto's en faciliteiten"}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                    <Button type="button" variant="ghost" size="sm" onClick={addRoom}>
                      <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                      Kamer handmatig toevoegen
                    </Button>
                  </Section>

                  <Section title="Verzorging" help={requestBoardPreference ? `Voorkeur van de klant: ${getBoardLabel(requestBoardPreference)}.` : "Verplicht: zo weet de klant of ontbijt of pension in de prijs zit."}>
                    <OptionGroup name="Verzorging" columns={2}>
                      {BOARD_TYPES.map((board) => (
                        <OptionCard
                          key={board.value}
                          selected={boardType === board.value}
                          onSelect={() => {
                            setBoardType(board.value);
                            setBoardError(null);
                          }}
                          icon={<span aria-hidden="true">{board.icon}</span>}
                          title={board.label}
                        />
                      ))}
                    </OptionGroup>
                    {boardError && <p className="text-sm font-medium text-destructive">{boardError}</p>}
                    {(boardType === "other" || boardNotes) && (
                      <FormField label="Toelichting op de verzorging" htmlFor="boardNotes" required={boardType === "other"}>
                        <Textarea placeholder="Bijvoorbeeld: driegangendiner op dag 2." value={boardNotes} onChange={(e) => setBoardNotes(e.target.value)} rows={2} maxLength={500} />
                      </FormField>
                    )}
                  </Section>

                  <Section title="Prijs">
                    <FormField label="Totaalprijs" htmlFor="priceTotal" required leading={<Euro />} help={pricePerPersonPerNight != null ? `${formatEuro(pricePerPersonPerNight)} per persoon per nacht` : "Voor het hele verblijf, alle kamers samen."}>
                      <Input type="number" placeholder="0,00" value={priceTotal} onChange={(e) => setPriceTotal(e.target.value)} step="0.01" min="0" />
                    </FormField>
                    <div className="flex flex-wrap items-end gap-4">
                      <div className="flex h-10 items-center gap-2">
                        <Switch id="priceIncludesVat" checked={priceIncludesVat} onCheckedChange={setPriceIncludesVat} />
                        <Label htmlFor="priceIncludesVat">Inclusief btw</Label>
                      </div>
                      <FormField label="Btw-tarief (%)" htmlFor="vatRate" className="w-28">
                        <Input type="number" value={vatRate} onChange={(e) => setVatRate(e.target.value)} />
                      </FormField>
                    </div>
                  </Section>

                  {existingQuote && !isDemo && (
                    <Section title="Extra's" help="Losse opties die de klant erbij kan kiezen.">
                      <QuoteExtrasList quoteId={existingQuote.id} numberOfGuests={request.number_of_guests} partnerId={partnerId} />
                    </Section>
                  )}

                  <Section title="Inbegrepen">
                    <OptionGroup name="Inbegrepen" selection="multiple" columns={3}>
                      {INCLUDE_OPTIONS.map((item) => (
                        <OptionCard key={item} selection="multiple" selected={includes.includes(item)} onSelect={() => toggleInclude(item)} title={item} align="center" />
                      ))}
                    </OptionGroup>
                  </Section>

                  <Section title="Voorwaarden en geldigheid">
                    <FormField label="Voorwaarden en annulering" htmlFor="conditions">
                      <Textarea placeholder="Eventuele voorwaarden of annuleringsbeleid." value={conditions} onChange={(e) => setConditions(e.target.value)} rows={3} maxLength={1000} />
                    </FormField>
                    <FormField label="Offerte geldig tot" htmlFor="validUntil">
                      <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} min={format(new Date(), "yyyy-MM-dd")} />
                    </FormField>
                  </Section>

                  <Section title="Bijlagen" help="Alleen nodig als u iets anders wilt laten zien dan de galerij van uw profiel, bijvoorbeeld de vleugel of het huisje dat u aanbiedt.">
                    {!isDemo && <PartnerImageUpload partnerId={partnerId} images={quoteImages} onImagesChange={setQuoteImages} storagePath={`quotes/${request.id}`} maxImages={6} label="" />}
                    <FormField label="Link naar uw offerte" htmlFor="quoteExternalUrl" help="Uw eigen offerte, boekingssysteem of prijsopgave.">
                      <Input type="url" placeholder="https://" value={quoteExternalUrl} onChange={(e) => setQuoteExternalUrl(e.target.value)} />
                    </FormField>
                    <FormField label="Document" htmlFor="quoteAttachment" help="Uw offerte, proforma factuur of bevestiging (pdf, Word of Excel).">
                      <Input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)} />
                    </FormField>
                    {existingQuote?.quote_attachment_filename && !attachmentFile && (
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileText className="h-4 w-4" aria-hidden="true" />
                        Nu bijgevoegd: {existingQuote.quote_attachment_filename}
                      </p>
                    )}
                  </Section>

                  <Section title="Toelichting voor de klant">
                    <FormField label="Toelichting" htmlFor="partnerNotes" help="De klant ziet deze tekst bij uw offerte.">
                      <Textarea placeholder="Bijvoorbeeld: parkeren bij de haven, late check-in mogelijk." value={partnerNotes} onChange={(e) => setPartnerNotes(e.target.value)} rows={2} maxLength={500} />
                    </FormField>
                  </Section>
                </div>
              )}
            </>
          )}
        </div>

        {/* Vaste voet: één primaire knop */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t bg-background px-6 py-3">
          {done ? (
            <Button onClick={onClose}>Sluiten</Button>
          ) : canSubmit ? (
            <>
              <Button type="button" variant="outline" onClick={onClose}>
                Annuleren
              </Button>
              {responseType === "submit_quote" && (
                <Button type="button" onClick={() => void handleSubmit()} disabled={isSubmitting || !submitReady || isDemo}>
                  {isSubmitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="mr-1.5 h-4 w-4" aria-hidden="true" />}
                  {existingQuote?.submitted_at ? "Offerte bijwerken" : "Offerte versturen"}
                </Button>
              )}
              {responseType === "alternative_dates" && (
                <Button type="button" onClick={() => void handleDecline()} disabled={isSubmitting || !proposedArrivalDate || !proposedDepartureDate || isDemo}>
                  {isSubmitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" /> : <Calendar className="mr-1.5 h-4 w-4" aria-hidden="true" />}
                  Datums voorstellen
                </Button>
              )}
              {responseType === "decline" && (
                <Button type="button" variant="destructive" onClick={() => void handleDecline()} disabled={isSubmitting || isDemo}>
                  {isSubmitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" /> : <Ban className="mr-1.5 h-4 w-4" aria-hidden="true" />}
                  Afwijzen
                </Button>
              )}
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={onClose}>
                Sluiten
              </Button>
              {isSelected && existingQuote && !existingQuote.invoiced_number && (
                <Button
                  type="button"
                  disabled={isDemo}
                  onClick={() =>
                    setInvoiceTarget({
                      kind: "accommodation",
                      quoteId: existingQuote.id,
                      partnerId,
                      requestId: request.id,
                      accommodationName: existingQuote.accommodation_name,
                      customerLabel,
                      stayLabel: `${format(parseISO(request.arrival_date), "d MMM", { locale: nl })} tot ${format(parseISO(request.departure_date), "d MMM yyyy", { locale: nl })}`,
                      priceTotal: existingQuote.price_total,
                      priceIncludesVat: existingQuote.price_includes_vat ?? true,
                      vatRate: Number(existingQuote.vat_rate ?? 9),
                    })
                  }
                >
                  <FileText className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Factuur registreren
                </Button>
              )}
            </>
          )}
        </div>
      </ResponsiveSheetContent>

      <InvoiceRegistrationDialog
        target={invoiceTarget}
        onClose={() => setInvoiceTarget(null)}
        partnerToken={partnerToken}
        commissionPercentage={existingQuote?.commission_percentage || 10}
        onRegistered={() => onRefresh?.()}
      />
    </Sheet>
  );
};

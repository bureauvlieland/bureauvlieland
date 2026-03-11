import { useState, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Building2,
  Mail,
  Phone,
  Users,
  Calendar,
  Clock,
  Timer,
  Euro,
  CheckCircle,
  XCircle,
  MessageSquare,
  FileText,
  Hourglass,
  Loader2,
  RefreshCw,
  Hash,
  Play,
} from "lucide-react";
import { CopyReferenceButton } from "./CopyReferenceButton";
import { BureauCentralBadge } from "./BureauCentralBadge";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { PartnerItem } from "@/types/partner";
import { 
  generateTimeSlots, 
  getBlockedTimeSlotsFromPartnerItems, 
  isTimeSlotBlocked,
  minutesToTime,
  type PartnerConflictItem 
} from "@/lib/timeUtils";

interface PartnerItemSheetProps {
  item: PartnerItem | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate: (
    status: string, 
    note?: string, 
    quotedPrice?: number, 
    quotedNotes?: string,
    proposedTime?: string,
    proposedDate?: string
  ) => Promise<boolean>;
  onRegisterInvoice: () => void;
  commissionPercentage: number;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: { label: "Nieuw", color: "text-primary", bgColor: "bg-primary/10" },
  confirmed: { label: "Bevestigd", color: "text-green-700 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-950/50" },
  accepted: { label: "Klantakkoord", color: "text-blue-700 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-950/50" },
  executed: { label: "Uitgevoerd", color: "text-purple-700 dark:text-purple-400", bgColor: "bg-purple-100 dark:bg-purple-950/50" },
  invoiced: { label: "Gefactureerd", color: "text-muted-foreground", bgColor: "bg-muted" },
  unavailable: { label: "Niet beschikbaar", color: "text-destructive", bgColor: "bg-destructive/10" },
  cancelled: { label: "Geannuleerd", color: "text-muted-foreground", bgColor: "bg-muted" },
  alternative: { label: "Alternatief voorgesteld", color: "text-amber-700 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-950/50" },
  counter_proposed: { label: "Tegenvoorstel klant", color: "text-purple-700 dark:text-purple-400", bgColor: "bg-purple-100 dark:bg-purple-950/50" },
};

type ResponseType = "confirmed" | "alternative" | "unavailable";

export const PartnerItemSheet = ({
  item,
  isOpen,
  onClose,
  onStatusUpdate,
  onRegisterInvoice,
}: PartnerItemSheetProps) => {
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [responseType, setResponseType] = useState<ResponseType>("confirmed");
  const [quotedPrice, setQuotedPrice] = useState("");
  const [quotedNotes, setQuotedNotes] = useState("");
  const [proposedTime, setProposedTime] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [priceError, setPriceError] = useState("");
  const [noteError, setNoteError] = useState("");
  const [timeError, setTimeError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate blocked time slots from sibling items on same day (includes other partners)
  const blockedTimeSlots = useMemo(() => {
    if (!item || !item.sibling_items) return [];
    
    // Filter sibling items to same day, convert to conflict format
    const sameDayItems: PartnerConflictItem[] = item.sibling_items
      .filter(s => s.day_index === item.day_index && s.id !== item.id)
      .map(s => ({
        id: s.id,
        day_index: s.day_index,
        block_name: s.block_name,
        confirmed_time: s.confirmed_time,
        proposed_time: s.proposed_time,
        preferred_time: s.preferred_time,
        duration: s.duration,
        status: s.status,
      }));
    
    return getBlockedTimeSlotsFromPartnerItems(sameDayItems, item.day_index, item.id);
  }, [item]);

  // Generate available time slots (exclude blocked ones)
  const availableTimeSlots = useMemo(() => {
    const allSlots = generateTimeSlots();
    return allSlots.filter(time => !isTimeSlotBlocked(time, item?.duration || null, blockedTimeSlots));
  }, [blockedTimeSlots, item?.duration]);

  if (!item) return null;

  const request = item.program_requests;
  const dates = request.selected_dates || [];
  const activityDate = dates[item.day_index];
  const statusInfo = statusConfig[item.status] || statusConfig.pending;

  // Calculate effective status (same as dashboard logic)
  const hasCustomerAccepted = !!item.customer_accepted_at;
  const effectiveStatus = (item.status === "confirmed" && hasCustomerAccepted) ? "accepted" : item.status;

  // Can invoice when accepted/executed and customer accepted terms
  const canInvoice = (effectiveStatus === "accepted" || effectiveStatus === "executed") && 
    !item.invoiced_number && 
    request.terms_accepted_at !== null;

  // Waiting for customer to accept terms before invoicing
  const awaitingTerms = (effectiveStatus === "accepted" || effectiveStatus === "executed") && 
    !item.invoiced_number && 
    request.terms_accepted_at === null;

  // Can respond if pending, alternative, or counter_proposed status
  const canRespond = item.status === "pending" || item.status === "alternative" || item.status === "counter_proposed";

  const handleSubmitResponse = async () => {
    // Validate based on response type
    let hasError = false;

    // Time is required only for alternative
    if (responseType === "alternative") {
      if (!proposedTime) {
        setTimeError("Tijd is verplicht");
        hasError = true;
      } else if (isTimeSlotBlocked(proposedTime, item.duration || null, blockedTimeSlots)) {
        setTimeError("Deze tijd conflicteert met een andere activiteit");
        hasError = true;
      }
    }

    if (responseType === "confirmed") {
      const priceValue = parseFloat(quotedPrice.replace(",", "."));
      if (!quotedPrice || isNaN(priceValue) || priceValue <= 0) {
        setPriceError("Vul een geldige prijs in");
        hasError = true;
      }
    }

    if (responseType === "alternative") {
      if (!statusNote.trim()) {
        setNoteError("Toelichting is verplicht bij een alternatief voorstel");
        hasError = true;
      }
    }

    if (hasError) return;

    setIsSubmitting(true);
    
    const priceValue = quotedPrice ? parseFloat(quotedPrice.replace(",", ".")) : undefined;
    const validPrice = priceValue && !isNaN(priceValue) && priceValue > 0 ? priceValue : undefined;

    // For confirmed: use preferred_time automatically; for alternative: use form value
    const effectiveProposedTime = responseType === "confirmed" 
      ? (item.preferred_time || undefined) 
      : (proposedTime || undefined);

    const success = await onStatusUpdate(
      responseType,
      responseType === "confirmed" ? undefined : statusNote || undefined,
      validPrice,
      quotedNotes || undefined,
      effectiveProposedTime,
      undefined // proposedDate not used in current UI
    );
    
    setIsSubmitting(false);
    if (success) {
      resetForm();
      onClose();
    }
  };

  const handleMarkExecuted = async () => {
    setIsSubmitting(true);
    const success = await onStatusUpdate("executed");
    setIsSubmitting(false);
    if (success) onClose();
  };

  const resetForm = () => {
    setShowResponseForm(false);
    setResponseType("confirmed");
    setQuotedPrice("");
    setQuotedNotes("");
    setProposedTime("");
    setStatusNote("");
    setPriceError("");
    setNoteError("");
    setTimeError("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Pre-fill form when editing alternative or responding to counter-proposal
  const handleOpenResponseForm = () => {
    if (item.status === "alternative") {
      setResponseType("alternative");
      if (item.quoted_price) setQuotedPrice(item.quoted_price.toString().replace(".", ","));
      if (item.quoted_notes) setQuotedNotes(item.quoted_notes);
      if (item.proposed_time) setProposedTime(item.proposed_time);
      if (item.status_note) setStatusNote(item.status_note);
    } else if (item.status === "counter_proposed") {
      // Pre-fill with existing price and set time to customer's proposed time
      setResponseType("confirmed");
      if (item.quoted_price) setQuotedPrice(item.quoted_price.toString().replace(".", ","));
      if (item.quoted_notes) setQuotedNotes(item.quoted_notes);
      if (item.customer_counter_time) setProposedTime(item.customer_counter_time);
    } else {
      // Default: pre-fill proposedTime with preferred_time for alternative
      if (item.preferred_time) setProposedTime(item.preferred_time);
    }
    setShowResponseForm(true);
  };

  // Get confirmed/effective time
  const effectiveTime = item.confirmed_time || item.proposed_time || item.preferred_time;
  const timeLabel = item.confirmed_time 
    ? "Bevestigde tijd" 
    : item.proposed_time 
      ? "Voorgestelde tijd" 
      : "Gewenste tijd";

  // Check if customer modified (version > 1)
  const isModifiedByCustomer = item.version > 1;

  // Calculate expected commission
  const calculateExpectedCommission = () => {
    if (!item.quoted_price) return null;
    const vatRate = 21;
    const amountExclVat = item.quoted_price / (1 + vatRate / 100);
    const commissionRate = item.commission_percentage ?? 10;
    return amountExclVat * (commissionRate / 100);
  };
  const expectedCommission = calculateExpectedCommission();

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <SheetTitle className="text-xl">{item.block_name}</SheetTitle>
            <Badge 
              variant="outline" 
              className={cn("font-normal", statusInfo.color, statusInfo.bgColor, "border-0")}
            >
              {statusInfo.label}
            </Badge>
            {item.customer_accepted_at && (
              <Badge className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="h-3 w-3 mr-1" />
                Klant akkoord
              </Badge>
            )}
            {isModifiedByCustomer && (
              <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
                <RefreshCw className="h-3 w-3 mr-1" />
                Gewijzigd (v{item.version})
              </Badge>
            )}
          </div>
          <SheetDescription className="flex items-center gap-2">
            <span>{item.block_category}</span>
            {request.reference_number && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 font-mono text-xs">
                  <Hash className="h-3 w-3" />
                  {request.reference_number}
                  <CopyReferenceButton reference={request.reference_number} />
                </span>
              </>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Cancellation alert */}
          {item.status === "cancelled" && (
            <div className="flex gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-destructive">Deze aanvraag is geannuleerd</p>
                {request.cancellation_reason ? (
                  <p className="text-sm text-muted-foreground">
                    Reden: {request.cancellation_reason}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Het programma is geannuleerd door de klant.
                  </p>
                )}
              </div>
            </div>
          )}
          {/* Bureau Central badge - show when invoicing_mode is bureau_central */}
          {request.invoicing_mode === "bureau_central" && (
            <BureauCentralBadge variant="full" />
          )}

          {/* Customer section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Klant</h3>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 font-medium">
                <Building2 className="h-4 w-4" />
                {request.customer_company || request.customer_name}
              </div>
              <div className="grid gap-2 text-sm text-muted-foreground">
                {request.invoicing_mode !== "bureau_central" && (
                  <>
                    <a href={`mailto:${request.customer_email}`} className="flex items-center gap-2 hover:text-foreground">
                      <Mail className="h-3 w-3" />
                      {request.customer_email}
                    </a>
                    <a href={`tel:${request.customer_phone}`} className="flex items-center gap-2 hover:text-foreground">
                      <Phone className="h-3 w-3" />
                      {request.customer_phone}
                    </a>
                  </>
                )}
                <div className="flex items-center gap-2">
                  <Users className="h-3 w-3" />
                  {request.number_of_people} personen
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Details section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Details</h3>
            <div className="grid gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {activityDate
                    ? format(parseISO(activityDate), "EEE d MMMM yyyy", { locale: nl })
                    : `Dag ${item.day_index + 1}`}
                </span>
              </div>
              {effectiveTime && (
                <div className="flex items-center gap-2">
                  <Clock className={cn(
                    "h-4 w-4",
                    item.confirmed_time ? "text-green-600" : "text-muted-foreground"
                  )} />
                  <span className={cn(item.confirmed_time && "font-medium text-green-700 dark:text-green-400")}>
                    {effectiveTime}
                  </span>
                  <Badge variant="outline" className={cn(
                    "text-xs py-0 px-1.5",
                    item.confirmed_time 
                      ? "border-green-300 text-green-700 bg-green-50 dark:bg-green-950/30" 
                      : "border-muted text-muted-foreground"
                  )}>
                    {timeLabel}
                  </Badge>
                </div>
              )}
              {item.duration && (
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-muted-foreground" />
                  <span>{item.duration}</span>
                </div>
              )}
            </div>
          </div>

          {/* Admin price notes / Toelichting Bureau Vlieland */}
          {item.admin_price_notes && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Toelichting Bureau Vlieland</h3>
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                  <p className="text-sm">{item.admin_price_notes}</p>
                </div>
              </div>
            </>
          )}

          {/* Price indication */}
          {item.price_indication && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Indicatieve prijs</h3>
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
                  <span className="text-blue-700 dark:text-blue-400 font-medium">{item.price_indication}</span>
                  <p className="text-xs text-muted-foreground mt-1">Dit is de prijs die de klant zag in de configurator.</p>
                </div>
              </div>
            </>
          )}

          {/* Quoted price (if confirmed) */}
          {item.quoted_price && item.status !== "alternative" && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Bevestigde prijs</h3>
                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Euro className="h-4 w-4 text-green-600" />
                      <span className="text-green-700 dark:text-green-400 font-semibold text-lg">
                        €{item.quoted_price.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    {expectedCommission && !item.invoiced_number && (
                      <span className="text-xs text-muted-foreground">
                        Commissie: €{expectedCommission.toFixed(2)}
                      </span>
                    )}
                  </div>
                  {item.quoted_notes && (
                    <p className="text-sm text-muted-foreground">{item.quoted_notes}</p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Alternative proposal details */}
          {item.status === "alternative" && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Uw alternatief voorstel</h3>
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-3 space-y-2">
                  {item.proposed_time && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-amber-600" />
                      <span className="font-medium">Voorgestelde tijd:</span>
                      <span>{item.proposed_time}</span>
                    </div>
                  )}
                  {item.quoted_price && (
                    <div className="flex items-center gap-2 text-sm">
                      <Euro className="h-4 w-4 text-amber-600" />
                      <span className="font-medium">Voorgestelde prijs:</span>
                      <span>€{item.quoted_price.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {item.status_note && (
                    <p className="text-sm text-amber-800 dark:text-amber-300 mt-2">{item.status_note}</p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Customer counter proposal */}
          {item.status === "counter_proposed" && item.customer_counter_time && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Tegenvoorstel van klant</h3>
                <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-purple-600" />
                    <span className="font-medium">Uw voorstel was:</span>
                    <span>{item.proposed_time || "niet opgegeven"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-purple-700 dark:text-purple-400">
                    <Clock className="h-4 w-4" />
                    <span>Klant wil liever:</span>
                    <span>{item.customer_counter_time}</span>
                  </div>
                  {item.customer_counter_note && (
                    <p className="text-sm text-purple-800 dark:text-purple-300 mt-2 italic">
                      "{item.customer_counter_note}"
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {item.customer_notes && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Opmerking klant</h3>
                <p className="text-sm bg-muted/30 rounded-lg p-3">{item.customer_notes}</p>
              </div>
            </>
          )}

          {/* Status note for unavailable */}
          {item.status === "unavailable" && item.status_note && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Uw reactie</h3>
                <p className="text-sm bg-destructive/10 rounded-lg p-3 text-destructive">
                  {item.status_note}
                </p>
              </div>
            </>
          )}

          {/* Awaiting customer terms notice */}
          {awaitingTerms && (
            <>
              <Separator />
              <div className="bg-muted/50 border rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Hourglass className="h-4 w-4" />
                  <span className="font-medium">Wacht op klantbevestiging</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  De klant moet eerst de voorwaarden accepteren. Daarna kun je factureren.
                </p>
              </div>
            </>
          )}

          {/* Invoice details */}
          {item.invoiced_number && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Factuur</h3>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Factuurnummer:</span>
                    <span className="font-medium">{item.invoiced_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bedrag:</span>
                    <span className="font-medium">€{item.invoiced_amount?.toFixed(2)}</span>
                  </div>
                  {item.invoiced_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Datum:</span>
                      <span>{format(parseISO(item.invoiced_date), "d MMM yyyy", { locale: nl })}</span>
                    </div>
                  )}
                  {item.commission_amount && item.commission_amount > 0 && (
                    <div className="pt-2 border-t">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Commissie ({item.commission_percentage}%):</span>
                        <span className="font-medium">€{item.commission_amount.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Quick Actions */}
          <div className="space-y-3">
            {/* Email/phone links - hidden for bureau_central */}
            {request.invoicing_mode !== "bureau_central" && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex-1"
                  asChild
                >
                  <a href={`mailto:${request.customer_email}?subject=Betreft: ${item.block_name} - ${request.reference_number || request.customer_company || request.customer_name}`}>
                    <Mail className="h-4 w-4 mr-2" />
                    Email klant
                  </a>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex-1"
                  asChild
                >
                  <a href={`tel:${request.customer_phone}`}>
                    <Phone className="h-4 w-4 mr-2" />
                    Bellen
                  </a>
                </Button>
              </div>
            )}

            {/* Can respond: show response button or form */}
            {canRespond && !showResponseForm && (
              <Button 
                onClick={handleOpenResponseForm} 
                className="w-full"
                disabled={isSubmitting}
              >
                {item.status === "alternative" ? (
                  <>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Voorstel aanpassen
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Reageren op aanvraag
                  </>
                )}
              </Button>
            )}

            {/* Response form with radio group */}
            {canRespond && showResponseForm && (
              <div className="space-y-4 border rounded-lg p-4">
                <RadioGroup 
                  value={responseType} 
                  onValueChange={(v) => {
                    setResponseType(v as ResponseType);
                    setPriceError("");
                    setNoteError("");
                  }} 
                  className="space-y-3"
                >
                  {/* Confirm option */}
                  <div className={cn(
                    "flex items-start space-x-3 p-3 rounded-lg border transition-colors",
                    responseType === "confirmed" ? "bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-800" : "hover:bg-muted/50"
                  )}>
                    <RadioGroupItem value="confirmed" id="confirmed" className="mt-1" />
                    <Label htmlFor="confirmed" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="font-medium">Bevestigen</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        De activiteit kan plaatsvinden zoals aangevraagd
                      </p>
                    </Label>
                  </div>

                  {/* Alternative option */}
                  <div className={cn(
                    "flex items-start space-x-3 p-3 rounded-lg border transition-colors",
                    responseType === "alternative" ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800" : "hover:bg-muted/50"
                  )}>
                    <RadioGroupItem value="alternative" id="alternative" className="mt-1" />
                    <Label htmlFor="alternative" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-amber-600" />
                        <span className="font-medium">Alternatief voorstellen</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Stel een andere tijd of aanpassing voor
                      </p>
                    </Label>
                  </div>

                  {/* Unavailable option */}
                  <div className={cn(
                    "flex items-start space-x-3 p-3 rounded-lg border transition-colors",
                    responseType === "unavailable" ? "bg-destructive/10 border-destructive/30" : "hover:bg-muted/50"
                  )}>
                    <RadioGroupItem value="unavailable" id="unavailable" className="mt-1" />
                    <Label htmlFor="unavailable" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-destructive" />
                        <span className="font-medium">Niet beschikbaar</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        De activiteit kan niet plaatsvinden
                      </p>
                    </Label>
                  </div>
                </RadioGroup>

                {/* Conditional fields based on response type */}
                {responseType === "confirmed" && (
                  <div className="space-y-4 pt-2">
                    {/* Read-only preferred time */}
                    <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">Gewenste tijd:</span>
                        <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                          {item.preferred_time || "Niet opgegeven"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        U bevestigt de activiteit op de gewenste tijd van de klant.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="quotedPrice" className="flex items-center gap-1">
                        <Euro className="h-4 w-4" />
                        Totaalprijs (incl. BTW) *
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                        <Input
                          id="quotedPrice"
                          type="text"
                          inputMode="decimal"
                          placeholder="0,00"
                          value={quotedPrice}
                          onChange={(e) => {
                            setQuotedPrice(e.target.value);
                            setPriceError("");
                          }}
                          className={cn("pl-7", priceError && "border-destructive")}
                        />
                      </div>
                      {priceError && <p className="text-sm text-destructive">{priceError}</p>}
                      <p className="text-xs text-muted-foreground">
                        Prijs voor {request.number_of_people} personen
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="quotedNotes">Toelichting (optioneel)</Label>
                      <Textarea
                        id="quotedNotes"
                        placeholder="Bijv. 'Inclusief materialen'"
                        value={quotedNotes}
                        onChange={(e) => setQuotedNotes(e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                )}

                {responseType === "alternative" && (
                  <div className="space-y-4 pt-2">
                    {/* Blocked time slots - show actual end times without buffer */}
                    {blockedTimeSlots.length > 0 && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                          <Clock className="h-4 w-4 inline mr-1" />
                          Bezette tijden op dag {item.day_index + 1}:
                        </p>
                        <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                          {blockedTimeSlots.map(slot => {
                            // Calculate actual end time without 30-min buffer
                            const actualEndMinutes = slot.endMinutes - 30;
                            const actualEndTime = minutesToTime(actualEndMinutes);
                            return (
                              <li key={slot.itemId}>
                                {slot.startTime} – {actualEndTime}: {slot.itemName}
                              </li>
                            );
                          })}
                        </ul>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 italic">
                          Er wordt 30 min marge aangehouden tussen activiteiten.
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="proposedTimeAlt" className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Voorgestelde tijd *
                      </Label>
                      <select
                        id="proposedTimeAlt"
                        value={proposedTime}
                        onChange={(e) => {
                          setProposedTime(e.target.value);
                          setTimeError("");
                        }}
                        className={cn(
                          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                          timeError && "border-destructive"
                        )}
                      >
                        <option value="">Selecteer een tijd...</option>
                        {availableTimeSlots.map(time => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                      {timeError && <p className="text-sm text-destructive">{timeError}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="quotedPriceAlt" className="flex items-center gap-1">
                        <Euro className="h-4 w-4" />
                        Alternatieve prijs (optioneel)
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                        <Input
                          id="quotedPriceAlt"
                          type="text"
                          inputMode="decimal"
                          placeholder="0,00"
                          value={quotedPrice}
                          onChange={(e) => setQuotedPrice(e.target.value)}
                          className="pl-7"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Optioneel: vul in als de prijs afwijkt
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="statusNote">Toelichting *</Label>
                      <Textarea
                        id="statusNote"
                        placeholder="Bijv. 'Beschikbaar op 14:00 in plaats van 10:00, of op een andere datum'"
                        value={statusNote}
                        onChange={(e) => {
                          setStatusNote(e.target.value);
                          setNoteError("");
                        }}
                        rows={3}
                        className={cn(noteError && "border-destructive")}
                      />
                      {noteError && <p className="text-sm text-destructive">{noteError}</p>}
                    </div>
                  </div>
                )}

                {responseType === "unavailable" && (
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="unavailableNote">Reden (optioneel)</Label>
                      <Textarea
                        id="unavailableNote"
                        placeholder="Bijv. 'Volgeboekt op deze datum'"
                        value={statusNote}
                        onChange={(e) => setStatusNote(e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button 
                    onClick={handleSubmitResponse} 
                    disabled={isSubmitting} 
                    className="flex-1"
                  >
                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Versturen
                  </Button>
                  <Button 
                    onClick={resetForm} 
                    variant="outline"
                    disabled={isSubmitting}
                  >
                    Annuleren
                  </Button>
                </div>
              </div>
            )}

            {/* Accepted: Mark as executed */}
            {(item.status === "accepted" || (item.status === "confirmed" && hasCustomerAccepted)) && !item.invoiced_number && (
              <Button onClick={handleMarkExecuted} className="w-full" variant="secondary" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                Markeer als uitgevoerd
              </Button>
            )}

            {/* Executed: Register invoice */}
            {canInvoice && (
              <Button onClick={onRegisterInvoice} className="w-full">
                <FileText className="h-4 w-4 mr-2" />
                Factuur registreren
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

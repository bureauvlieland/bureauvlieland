import { useState } from "react";
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
  FileText,
  Hourglass,
  Loader2,
  Play,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { PartnerItem } from "@/types/partner";

interface PartnerItemSheetProps {
  item: PartnerItem | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate: (status: string, note?: string, quotedPrice?: number, quotedNotes?: string) => Promise<boolean>;
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
};

export const PartnerItemSheet = ({
  item,
  isOpen,
  onClose,
  onStatusUpdate,
  onRegisterInvoice,
  commissionPercentage,
}: PartnerItemSheetProps) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const [showPriceForm, setShowPriceForm] = useState(false);
  const [quotedPrice, setQuotedPrice] = useState("");
  const [quotedNotes, setQuotedNotes] = useState("");
  const [priceError, setPriceError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!item) return null;

  const request = item.program_requests;
  const dates = request.selected_dates || [];
  const activityDate = dates[item.day_index];
  const statusInfo = statusConfig[item.status] || statusConfig.pending;

  // Can invoice when executed and customer accepted terms
  const canInvoice = item.status === "executed" && 
    !item.invoiced_number && 
    request.terms_accepted_at !== null;

  // Waiting for customer to accept terms before invoicing
  const awaitingTerms = item.status === "executed" && 
    !item.invoiced_number && 
    request.terms_accepted_at === null;

  const handleConfirm = async () => {
    const priceValue = parseFloat(quotedPrice.replace(",", "."));
    if (!quotedPrice || isNaN(priceValue) || priceValue <= 0) {
      setPriceError("Vul een geldige prijs in");
      return;
    }
    setPriceError("");
    setIsSubmitting(true);
    
    const success = await onStatusUpdate("confirmed", undefined, priceValue, quotedNotes || undefined);
    
    setIsSubmitting(false);
    if (success) {
      setShowPriceForm(false);
      setQuotedPrice("");
      setQuotedNotes("");
      onClose();
    }
  };

  const handleUnavailable = async () => {
    setIsSubmitting(true);
    const success = await onStatusUpdate("unavailable");
    setIsSubmitting(false);
    if (success) onClose();
  };

  const handleMarkExecuted = async () => {
    setIsSubmitting(true);
    const success = await onStatusUpdate("executed");
    setIsSubmitting(false);
    if (success) onClose();
  };

  const handleClose = () => {
    setShowPriceForm(false);
    setQuotedPrice("");
    setQuotedNotes("");
    setPriceError("");
    setIsConfirming(false);
    onClose();
  };

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
          </div>
          <SheetDescription>{item.block_category}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Customer section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Klant</h3>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 font-medium">
                <Building2 className="h-4 w-4" />
                {request.customer_company || request.customer_name}
              </div>
              <div className="grid gap-2 text-sm text-muted-foreground">
                <a href={`mailto:${request.customer_email}`} className="flex items-center gap-2 hover:text-foreground">
                  <Mail className="h-3 w-3" />
                  {request.customer_email}
                </a>
                <a href={`tel:${request.customer_phone}`} className="flex items-center gap-2 hover:text-foreground">
                  <Phone className="h-3 w-3" />
                  {request.customer_phone}
                </a>
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
                    ? format(parseISO(activityDate), "EEEE d MMMM yyyy", { locale: nl })
                    : `Dag ${item.day_index + 1}`}
                </span>
              </div>
              {item.preferred_time && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{item.preferred_time}</span>
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
          {item.quoted_price && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Bevestigde prijs</h3>
                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Euro className="h-4 w-4 text-green-600" />
                    <span className="text-green-700 dark:text-green-400 font-semibold text-lg">
                      €{item.quoted_price.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  {item.quoted_notes && (
                    <p className="text-sm text-muted-foreground mt-2">{item.quoted_notes}</p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Customer notes */}
          {item.customer_notes && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Opmerking klant</h3>
                <p className="text-sm bg-muted/30 rounded-lg p-3">{item.customer_notes}</p>
              </div>
            </>
          )}

          {/* Status note (for alternative/unavailable) */}
          {item.status_note && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Jouw reactie</h3>
                <p className="text-sm bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 text-amber-800 dark:text-amber-300">
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

          {/* Actions */}
          <div className="space-y-3">
            {/* Pending: Confirm or Unavailable */}
            {item.status === "pending" && !showPriceForm && (
              <div className="flex gap-2">
                <Button 
                  onClick={() => setShowPriceForm(true)} 
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Bevestigen
                </Button>
                <Button 
                  onClick={handleUnavailable} 
                  variant="outline" 
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                  Niet beschikbaar
                </Button>
              </div>
            )}

            {/* Price form for confirmation */}
            {item.status === "pending" && showPriceForm && (
              <div className="space-y-4 bg-green-50 dark:bg-green-950/30 rounded-lg p-4 border border-green-200 dark:border-green-900">
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

                <div className="flex gap-2">
                  <Button onClick={handleConfirm} disabled={isSubmitting} className="flex-1">
                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Bevestigen
                  </Button>
                  <Button 
                    onClick={() => setShowPriceForm(false)} 
                    variant="outline"
                    disabled={isSubmitting}
                  >
                    Annuleren
                  </Button>
                </div>
              </div>
            )}

            {/* Accepted: Mark as executed */}
            {item.status === "accepted" && (
              <Button onClick={handleMarkExecuted} className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                Markeer als uitgevoerd
              </Button>
            )}

            {/* Executed: Register invoice */}
            {canInvoice && (
              <Button onClick={onRegisterInvoice} variant="outline" className="w-full">
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

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BureauCentralBadge } from "./BureauCentralBadge";
import {
  Calendar,
  Clock,
  Users,
  Building2,
  Mail,
  Phone,
  FileText,
  CheckCircle,
  MessageSquare,
  Bell,
  RefreshCw,
  Timer,
  Sparkles,
  Hourglass,
} from "lucide-react";
import { format, parseISO, differenceInHours } from "date-fns";
import { nl } from "date-fns/locale";
import type { PartnerItem } from "@/types/partner";

interface PartnerItemCardProps {
  item: PartnerItem;
  onConfirm?: () => void;
  onEditProposal?: () => void;
  onRegisterInvoice?: () => void;
  showInvoiceDetails?: boolean;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Aangevraagd", variant: "secondary" },
  confirmed: { label: "Bevestigd", variant: "default" },
  unavailable: { label: "Niet beschikbaar", variant: "destructive" },
  alternative: { label: "Alternatief", variant: "outline" },
  cancelled: { label: "Geannuleerd", variant: "destructive" },
};

// Check if item was recently modified (reset to pending with new version)
const isRecentlyModified = (item: PartnerItem): boolean => {
  if (item.status !== "pending" || item.version <= 1) return false;
  
  if (item.updated_at) {
    const hoursSinceUpdate = differenceInHours(new Date(), parseISO(item.updated_at));
    return hoursSinceUpdate < 48;
  }
  return false;
};

// Check if item is newly added (within last 24 hours and pending)
const isNewlyAdded = (item: PartnerItem): boolean => {
  if (item.status !== "pending" || item.version > 1) return false;
  
  if (item.created_at) {
    const hoursSinceCreation = differenceInHours(new Date(), parseISO(item.created_at));
    return hoursSinceCreation < 24;
  }
  return false;
};

// Check if ready for invoicing (customer has accepted terms)
const isReadyForInvoice = (item: PartnerItem): boolean => {
  return item.status === "confirmed" && 
         !item.invoiced_number && 
         item.program_requests?.terms_accepted_at !== null;
};

// Check if waiting for customer to accept terms
const isAwaitingCustomerTerms = (item: PartnerItem): boolean => {
  return item.status === "confirmed" && 
         !item.invoiced_number && 
         item.program_requests?.terms_accepted_at === null;
};

export const PartnerItemCard = ({
  item,
  onConfirm,
  onEditProposal,
  onRegisterInvoice,
  showInvoiceDetails = false,
}: PartnerItemCardProps) => {
  const request = item.program_requests;
  const dates = request.selected_dates || [];
  const activityDate = dates[item.day_index];
  const statusInfo = statusConfig[item.status] || statusConfig.pending;
  const recentlyModified = isRecentlyModified(item);
  const newlyAdded = isNewlyAdded(item);
  const readyForInvoice = isReadyForInvoice(item);
  const awaitingTerms = isAwaitingCustomerTerms(item);
  const duration = item.duration;

  return (
    <Card className={recentlyModified ? "border-amber-300 dark:border-amber-700" : ""}>
      <CardHeader className="pb-3">
        {recentlyModified && (
          <div className="flex items-center gap-2 mb-2 px-3 py-2 -mx-2 -mt-2 rounded-t-lg bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300">
            <RefreshCw className="h-4 w-4" />
            <span className="text-sm font-medium">Gewijzigd door klant</span>
            <Badge variant="outline" className="ml-auto text-xs border-amber-300 dark:border-amber-700">
              Versie {item.version}
            </Badge>
          </div>
        )}
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{item.block_name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{item.block_category}</p>
          </div>
          <div className="flex items-center gap-2">
            {newlyAdded && !recentlyModified && (
              <Badge variant="outline" className="bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 border-purple-300">
                <Sparkles className="h-3 w-3 mr-1" />
                Nieuw
              </Badge>
            )}
            {recentlyModified && (
              <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border-amber-300">
                <Bell className="h-3 w-3 mr-1" />
                Actie vereist
              </Badge>
            )}
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Customer info */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 font-medium">
            <Building2 className="h-4 w-4" />
            {request.customer_company || request.customer_name}
          </div>
          <div className="grid sm:grid-cols-3 gap-2 text-sm text-muted-foreground">
            {request.invoicing_mode !== "bureau_central" && (
              <>
                <div className="flex items-center gap-2">
                  <Mail className="h-3 w-3" />
                  <a href={`mailto:${request.customer_email}`} className="hover:underline">
                    {request.customer_email}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3" />
                  <a href={`tel:${request.customer_phone}`} className="hover:underline">
                    {request.customer_phone}
                  </a>
                </div>
              </>
            )}
            <div className="flex items-center gap-2">
              <Users className="h-3 w-3" />
              {request.number_of_people} personen
            </div>
          </div>
        </div>

        {/* Bureau Central invoicing mode indicator */}
        {request.invoicing_mode === "bureau_central" && (
          <BureauCentralBadge variant="compact" />
        )}
        {/* Admin price override - expected price */}
        {item.admin_price_override !== null && item.admin_price_override !== undefined && !item.quoted_price && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm">
            <span className="text-muted-foreground">Verwachte prijs:</span>{" "}
            <span className="font-medium">
              €{item.price_type === "per_person"
                ? (item.admin_price_override * request.number_of_people).toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : item.admin_price_override.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              }
            </span>
            {item.price_type === "per_person" && (
              <span className="text-xs text-muted-foreground ml-1">
                (€{item.admin_price_override.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} p.p.)
              </span>
            )}
          </div>
        )}
        {item.price_indication && !item.admin_price_override && !item.quoted_price && (
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-3 text-sm">
            <span className="text-muted-foreground">Indicatieve prijs (klant zag):</span>{" "}
            <span className="font-medium text-blue-700 dark:text-blue-400">{item.price_indication}</span>
          </div>
        )}

        {/* Activity details */}
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>
              {activityDate
                ? format(parseISO(activityDate), "EEE d MMMM yyyy", { locale: nl })
                : `Dag ${item.day_index + 1}`}
            </span>
          </div>
          {item.preferred_time && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{item.preferred_time}</span>
            </div>
          )}
          {duration && (
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-muted-foreground" />
              <span>{duration}</span>
            </div>
          )}
        </div>

        {/* Quoted price (shown when confirmed) */}
        {item.quoted_price && (
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium text-green-700 dark:text-green-400">
                Bevestigd voor €{item.quoted_price.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {item.quoted_at && (
                <span className="text-xs text-muted-foreground">
                  {format(parseISO(item.quoted_at), "d MMM yyyy", { locale: nl })}
                </span>
              )}
            </div>
            {item.quoted_notes && (
              <p className="text-muted-foreground mt-1">{item.quoted_notes}</p>
            )}
          </div>
        )}

        {/* Awaiting customer terms notice */}
        {awaitingTerms && (
          <div className="bg-muted/50 border border-muted rounded-lg p-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Hourglass className="h-4 w-4" />
              <span>Wacht op klantbevestiging</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              De klant moet eerst de voorwaarden accepteren voordat u kunt factureren.
            </p>
          </div>
        )}

        {/* Alternative proposal / Status note */}
        {item.status_note && (item.status === "alternative" || item.status === "unavailable") && (
          <div className={`rounded-lg p-3 text-sm ${
            item.status === "alternative" 
              ? "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900" 
              : "bg-muted/50 border border-muted"
          }`}>
            <p className={`font-medium mb-1 ${
              item.status === "alternative" 
                ? "text-amber-800 dark:text-amber-300" 
                : "text-muted-foreground"
            }`}>
              {item.status === "alternative" ? "Uw voorstel:" : "Reden:"}
            </p>
            <p className={item.status === "alternative" ? "text-amber-700 dark:text-amber-400" : ""}>
              {item.status_note}
            </p>
          </div>
        )}

        {/* Customer notes */}
        {item.customer_notes && (
          <div className="bg-muted/30 rounded-lg p-3 text-sm">
            <p className="text-muted-foreground font-medium mb-1">Opmerking klant:</p>
            <p>{item.customer_notes}</p>
          </div>
        )}

        {/* Admin price notes / Toelichting Bureau Vlieland */}
        {item.admin_price_notes && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm">
            <p className="text-primary font-medium mb-1">Toelichting Bureau Vlieland:</p>
            <p>{item.admin_price_notes}</p>
          </div>
        )}

        {/* Invoice details (when showing invoiced items) */}
        {showInvoiceDetails && item.invoiced_number && (
          <div className="border-t pt-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4" />
              Facturatiegegevens
            </div>
            <div className="grid sm:grid-cols-3 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Factuurnummer:</span>{" "}
                <span className="font-medium">{item.invoiced_number}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Bedrag:</span>{" "}
                <span className="font-medium">€{item.invoiced_amount?.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Datum:</span>{" "}
                <span className="font-medium">
                  {item.invoiced_date && format(parseISO(item.invoiced_date), "EEE d MMM yyyy", { locale: nl })}
                </span>
              </div>
            </div>
            {item.commission_amount && item.commission_amount > 0 && (
              <div className="text-sm bg-muted/50 rounded p-2">
                <span className="text-muted-foreground">Commissie ({item.commission_percentage}%):</span>{" "}
                <span className="font-medium">€{item.commission_amount.toFixed(2)}</span>
                <Badge variant="outline" className="ml-2 text-xs">
                  {item.commission_status === "pending" && "Te ontvangen"}
                  {item.commission_status === "invoiced" && "Gefactureerd"}
                  {item.commission_status === "paid" && "Betaald"}
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {onConfirm && item.status === "pending" && (
            <Button onClick={onConfirm} className="flex-1">
              <CheckCircle className="h-4 w-4 mr-2" />
              Bevestigen
            </Button>
          )}

          {onEditProposal && item.status === "alternative" && (
            <Button onClick={onEditProposal} variant="outline" className="flex-1">
              <MessageSquare className="h-4 w-4 mr-2" />
              Aanpassen
            </Button>
          )}

          {onRegisterInvoice && readyForInvoice && (
            <Button onClick={onRegisterInvoice} variant="outline" className="flex-1">
              <FileText className="h-4 w-4 mr-2" />
              Factuur registreren
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
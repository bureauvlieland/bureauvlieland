import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  Users,
  Building2,
  Mail,
  Phone,
  FileText,
  CheckCircle,
  XCircle,
  MessageSquare,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import type { PartnerItem } from "@/types/partner";

interface PartnerItemCardProps {
  item: PartnerItem;
  onConfirm?: () => void;
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

export const PartnerItemCard = ({
  item,
  onConfirm,
  onRegisterInvoice,
  showInvoiceDetails = false,
}: PartnerItemCardProps) => {
  const request = item.program_requests;
  const dates = request.selected_dates || [];
  const activityDate = dates[item.day_index];
  const statusInfo = statusConfig[item.status] || statusConfig.pending;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{item.block_name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{item.block_category}</p>
          </div>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
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
            <div className="flex items-center gap-2">
              <Users className="h-3 w-3" />
              {request.number_of_people} personen
            </div>
          </div>
        </div>

        {/* Price indication from customer */}
        {item.price_indication && (
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

        {/* Customer notes */}
        {item.customer_notes && (
          <div className="bg-muted/30 rounded-lg p-3 text-sm">
            <p className="text-muted-foreground font-medium mb-1">Opmerking klant:</p>
            <p>{item.customer_notes}</p>
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
                  {item.invoiced_date && format(parseISO(item.invoiced_date), "d MMM yyyy", { locale: nl })}
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
            <>
              <Button onClick={onConfirm} className="flex-1">
                <CheckCircle className="h-4 w-4 mr-2" />
                Reageren
              </Button>
            </>
          )}

          {onRegisterInvoice && item.status === "confirmed" && !item.invoiced_number && (
            <Button onClick={onRegisterInvoice} variant="outline" className="flex-1">
              <FileText className="h-4 w-4 mr-2" />
              Facturatie registreren
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

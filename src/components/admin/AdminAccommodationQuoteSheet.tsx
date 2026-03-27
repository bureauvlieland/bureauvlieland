import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Euro,
  Building2,
  Calendar,
  FileText,
  ExternalLink,
  Paperclip,
  Check,
  Clock,
} from "lucide-react";
import { useQuoteExtras } from "@/hooks/useQuoteExtras";
import {
  calculateExtraTotal,
  calculateExtrasTotal,
  EXTRA_CATEGORY_LABELS,
  EXTRA_CATEGORY_ICONS,
  type ExtraCategory,
} from "@/types/accommodationExtras";
import type { RoomConfiguration } from "@/types/accommodation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, History } from "lucide-react";

interface QuoteData {
  id: string;
  accommodation_name: string;
  description: string | null;
  room_configuration: any;
  price_total: number;
  price_per_person_per_night: number | null;
  price_includes_vat: boolean | null;
  vat_rate: number | null;
  includes: any;
  conditions: string | null;
  valid_until: string;
  status: string;
  submitted_at: string | null;
  selected_at: string | null;
  partner_notes: string | null;
  quote_attachment_path: string | null;
  quote_attachment_filename: string | null;
  quote_external_url: string | null;
  invoiced_amount: number | null;
  invoiced_number: string | null;
  invoiced_date: string | null;
  commission_percentage: number | null;
  commission_amount: number | null;
  commission_status: string | null;
  forwarded_at: string | null;
  partner?: { id: string; name: string; email: string } | null;
}

interface AdminAccommodationQuoteSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: QuoteData | null;
  numberOfGuests: number;
  numberOfNights: number;
}

const QUOTE_STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Wacht op reactie", variant: "secondary" },
  submitted: { label: "Offerte ontvangen", variant: "default" },
  selected: { label: "Geselecteerd", variant: "default" },
  rejected: { label: "Afgewezen", variant: "destructive" },
  declined: { label: "Afgewezen door partner", variant: "destructive" },
  expired: { label: "Verlopen", variant: "destructive" },
};

export function AdminAccommodationQuoteSheet({
  open,
  onOpenChange,
  quote,
  numberOfGuests,
  numberOfNights,
}: AdminAccommodationQuoteSheetProps) {
  const { data: extras, isLoading: extrasLoading } = useQuoteExtras(quote?.id);

  const { data: history } = useQuery({
    queryKey: ["accommodation-quote-history", quote?.id],
    queryFn: async () => {
      if (!quote?.id) return [];
      const { data } = await supabase
        .from("accommodation_quote_history")
        .select("*")
        .eq("quote_id", quote.id)
        .order("version", { ascending: false });
      return data || [];
    },
    enabled: !!quote?.id && open,
  });

  if (!quote) return null;

  const statusConfig = QUOTE_STATUS_MAP[quote.status] || QUOTE_STATUS_MAP.pending;
  const rooms = (quote.room_configuration as RoomConfiguration[]) || [];
  const includes = (quote.includes as string[]) || [];
  const extrasTotal = extras ? calculateExtrasTotal(extras) : 0;
  const grandTotal = quote.price_total + extrasTotal;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-xl w-full overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between gap-2 pr-6">
            <SheetTitle className="text-lg">{quote.accommodation_name || "Offerte"}</SheetTitle>
            <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
          </div>
          {quote.partner && (
            <SheetDescription>{quote.partner.name} • {quote.partner.email}</SheetDescription>
          )}
        </SheetHeader>

        <div className="space-y-5 pb-6">
          {/* Price summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">Totaalprijs</p>
              <p className="text-xl font-bold">€{grandTotal.toLocaleString()}</p>
              {extrasTotal > 0 && (
                <p className="text-xs text-muted-foreground">
                  Logies €{quote.price_total.toLocaleString()} + extras €{extrasTotal.toLocaleString()}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {quote.price_includes_vat ? "Incl." : "Excl."} BTW ({quote.vat_rate || 9}%)
              </p>
            </div>
            {quote.price_per_person_per_night != null && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Per persoon per nacht</p>
                <p className="text-xl font-bold">€{quote.price_per_person_per_night}</p>
                <p className="text-xs text-muted-foreground">
                  {numberOfGuests} gasten • {numberOfNights} nachten
                </p>
              </div>
            )}
          </div>

          {/* Room configuration */}
          {rooms.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" /> Kamerconfiguratie
                </h4>
                <div className="space-y-2">
                  {rooms.map((room, i) => (
                    <div key={i} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                      <div>
                        <span className="font-medium">{room.count}× {room.type}</span>
                        <span className="text-muted-foreground ml-2">({room.occupancy} pers.)</span>
                      </div>
                      <span>€{room.price_per_night}/nacht</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Extras */}
          {extrasLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : extras && extras.length > 0 ? (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-2">Extra's</h4>
                <div className="space-y-2">
                  {extras.map((extra) => {
                    const icon = extra.category
                      ? EXTRA_CATEGORY_ICONS[extra.category as ExtraCategory]
                      : "📦";
                    const catLabel = extra.category
                      ? EXTRA_CATEGORY_LABELS[extra.category as ExtraCategory]
                      : "";
                    return (
                      <div key={extra.id} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                        <div>
                          <span>{icon} </span>
                          <span className="font-medium">{extra.name}</span>
                          {catLabel && (
                            <span className="text-muted-foreground ml-1 text-xs">({catLabel})</span>
                          )}
                          {extra.pricing_type === "per_person" && (
                            <span className="text-muted-foreground ml-1 text-xs">
                              {extra.quantity}× €{extra.unit_price}
                            </span>
                          )}
                        </div>
                        <span>€{calculateExtraTotal(extra).toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : null}

          {/* Includes */}
          {includes.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-2">Inbegrepen</h4>
                <ul className="space-y-1">
                  {includes.map((item, i) => (
                    <li key={i} className="text-sm flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {/* Description */}
          {quote.description && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-1">Beschrijving</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{quote.description}</p>
              </div>
            </>
          )}

          {/* Conditions */}
          {quote.conditions && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-1">Voorwaarden</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{quote.conditions}</p>
              </div>
            </>
          )}

          {/* Partner notes */}
          {quote.partner_notes && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-1">Partner notities</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{quote.partner_notes}</p>
              </div>
            </>
          )}

          {/* Attachments */}
          {(quote.quote_attachment_path || quote.quote_external_url) && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-2">Bijlagen</h4>
                <div className="flex flex-wrap gap-2">
                  {quote.quote_external_url && (
                    <a
                      href={quote.quote_external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Externe link
                    </a>
                  )}
                  {quote.quote_attachment_path && (
                    <a
                      href={quote.quote_attachment_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      {quote.quote_attachment_filename || "Bijlage"}
                    </a>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Validity & dates */}
          <Separator />
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              Geldig tot: {format(new Date(quote.valid_until), "EEE d MMM yyyy", { locale: nl })}
            </div>
            {quote.submitted_at && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Ontvangen: {format(new Date(quote.submitted_at), "EEE d MMM yyyy", { locale: nl })}
              </div>
            )}
            {quote.selected_at && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Check className="h-3.5 w-3.5" />
                Geselecteerd: {format(new Date(quote.selected_at), "EEE d MMM yyyy", { locale: nl })}
              </div>
            )}
            {quote.forwarded_at && (
              <div className="flex items-center gap-1.5 text-green-600">
                <Check className="h-3.5 w-3.5" />
                Doorgestuurd: {format(new Date(quote.forwarded_at), "EEE d MMM yyyy", { locale: nl })}
              </div>
            )}
          </div>

          {/* Admin-only: Commission info */}
          {(quote.commission_percentage != null || quote.commission_amount != null) && (
            <>
              <Separator />
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <Euro className="h-4 w-4" /> Commissie (admin)
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {quote.commission_percentage != null && (
                    <div>
                      <p className="text-muted-foreground">Percentage</p>
                      <p className="font-medium">{quote.commission_percentage}%</p>
                    </div>
                  )}
                  {quote.commission_amount != null && (
                    <div>
                      <p className="text-muted-foreground">Bedrag</p>
                      <p className="font-medium">€{quote.commission_amount.toLocaleString()}</p>
                    </div>
                  )}
                  {quote.commission_status && (
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <p className="font-medium">{quote.commission_status}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Admin-only: Invoice info */}
          {(quote.invoiced_amount != null || quote.invoiced_number) && (
            <>
              <Separator />
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <FileText className="h-4 w-4" /> Facturatie (admin)
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {quote.invoiced_number && (
                    <div>
                      <p className="text-muted-foreground">Factuurnummer</p>
                      <p className="font-medium">{quote.invoiced_number}</p>
                    </div>
                  )}
                  {quote.invoiced_amount != null && (
                    <div>
                      <p className="text-muted-foreground">Bedrag</p>
                      <p className="font-medium">€{quote.invoiced_amount.toLocaleString()}</p>
                    </div>
                  )}
                  {quote.invoiced_date && (
                    <div>
                      <p className="text-muted-foreground">Datum</p>
                      <p className="font-medium">
                        {format(new Date(quote.invoiced_date), "EEE d MMM yyyy", { locale: nl })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

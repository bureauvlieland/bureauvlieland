import { useState } from "react";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { ArrowLeftRight, ChevronDown, ChevronUp, Clock, FileText, Loader2, MapPin, Play, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Notice, Pill } from "@/components/system";
import { cn } from "@/lib/utils";
import type { PartnerItem } from "@/types/partner";
import { itemDisplayStatusConfig, deriveItemDisplayStatusLoose } from "@/lib/itemStatus";
import { canPartnerInvoiceItem, isAwaitingInvoicingRelease } from "@/lib/partnerInvoicing";
import { getDisplayLineTotal, getNumberOfDays, hasOpenAdminPriceChange, isPerDayItem, isPerPersonItem } from "@/lib/portalPricing";
import { formatDurationWindow, formatTimeHHmm } from "@/lib/timeUtils";
import { formatEuro } from "@/lib/formatEuro";

/**
 * De onderdeelkaart van de partner (partnerportaal fase 2, regel 3: één
 * reactie per onderdeel). Dezelfde opbouw als de kaart van de klant: tijd
 * met het soort tijd, titel, personen en plek, één status-`Pill`, de prijs
 * en één knop. Reageren (bevestigen, andere tijd of prijs, niet
 * beschikbaar) gebeurt alleen in de sheet; de kaart opent die.
 */
interface PartnerItemCardProps {
  item: PartnerItem;
  /** Opent de sheet, voor de reactie of de details. */
  onOpen: () => void;
  onRegisterInvoice: () => void;
  /** "Markeer uitgevoerd" en "Akkoord met nieuwe prijs" zijn één klik en blijven op de kaart. */
  onStatusUpdate: (status: string, note?: string, quotedPrice?: number, quotedNotes?: string) => Promise<boolean>;
  showDate?: boolean;
}

export const PartnerItemCard = ({ item, onOpen, onRegisterInvoice, onStatusUpdate, showDate = false }: PartnerItemCardProps) => {
  const [busy, setBusy] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const request = item.program_requests;
  const dates = (request.selected_dates || []) as string[];
  const activityDate = dates[item.day_index];
  const numDays = getNumberOfDays(request.selected_dates);
  const effectivePeople = item.override_people ?? request.number_of_people;

  const displayStatus = deriveItemDisplayStatusLoose(item, {
    programPeople: request.number_of_people ?? 0,
    numberOfDays: numDays || 1,
    audience: "partner",
  });
  const statusInfo = itemDisplayStatusConfig[displayStatus];

  const hasCustomerAccepted = !!item.customer_accepted_at || !!item.customer_approved_at;
  const effectiveStatus = item.status === "confirmed" && hasCustomerAccepted ? "accepted" : item.status;
  const canRespond = item.status === "pending" || item.status === "alternative" || item.status === "counter_proposed";
  const canInvoice = canPartnerInvoiceItem(item, request);
  const awaitingTerms = isAwaitingInvoicingRelease(item, request);
  const canMarkExecuted = effectiveStatus === "accepted" && !!item.quoted_price;

  const adminTotal =
    item.admin_price_override != null
      ? item.admin_price_override * (isPerPersonItem(item) ? effectivePeople : 1) * (isPerDayItem(item) ? numDays : 1)
      : null;
  const openPriceChange =
    !!item.quoted_price &&
    hasOpenAdminPriceChange(item as never, effectivePeople, numDays) &&
    !item.invoiced_number &&
    item.status !== "cancelled" &&
    item.status !== "executed";
  const lineTotal = getDisplayLineTotal(item, effectivePeople, numDays);

  // Tijd en het soort tijd, in de woorden van de partner.
  const counterTime = item.status === "counter_proposed" ? item.customer_counter_time : null;
  const timeKind: { time: string | null; kind: string } = counterTime
    ? { time: formatTimeHHmm(counterTime), kind: "klant wil" }
    : item.confirmed_time
      ? { time: formatTimeHHmm(item.confirmed_time), kind: "bevestigd" }
      : item.proposed_time
        ? { time: formatTimeHHmm(item.proposed_time), kind: "uw voorstel" }
        : item.preferred_time && item.preferred_time !== "flexibel"
          ? { time: formatTimeHHmm(item.preferred_time), kind: "gewenst" }
          : { time: null, kind: "flexibel" };
  const window = formatDurationWindow(timeKind.time, item.duration);

  const run = async (fn: () => Promise<boolean>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  // De duur staat al in het tijdvenster; zonder tijd staat hij hier.
  const metaParts = [`${effectivePeople} pers.`, window ? null : item.duration, showDate && activityDate ? format(parseISO(activityDate), "EEE d MMM", { locale: nl }) : null].filter(
    Boolean,
  ) as string[];
  const hasDetails = Boolean(item.customer_notes || item.quoted_notes || item.status_note || item.admin_price_notes);

  return (
    <article
      id={`onderdeel-${item.id}`}
      className={cn(
        "scroll-mt-32 rounded-lg border bg-card p-4 transition-colors duration-base",
        statusInfo.partnerTone === "warning" && "border-warning/40",
        (item.status === "cancelled" || item.status === "unavailable") && "opacity-60",
      )}
    >
      <div className="flex gap-4">
        {/* Tijd: links op desktop */}
        <div className="hidden w-16 shrink-0 flex-col items-end pt-0.5 text-right sm:flex">
          <span className={cn("text-base font-semibold tabular-nums", timeKind.time ? "text-primary" : "text-muted-foreground")}>{timeKind.time ?? "flex."}</span>
          <span className="text-[11px] leading-tight text-muted-foreground">{timeKind.kind}</span>
        </div>

        <div className="min-w-0 flex-1">
          {/* Tijd: bovenaan op een telefoon */}
          <p className="mb-1 flex items-center gap-1.5 text-sm sm:hidden">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            <span className={cn("font-semibold tabular-nums", timeKind.time ? "text-primary" : "text-muted-foreground")}>{timeKind.time ?? "Flexibel"}</span>
            <span className="text-muted-foreground">· {timeKind.kind}</span>
          </p>

          <h3 className="break-words text-base font-medium leading-snug">{item.block_name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Pill tone={statusInfo.partnerTone} title={statusInfo.partnerTooltip}>
              {statusInfo.partnerLabel}
            </Pill>
            {item.version > 1 && <Pill tone="neutral">Gewijzigd (v{item.version})</Pill>}
            {item.is_custom_quote && <Pill tone="brand">Maatwerk</Pill>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {window && <span className="mr-2 inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden="true" />{window}</span>}
            <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" aria-hidden="true" />{metaParts.join(" · ")}</span>
          </p>
          {item.location_address && (
            <p className="mt-0.5 flex items-start gap-1 text-xs text-muted-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{item.location_address}</span>
            </p>
          )}
          {lineTotal != null && (
            <p className="mt-1.5 text-sm">
              <span className="font-semibold">{formatEuro(lineTotal)}</span>
              <span className="ml-1 text-xs text-muted-foreground">totaal{item.quoted_price == null ? " · verwacht" : ""}</span>
            </p>
          )}

          {/* Wat er nu van de partner wordt gevraagd */}
          {item.status === "counter_proposed" && (
            <Notice
              tone="warning"
              className="mt-3"
              title={`De klant wil liever ${formatTimeHHmm(item.customer_counter_time) ?? item.customer_counter_time ?? "een andere tijd"}`}
              icon={<ArrowLeftRight className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
            >
              {item.proposed_time && <p>Uw voorstel was {formatTimeHHmm(item.proposed_time)}.</p>}
              {item.customer_counter_note && <p>"{item.customer_counter_note}"</p>}
            </Notice>
          )}
          {openPriceChange && adminTotal != null && (
            <Notice tone="warning" className="mt-3" title={`Bureau Vlieland stelt een nieuwe prijs voor: ${formatEuro(adminTotal)}`}>
              {item.admin_price_notes && <p>{item.admin_price_notes}</p>}
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void run(() => onStatusUpdate("acknowledge_price_change", undefined, adminTotal, "Akkoord met prijswijziging Bureau Vlieland"))}
                >
                  {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                  Akkoord met de nieuwe prijs
                </Button>
                <Button size="sm" variant="ghost" onClick={onOpen}>
                  Eigen prijs voorstellen
                </Button>
              </div>
            </Notice>
          )}
          {item.partner_instructions && (
            <Notice tone="info" className="mt-3" title="Instructie van Bureau Vlieland">
              <p className="whitespace-pre-wrap">{item.partner_instructions}</p>
            </Notice>
          )}
          {awaitingTerms && (
            <p className="mt-2 text-xs text-muted-foreground">Factureren kan zodra de klant de voorwaarden heeft getekend of Bureau Vlieland het project heeft vrijgegeven.</p>
          )}
          {item.auto_closed_reason === "auto_past_execution" && (
            <p className="mt-2 text-xs text-muted-foreground">
              De datum is verstreken zonder afronding. Controleer of dit onderdeel nog gefactureerd moet worden, of neem contact op met Bureau Vlieland als de status niet klopt.
            </p>
          )}

          {/* Acties als één rij: één primaire knop */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {canRespond && (
              <Button size="sm" onClick={onOpen}>
                {item.status === "alternative" ? "Voorstel aanpassen" : "Reageren"}
              </Button>
            )}
            {!canRespond && canInvoice && (
              <Button size="sm" onClick={onRegisterInvoice}>
                <FileText className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Factuur registreren
              </Button>
            )}
            {canMarkExecuted && (
              <Button size="sm" variant="outline" disabled={busy || openPriceChange} onClick={() => void run(() => onStatusUpdate("executed"))}>
                {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" /> : <Play className="mr-1.5 h-4 w-4" aria-hidden="true" />}
                Markeer uitgevoerd
              </Button>
            )}
            {!canRespond && (
              <Button size="sm" variant="ghost" onClick={onOpen}>
                Alle gegevens
              </Button>
            )}
            {hasDetails && (
              <Button size="sm" variant="ghost" className="ml-auto text-primary hover:text-primary" onClick={() => setDetailsOpen((o) => !o)} aria-expanded={detailsOpen}>
                {detailsOpen ? "Minder" : "Details"}
                {detailsOpen ? <ChevronUp className="ml-1 h-4 w-4" aria-hidden="true" /> : <ChevronDown className="ml-1 h-4 w-4" aria-hidden="true" />}
              </Button>
            )}
          </div>

          {detailsOpen && hasDetails && (
            <dl className="mt-3 space-y-2 border-t pt-3 text-sm">
              {item.customer_notes && (
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Wens van de klant</dt>
                  <dd>{item.customer_notes}</dd>
                </div>
              )}
              {item.admin_price_notes && (
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Toelichting van Bureau Vlieland</dt>
                  <dd>{item.admin_price_notes}</dd>
                </div>
              )}
              {item.quoted_notes && (
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Uw toelichting bij de prijs</dt>
                  <dd>{item.quoted_notes}</dd>
                </div>
              )}
              {item.status_note && item.status !== "counter_proposed" && (
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Uw toelichting</dt>
                  <dd>{item.status_note}</dd>
                </div>
              )}
            </dl>
          )}
        </div>
      </div>
    </article>
  );
};

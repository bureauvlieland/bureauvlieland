import { useState } from "react";
import { useParams } from "react-router-dom";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  ArrowLeftRight,
  CalendarPlus,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Loader2,
  MapPin,
  MessageSquare,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Notice, Pill } from "@/components/system";
import { ItemDisplayStatusBadge } from "@/components/shared/ItemDisplayStatusBadge";
import { CustomerItemChangelog } from "./CustomerItemChangelog";
import { OptionalAddOnsStrip } from "./OptionalAddOnsStrip";
import { MapAvailabilityLine } from "./MapAvailabilityLine";
import { TimeSheet } from "./TimeSheet";
import { cn } from "@/lib/utils";
import { deriveItemDisplayStatus, customerItemStatusLabel } from "@/lib/itemStatus";
import { downloadSingleEvent } from "@/lib/calendarExport";
import { type ProgramRequestItem } from "@/types/programRequest";
import { formatTimeHHmm } from "@/lib/timeUtils";
import { getBlockImage } from "@/lib/buildingBlockUtils";
import { getDisplayLineTotal, getDisplayUnitPrice, isPerPersonItem, isProvisionalPrice, hasOpenAdminPriceChange, priceChangeRequiresReapproval } from "@/lib/portalPricing";
import { useAppSettings } from "@/hooks/useAppSettings";
import { resolveCustomerItemDescription } from "@/lib/customerItemDescription";
import { presentProvider, itemLocationLine, groupSizeLabel } from "@/lib/providerPresentation";
import { transformImageUrl } from "@/lib/supabaseImage";

/**
 * De onderdeelkaart in de tijdlijn (klantportaal fase 2, vervangt
 * CustomerProgramItem): tijd links op desktop en bovenaan op een telefoon met
 * het soort tijd erbij, een titel die altijd doorloopt, één status-pill, één
 * regel aanbieder en plek, de prijs, en de acties als één rij. De uitleg en
 * de velden staan ingeklapt onder "Details". Tijd wijzigen gaat via de
 * TimeSheet, verplaatsen via "Naar andere dag".
 */
interface ProgramItemCardProps {
  item: ProgramRequestItem;
  selectedDates: Date[];
  onUpdate: (updates: Partial<ProgramRequestItem>) => void;
  onRemove: () => void;
  onAccept?: () => Promise<boolean>;
  onCounterProposal?: (counterTime: string, counterNote: string) => Promise<boolean>;
  onApproveQuoteItem?: () => Promise<boolean>;
  /** Na verplaatsen naar een andere dag: de ouder scrolt mee en laat de kaart oplichten. */
  onMoved?: (itemId: string, dayIndex: number) => void;
  allItems?: ProgramRequestItem[];
  hasChanges?: boolean;
  invoicingMode?: string;
  vatRate?: number;
  isPreApproval?: boolean;
  quoteStatus?: string | null;
  isPostExecution?: boolean;
  readOnly?: boolean;
  numberOfPeople?: number;
  /** Lokaal gemarkeerd om te verwijderen, nog niet verstuurd. */
  isPendingRemoval?: boolean;
  /** Kort oplichten (na toevoegen of verplaatsen). */
  highlighted?: boolean;
  /** Deelnemers zien geen status, prijs of acties; alleen tijd, plek, uitleg, agenda en route. */
  audience?: "customer" | "participant";
}

const money = (n: number) => n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const ProgramItemCard = ({
  item,
  selectedDates,
  onUpdate,
  onRemove,
  onAccept,
  onCounterProposal,
  onApproveQuoteItem,
  onMoved,
  allItems = [],
  hasChanges = false,
  invoicingMode,
  vatRate,
  isPreApproval = false,
  quoteStatus,
  isPostExecution = false,
  readOnly = false,
  numberOfPeople,
  isPendingRemoval = false,
  highlighted = false,
  audience = "customer",
}: ProgramItemCardProps) => {
  const forParticipant = audience === "participant";
  const [isOpen, setIsOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const { token: customerToken } = useParams<{ token: string }>();
  const { settings: appSettings } = useAppSettings();

  const currentDate = selectedDates[item.day_index];
  const isSelfArranged = item.block_type === "self_arranged";
  const isMultiDay = selectedDates.length > 1;
  const priceThresholds = {
    pct: appSettings.price_change_reapproval_pct,
    absEur: appSettings.price_change_reapproval_abs_eur,
  };

  // Een openstaande prijswijziging door Bureau Vlieland die groot genoeg is om
  // opnieuw akkoord te vragen; kleine correcties en dalingen gaan stil door.
  const hasOpenPriceChange = !isSelfArranged && hasOpenAdminPriceChange(item, numberOfPeople ?? 1, selectedDates.length || 1);
  const priceChangeNeedsAttention =
    !isSelfArranged &&
    (item.status === "confirmed" || item.status === "alternative" || !!item.customer_accepted_at) &&
    priceChangeRequiresReapproval(item, numberOfPeople ?? 1, selectedDates.length || 1, priceThresholds);
  const priceChangeInfoOnly = hasOpenPriceChange && !priceChangeNeedsAttention;

  // Eén bron voor pill en knop, zodat "Uw goedkeuring gevraagd" altijd een knop heeft.
  const derivedStatus = deriveItemDisplayStatus(item, {
    programPeople: numberOfPeople ?? 1,
    numberOfDays: selectedDates.length || 1,
    quoteStatus: quoteStatus ?? null,
    priceReapprovalThresholds: priceThresholds,
    isPostExecution,
  });
  const isApprovalPhase = quoteStatus === "offerte_verstuurd" || quoteStatus === "akkoord_ontvangen";
  const partnerHasResponded =
    !isSelfArranged &&
    item.provider_id !== "bureau" &&
    !item.customer_approved_at &&
    (item.status === "confirmed" || item.status === "alternative") &&
    (item.quoted_price != null || !!(item as any).quoted_at || !!(item as any).partner_price_change_acknowledged_at);
  const needsCustomerAction =
    !isSelfArranged && !isPostExecution && isApprovalPhase && (derivedStatus === "wacht_op_klant" || derivedStatus === "prijs_gewijzigd");
  const isNewlyAdded = item.status === "pending" && new Date(item.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000;
  const canEdit = item.status !== "cancelled" && !readOnly && !isPostExecution && !forParticipant;

  // Tijd en het soort tijd
  const timeKind: { time: string | null; kind: string } = item.confirmed_time
    ? { time: formatTimeHHmm(item.confirmed_time), kind: "bevestigd" }
    : item.proposed_time && (item.status === "confirmed" || item.status === "alternative")
      ? { time: formatTimeHHmm(item.proposed_time), kind: "voorstel aanbieder" }
      : item.preferred_time && item.preferred_time !== "flexibel"
        ? { time: formatTimeHHmm(item.preferred_time), kind: "gewenst" }
        : { time: null, kind: "flexibel" };

  const thumbnailSrc = getBlockImage({ image_url: item.image_url, image_asset: item.image_asset } as any);
  const provider = isSelfArranged || item.provider_id === "bureau" ? null : presentProvider(item.provider_profile);
  const locationLine = itemLocationLine(item, provider);
  const groupSize = groupSizeLabel(item.block_min_people, item.block_max_people);
  const metaParts = [
    isSelfArranged ? "Zelf te boeken en betalen" : item.provider_name,
    item.duration,
    groupSize,
    item.override_people || numberOfPeople ? `${item.override_people ?? numberOfPeople} pers.` : null,
  ].filter(Boolean) as string[];

  // Prijs: de admin-override wint bij een open wijziging, anders de indicatie.
  const effectivePeople = item.override_people ?? numberOfPeople ?? 1;
  const numberOfDays = Math.max(selectedDates?.length ?? 1, 1);
  const lineTotal = isSelfArranged ? null : getDisplayLineTotal(item, effectivePeople, numberOfDays);
  const unitPrice = isSelfArranged ? null : getDisplayUnitPrice(item, effectivePeople);
  const showPerPerson = lineTotal != null && isPerPersonItem(item) && unitPrice !== null && unitPrice !== lineTotal;
  const isProvisional = isProvisionalPrice(item);

  const approve = async () => {
    if (!onApproveQuoteItem && !onAccept) return;
    setApproving(true);
    try {
      if (onApproveQuoteItem) await onApproveQuoteItem();
      else if (onAccept) await onAccept();
    } finally {
      setApproving(false);
    }
  };

  const routeUrl = item.location_address
    ? item.location_lat && item.location_lng
      ? `https://www.google.com/maps/dir/?api=1&destination=${item.location_lat},${item.location_lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location_address)}`
    : null;

  const exportToAgenda = () =>
    downloadSingleEvent(
      {
        id: item.id,
        block_name: item.block_name,
        provider_name: item.provider_name,
        day_index: item.day_index,
        confirmed_time: item.confirmed_time,
        proposed_time: item.proposed_time,
        preferred_time: item.preferred_time,
        duration: item.duration,
        location_address: item.location_address,
      },
      selectedDates.map((d) => format(d, "yyyy-MM-dd")),
      undefined,
    );

  const moveToDay = (dayIndex: number) => {
    if (dayIndex === item.day_index) return;
    onUpdate({ day_index: dayIndex });
    onMoved?.(item.id, dayIndex);
  };

  const description = resolveCustomerItemDescription(item as any);
  // De prijstoelichting van Bureau Vlieland, tenzij die gelijk is aan de uitleg onder "Details".
  const priceNote =
    !isSelfArranged && item.admin_price_notes?.trim() && item.admin_price_notes.trim() !== description?.trim() ? item.admin_price_notes.trim() : null;

  return (
    <article
      id={`onderdeel-${item.id}`}
      className={cn(
        "scroll-mt-32 rounded-lg border bg-card p-4 transition-colors duration-base",
        hasChanges && "ring-2 ring-primary/40",
        item.status === "cancelled" && "opacity-60",
        isPendingRemoval && "border-destructive/40 bg-destructive-soft/40",
        needsCustomerAction && !isPendingRemoval && "border-warning/40",
        highlighted && "animate-flash-new",
      )}
    >
      {isPendingRemoval && (
        <Notice tone="danger" className="mb-3" icon={<Trash2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}>
          <p>
            <strong>Wordt verwijderd</strong> zodra u uw wijzigingen verstuurt. Gebruik "Verwijderen ongedaan maken" om het terug te zetten.
          </p>
        </Notice>
      )}

      <div className="flex gap-4">
        {/* Tijd: links op desktop */}
        <div className="hidden w-16 shrink-0 flex-col items-end pt-0.5 text-right sm:flex">
          <span className={cn("text-base font-semibold tabular-nums", timeKind.time ? "text-primary" : "text-muted-foreground")}>
            {timeKind.time ?? "flex."}
          </span>
          <span className="text-[11px] leading-tight text-muted-foreground">{timeKind.kind}</span>
        </div>

        <div className="min-w-0 flex-1">
          {/* Tijd: bovenaan op een telefoon */}
          <p className="mb-1 flex items-center gap-1.5 text-sm sm:hidden">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            <span className={cn("font-semibold tabular-nums", timeKind.time ? "text-primary" : "text-muted-foreground")}>{timeKind.time ?? "Flexibel"}</span>
            <span className="text-muted-foreground">· {timeKind.kind}</span>
          </p>

          <div className="flex items-start gap-3">
            {thumbnailSrc && thumbnailSrc !== "/placeholder.svg" && (
              <img
                src={transformImageUrl(thumbnailSrc, { width: 240 })}
                alt=""
                className={cn("hidden h-16 w-16 shrink-0 rounded-lg object-cover sm:block", isPendingRemoval && "grayscale opacity-60")}
                loading="lazy"
              />
            )}
            <div className="min-w-0 flex-1">
              <h3 className={cn("break-words text-base font-medium leading-snug", isPendingRemoval && "line-through text-muted-foreground")}>
                {item.block_name}
              </h3>
              {!forParticipant && (
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <ItemDisplayStatusBadge status={derivedStatus} audience="customer" label={customerItemStatusLabel(derivedStatus, item)} />
                  {(item as any).is_custom_quote && <Pill tone="brand">Maatwerk</Pill>}
                  {isNewlyAdded && <Pill tone="neutral">Nieuw</Pill>}
                  {priceChangeInfoOnly && <Pill tone="neutral">Prijs bijgewerkt</Pill>}
                </div>
              )}
              <p className="mt-1 text-sm text-muted-foreground">{metaParts.join(" · ")}</p>
              {locationLine && (
                <p className="mt-0.5 flex items-start gap-1 text-xs text-muted-foreground">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{locationLine}</span>
                </p>
              )}
              {typeof item.block_map_activity_type_id === "number" && item.provider_profile?.map_tenant_slug && !isSelfArranged && !forParticipant && item.status !== "cancelled" && (
                <MapAvailabilityLine
                  tenantSlug={item.provider_profile.map_tenant_slug}
                  activityTypeId={item.block_map_activity_type_id}
                  date={currentDate}
                  groupSize={item.override_people ?? numberOfPeople ?? null}
                />
              )}
              {/* Prijs */}
              {!isSelfArranged && !forParticipant && (lineTotal != null ? (
                <p className="mt-1.5 text-sm">
                  <span className={cn("font-semibold", isProvisional ? "text-foreground" : "text-success-ink")}>
                    €{money(showPerPerson ? unitPrice! : lineTotal)}
                  </span>
                  <span className="ml-1 text-xs text-muted-foreground">
                    {showPerPerson ? (item.price_type === "per_person_per_day" ? "p.p.p.d." : "p.p.") : "totaal"}
                    {vatRate !== undefined && ` (${vatRate}% btw)`}
                    {isProvisional && " · voorlopig"}
                  </span>
                </p>
              ) : item.price_indication ? (
                <p className="mt-1.5 text-sm font-medium">{item.price_indication}</p>
              ) : null)}
              {priceNote && !forParticipant && <p className="mt-0.5 text-xs text-muted-foreground">{priceNote}</p>}
              {isSelfArranged && item.external_url && (
                <a href={item.external_url} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  {item.external_url}
                </a>
              )}
            </div>
          </div>

          {/* Wat er nu van de klant wordt gevraagd */}
          {priceChangeNeedsAttention && needsCustomerAction && canEdit && (
            <Notice tone="warning" className="mt-3">
              <p>De prijs van dit onderdeel is door Bureau Vlieland aangepast. Geef opnieuw uw akkoord op de nieuwe prijs.</p>
            </Notice>
          )}
          {needsCustomerAction && canEdit && !priceChangeNeedsAttention && (
            <Notice tone="warning" className="mt-3">
              <p>
                {item.status === "alternative" ? (
                  <>De aanbieder stelt een andere tijd of prijs voor. Bekijk de details en geef akkoord, of stel via "Tijd" zelf een andere tijd voor.</>
                ) : item.provider_id === "bureau" ? (
                  <>Dit onderdeel verzorgt Bureau Vlieland zelf. Keur het goed, dan regelen wij het.</>
                ) : partnerHasResponded ? (
                  <>
                    De aanbieder heeft uw eerdere goedkeuring verwerkt
                    {item.quoted_price != null && <> en een definitieve prijs van <strong>€{money(Number(item.quoted_price))}</strong> doorgegeven</>}
                    . Geef opnieuw akkoord om dit onderdeel definitief te bevestigen.
                  </>
                ) : (
                  <>Dit onderdeel hoort bij uw voorstel. Keur het goed, dan vragen wij beschikbaarheid en de definitieve prijs op bij de aanbieder.</>
                )}
              </p>
            </Notice>
          )}
          {!isSelfArranged && !forParticipant && item.quoted_price && item.quoted_notes && (
            <p className="mt-2 text-xs italic text-muted-foreground">{item.quoted_notes}</p>
          )}
          {!forParticipant && item.status_note && !/^Tijd (\d{1,2}:\d{2} ingesteld|verwijderd) door (admin|Bureau Vlieland)/i.test(item.status_note) && (
            <Notice tone="info" className="mt-3" title="Toelichting van de aanbieder" icon={<MessageSquare className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}>
              <p>{item.status_note}</p>
            </Notice>
          )}
          {!forParticipant && item.status === "counter_proposed" && (
            <Notice tone="info" className="mt-3" title={`Uw voorstel: ${formatTimeHHmm(item.customer_counter_time) ?? item.customer_counter_time}`} icon={<ArrowLeftRight className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}>
              {item.customer_counter_note && <p>"{item.customer_counter_note}"</p>}
              <p>De aanbieder laat weten of deze tijd kan.</p>
            </Notice>
          )}

          {/* Acties als één rij */}
          {canEdit && (
            isPendingRemoval ? (
              <div className="mt-3">
                <Button size="sm" variant="outline" onClick={onRemove}>
                  <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
                  Verwijderen ongedaan maken
                </Button>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap items-center gap-1">
                {needsCustomerAction && (onApproveQuoteItem || onAccept) && (
                  <Button size="sm" onClick={approve} disabled={approving} className="mr-1">
                    {approving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
                    {priceChangeNeedsAttention ? "Nieuwe prijs goedkeuren" : item.status === "alternative" ? "Wijziging goedkeuren" : "Goedkeuren"}
                  </Button>
                )}
                {!isSelfArranged && item.status !== "counter_proposed" && (
                  <Button size="sm" variant="ghost" onClick={() => setTimeOpen(true)}>
                    <Clock className="h-4 w-4" aria-hidden="true" />
                    Tijd
                  </Button>
                )}
                {isMultiDay && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost">
                        <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
                        Naar andere dag
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {selectedDates.map((date, idx) => (
                        <DropdownMenuItem key={idx} disabled={idx === item.day_index} onClick={() => moveToDay(idx)}>
                          {format(date, "EEEE d MMMM", { locale: nl })}
                          {idx === item.day_index && " (nu)"}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <Button size="sm" variant="ghost" onClick={exportToAgenda}>
                  <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                  Agenda
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={onRemove}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Verwijderen
                </Button>
              </div>
            )
          )}

          {forParticipant && (
            <div className="mt-3 flex flex-wrap items-center gap-1">
              <Button size="sm" variant="ghost" onClick={exportToAgenda}>
                <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                Agenda
              </Button>
              {routeUrl && (
                <Button asChild size="sm" variant="ghost">
                  <a href={routeUrl} target="_blank" rel="noopener noreferrer">
                    <MapPin className="h-4 w-4" aria-hidden="true" />
                    Route
                  </a>
                </Button>
              )}
            </div>
          )}

          {!(item as any).parent_item_id && !isPostExecution && !forParticipant && (
            <OptionalAddOnsStrip item={item} allItems={allItems} quoteStatus={quoteStatus} readOnly={readOnly} />
          )}

          {/* Details ingeklapt */}
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <div className="mt-2 flex items-center gap-2">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-primary hover:text-primary" aria-label={isOpen ? "Details verbergen" : "Details tonen"}>
                  {isOpen ? "Minder" : "Details"}
                  {isOpen ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
                </Button>
              </CollapsibleTrigger>
              {customerToken && !forParticipant && <CustomerItemChangelog itemId={item.id} customerToken={customerToken} />}
            </div>
            <CollapsibleContent className="mt-3 space-y-4 border-t pt-4">
              {description && <p className="whitespace-pre-line text-sm text-muted-foreground">{description}</p>}

              {provider?.hasContent && (
                <div className="space-y-2.5 rounded-lg border bg-muted/30 p-3">
                  <p className="text-eyebrow font-medium uppercase text-muted-foreground">Over {provider.name}</p>
                  {provider.images.length > 0 && (
                    <div className="flex gap-1.5 overflow-x-auto">
                      {provider.images.slice(0, 6).map((img, i) => (
                        <a key={i} href={img.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                          <img src={transformImageUrl(img.url, { width: 320 })} alt={img.alt || provider.name} className="h-20 w-28 rounded-md object-cover" loading="lazy" />
                        </a>
                      ))}
                    </div>
                  )}
                  {provider.highlights.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {provider.highlights.slice(0, 6).map((h, i) => (
                        <Pill key={i} tone="neutral">{h}</Pill>
                      ))}
                    </div>
                  )}
                  {provider.aboutText && <p className="whitespace-pre-line text-sm text-muted-foreground">{provider.aboutText}</p>}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {provider.addressLine && (
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{provider.addressLine}</span>
                    )}
                    {provider.websiteUrl && (
                      <a href={provider.websiteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />Website
                      </a>
                    )}
                  </div>
                </div>
              )}

              {!forParticipant && Array.isArray((item as any).quote_lines) && (item as any).quote_lines.length > 0 && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="mb-2 text-eyebrow font-medium uppercase text-muted-foreground">Specificatie</p>
                  <ul className="space-y-1 text-sm">
                    {(item as any).quote_lines.map((l: any) => {
                      const qty = Number(l.quantity) || 0;
                      const unit = l.unit ? ` ${l.unit}` : "";
                      const total = qty * (Number(l.unit_price_incl_vat) || 0);
                      return (
                        <li key={l.id} className="flex justify-between gap-3">
                          <span className="text-muted-foreground">{qty}{unit} × {l.description}</span>
                          <span className="tabular-nums">€{money(total)}</span>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-2 text-[11px] text-muted-foreground">Bedragen incl. btw.</p>
                </div>
              )}

              {!isSelfArranged && !forParticipant && vatRate !== undefined && lineTotal != null && (
                <p className="text-xs text-muted-foreground">
                  Excl. btw €{money(lineTotal / (1 + vatRate / 100))} · btw ({vatRate}%) €{money(lineTotal - lineTotal / (1 + vatRate / 100))}
                </p>
              )}

              {routeUrl && (
                <a
                  href={routeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="group-hover:underline">{item.location_address}</span>
                  <span className="ml-auto shrink-0 text-xs font-medium text-primary">Route</span>
                </a>
              )}

              {!forParticipant && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor={`pers-${item.id}`} className="flex items-center gap-1.5 text-sm">
                    <Users className="h-3.5 w-3.5" aria-hidden="true" />
                    Aantal deelnemers
                  </Label>
                  {canEdit ? (
                    <>
                      <Input
                        id={`pers-${item.id}`}
                        type="number"
                        min={1}
                        placeholder={numberOfPeople ? `${numberOfPeople} (groepstotaal)` : "Aantal"}
                        value={item.override_people ?? ""}
                        onChange={(e) => onUpdate({ override_people: e.target.value ? parseInt(e.target.value) : null })}
                        className="mt-1.5"
                      />
                      {item.override_people && numberOfPeople && item.override_people !== numberOfPeople && (
                        <p className="mt-1 text-xs text-muted-foreground">Standaard: {numberOfPeople} personen</p>
                      )}
                    </>
                  ) : (
                    <p className="mt-1.5 text-sm">{item.override_people ?? numberOfPeople ?? "-"}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor={`opm-${item.id}`} className="text-sm">Opmerking</Label>
                  {canEdit ? (
                    <Textarea
                      id={`opm-${item.id}`}
                      value={item.customer_notes || ""}
                      onChange={(e) => onUpdate({ customer_notes: e.target.value })}
                      placeholder="Bijzonderheden voor dit onderdeel"
                      className="mt-1.5"
                      rows={2}
                    />
                  ) : (
                    <p className="mt-1.5 text-sm text-muted-foreground">{item.customer_notes || "Geen opmerking"}</p>
                  )}
                </div>
              </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      {!isSelfArranged && !forParticipant && (
        <TimeSheet
          item={item}
          allItems={allItems}
          open={timeOpen}
          onOpenChange={setTimeOpen}
          onChangePreferred={(time) => onUpdate({ preferred_time: time })}
          onCounterProposal={onCounterProposal}
        />
      )}
    </article>
  );
};

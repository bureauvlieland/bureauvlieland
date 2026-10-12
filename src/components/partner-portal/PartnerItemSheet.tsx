import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FactList, FormField, Notice, OptionCard, OptionGroup, Pill, ResponsiveSheetContent } from "@/components/system";
import { ArrowLeftRight, Building2, Calendar, CheckCircle, Clock, Euro, FileText, Loader2, Mail, MessageSquare, Phone, Play, Timer, Users, XCircle } from "lucide-react";
import { CopyReferenceButton } from "./CopyReferenceButton";
import { BureauCentralBadge } from "./BureauCentralBadge";
import { PartnerLocationMap } from "./PartnerLocationMap";
import { PartnerCustomQuoteEditor } from "./PartnerCustomQuoteEditor";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import type { PartnerItem } from "@/types/partner";
import { GuestDetailsDisplay } from "@/components/shared/GuestDetailsDisplay";
import { ProjectDocumentsPanel } from "@/components/shared/ProjectDocumentsPanel";
import {
  generateTimeSlots,
  getBlockedTimeSlotsFromPartnerItems,
  isTimeSlotBlocked,
  minutesToTime,
  formatDurationWindow,
  formatTimeHHmm,
  type PartnerConflictItem,
} from "@/lib/timeUtils";
import { hasOpenAdminPriceChange as detectOpenAdminPriceChange, getNumberOfDays, isPerPersonItem, isPerDayItem, getPriceBreakdownLabel } from "@/lib/portalPricing";
import { itemDisplayStatusConfig, deriveItemDisplayStatusLoose } from "@/lib/itemStatus";
import { canPartnerInvoiceItem, isAwaitingInvoicingRelease } from "@/lib/partnerInvoicing";
import { formatEuro } from "@/lib/formatEuro";
import { usePartnerContext } from "@/lib/partnerPortalContext";

/**
 * De sheet van één onderdeel (partnerportaal fase 2, regel 3: één reactie
 * per onderdeel). Van boven naar beneden: wat er nu speelt (één `Notice`),
 * de feiten één keer, de klant, de reactie als drie `OptionCard`s met de
 * bijbehorende velden, en onderaan één primaire knop in een vaste voet.
 * Op een telefoon komt de sheet van onderen.
 */
interface PartnerItemSheetProps {
  item: PartnerItem | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate: (status: string, note?: string, quotedPrice?: number, quotedNotes?: string, proposedTime?: string, proposedDate?: string) => Promise<boolean>;
  onRegisterInvoice: () => void;
  commissionPercentage: number;
}

type ResponseType = "confirmed" | "alternative" | "unavailable";

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const CATEGORY_LABEL: Record<string, string> = {
  activity: "Activiteit",
  catering: "Catering",
  accommodation: "Logies",
  transport: "Vervoer",
  workshop: "Workshop",
};

export const PartnerItemSheet = ({ item, isOpen, onClose, onStatusUpdate, onRegisterInvoice }: PartnerItemSheetProps) => {
  const { demo } = usePartnerContext();
  const isDemo = Boolean(demo);
  const [responseType, setResponseType] = useState<ResponseType>("confirmed");
  const [quotedPrice, setQuotedPrice] = useState("");
  const [quotedNotes, setQuotedNotes] = useState("");
  const [proposedTime, setProposedTime] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [priceError, setPriceError] = useState("");
  const [noteError, setNoteError] = useState("");
  const [timeError, setTimeError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Eigen prijs voorstellen op een prijswijziging van Bureau Vlieland
  const [showPriceCounterForm, setShowPriceCounterForm] = useState(false);
  const [priceCounterValue, setPriceCounterValue] = useState("");
  const [priceCounterNotes, setPriceCounterNotes] = useState("");
  const [priceCounterError, setPriceCounterError] = useState("");

  // Bezette tijden op dezelfde dag (ook van andere aanbieders)
  const blockedTimeSlots = useMemo(() => {
    if (!item || !item.sibling_items) return [];
    const sameDayItems: PartnerConflictItem[] = item.sibling_items
      .filter((s) => s.day_index === item.day_index && s.id !== item.id)
      .map((s) => ({
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

  const availableTimeSlots = useMemo(() => {
    const filtered = generateTimeSlots().filter((time) => !isTimeSlotBlocked(time, item?.duration || null, blockedTimeSlots));
    if (item?.preferred_time && !filtered.includes(item.preferred_time)) {
      filtered.push(item.preferred_time);
      filtered.sort();
    }
    return filtered;
  }, [blockedTimeSlots, item?.duration, item?.preferred_time]);

  const request = item?.program_requests;
  const effectivePeopleForItem = item ? (item.override_people ?? request!.number_of_people) : 0;
  const numberOfDaysForItem = request ? getNumberOfDays(request.selected_dates) : 1;
  const adminTotal =
    item && item.admin_price_override != null
      ? item.admin_price_override * (isPerPersonItem(item) ? effectivePeopleForItem : 1) * (isPerDayItem(item) ? numberOfDaysForItem : 1)
      : null;

  // Voorinvullen zodra de sheet opengaat: bij een eigen voorstel de eigen
  // waarden, bij een tegenvoorstel van de klant zijn tijd, anders de gewenste
  // tijd en de prijs van Bureau Vlieland.
  useEffect(() => {
    if (!isOpen || !item) return;
    setPriceError("");
    setNoteError("");
    setTimeError("");
    setShowPriceCounterForm(false);
    setPriceCounterError("");
    if (item.status === "alternative") {
      setResponseType("alternative");
      setQuotedPrice(item.quoted_price ? item.quoted_price.toString().replace(".", ",") : "");
      setQuotedNotes(item.quoted_notes ?? "");
      setProposedTime(item.proposed_time ?? "");
      setStatusNote(item.status_note ?? "");
    } else if (item.status === "counter_proposed") {
      setResponseType("confirmed");
      setQuotedPrice(item.quoted_price ? item.quoted_price.toString().replace(".", ",") : "");
      setQuotedNotes(item.quoted_notes ?? "");
      setProposedTime(item.customer_counter_time ?? "");
      setStatusNote("");
    } else {
      setResponseType("confirmed");
      setQuotedPrice(adminTotal != null ? adminTotal.toFixed(2).replace(".", ",") : "");
      setQuotedNotes("");
      setProposedTime(item.preferred_time ?? "");
      setStatusNote("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, item?.id]);

  if (!item || !request) return null;

  const dates = request.selected_dates || [];
  const activityDate = dates[item.day_index];
  const displayStatus = deriveItemDisplayStatusLoose(item, { programPeople: request.number_of_people ?? 0, numberOfDays: dates.length || 1, audience: "partner" });
  const statusInfo = itemDisplayStatusConfig[displayStatus];

  const hasCustomerAccepted = !!item.customer_accepted_at || !!item.customer_approved_at;
  const canInvoice = canPartnerInvoiceItem(item, request);
  const awaitingTerms = isAwaitingInvoicingRelease(item, request);
  const isCustomQuote = !!item.is_custom_quote;
  const canRespond = !isCustomQuote && (item.status === "pending" || item.status === "alternative" || item.status === "counter_proposed");
  const canMarkExecuted = (item.status === "accepted" || (item.status === "confirmed" && hasCustomerAccepted)) && !item.invoiced_number;

  const hasOpenAdminPriceChange = !!item.quoted_price && detectOpenAdminPriceChange(item as never, effectivePeopleForItem, numberOfDaysForItem);
  const canAcknowledgePriceChange = hasOpenAdminPriceChange && !item.invoiced_number && item.status !== "cancelled" && item.status !== "executed";

  const isBureauCentral = request.invoicing_mode === "bureau_central";
  // De tijd zoals de klant hem nu ziet, met het soort tijd
  const counterTime = item.status === "counter_proposed" ? item.customer_counter_time : null;
  const timeKind = counterTime
    ? { time: formatTimeHHmm(counterTime), kind: "de klant wil liever" }
    : item.confirmed_time
      ? { time: formatTimeHHmm(item.confirmed_time), kind: "bevestigd" }
      : item.proposed_time
        ? { time: formatTimeHHmm(item.proposed_time), kind: "uw voorstel" }
        : item.preferred_time
          ? { time: formatTimeHHmm(item.preferred_time), kind: "gewenst door de klant" }
          : { time: null, kind: "flexibel" };
  const expectedCommission = item.quoted_price ? (item.quoted_price / 1.21) * ((item.commission_percentage ?? 10) / 100) : null;

  const parsePrice = (value: string) => {
    const parsed = parseFloat(value.replace(",", ".").trim());
    return !value.trim() || isNaN(parsed) || parsed <= 0 ? null : parsed;
  };

  const handleAcceptNewAdminPrice = async () => {
    if (adminTotal == null) return;
    setIsSubmitting(true);
    const ok = await onStatusUpdate("acknowledge_price_change", undefined, adminTotal, "Akkoord met prijswijziging Bureau Vlieland");
    setIsSubmitting(false);
    if (ok) onClose();
  };

  const handleSubmitPriceCounter = async () => {
    const parsed = parsePrice(priceCounterValue);
    if (parsed == null) {
      setPriceCounterError("Vul een prijs in die groter is dan nul.");
      return;
    }
    setIsSubmitting(true);
    const ok = await onStatusUpdate("acknowledge_price_change", undefined, parsed, priceCounterNotes || undefined);
    setIsSubmitting(false);
    if (ok) onClose();
  };

  const handleSubmitResponse = async () => {
    let hasError = false;
    if (responseType === "alternative") {
      if (!proposedTime) {
        setTimeError("Kies een tijd.");
        hasError = true;
      } else if (isTimeSlotBlocked(proposedTime, item.duration || null, blockedTimeSlots)) {
        setTimeError("Op deze tijd staat al een ander onderdeel.");
        hasError = true;
      }
      if (!statusNote.trim()) {
        setNoteError("Leg de klant kort uit wat u voorstelt.");
        hasError = true;
      }
    }
    if (responseType === "confirmed" && parsePrice(quotedPrice) == null) {
      setPriceError("Vul de totaalprijs in.");
      hasError = true;
    }
    if (hasError) return;

    setIsSubmitting(true);
    const validPrice = parsePrice(quotedPrice) ?? undefined;
    // Bevestigen gebeurt op de tijd die de klant vroeg (of liever wil); een alternatief op de gekozen tijd.
    const effectiveProposedTime = responseType === "confirmed" ? counterTime || item.preferred_time || undefined : proposedTime || undefined;
    const success = await onStatusUpdate(
      responseType,
      responseType === "confirmed" ? undefined : statusNote || undefined,
      validPrice,
      quotedNotes || undefined,
      effectiveProposedTime,
      undefined,
    );
    setIsSubmitting(false);
    if (success) onClose();
  };

  const handleMarkExecuted = async () => {
    setIsSubmitting(true);
    const success = await onStatusUpdate("executed");
    setIsSubmitting(false);
    if (success) onClose();
  };

  const facts = [
    { label: "Datum", value: activityDate ? format(parseISO(activityDate), "EEEE d MMMM yyyy", { locale: nl }) : `Dag ${item.day_index + 1}`, icon: Calendar },
    { label: "Tijd", value: timeKind.time ? `${formatDurationWindow(timeKind.time, item.duration) ?? timeKind.time} (${timeKind.kind})` : "Flexibel", icon: Clock },
    ...(item.duration ? [{ label: "Duur", value: item.duration, icon: Timer }] : []),
    {
      label: "Personen",
      value:
        item.override_people != null && item.override_people !== request.number_of_people
          ? `${item.override_people} (van ${request.number_of_people} in de hele groep)`
          : `${request.number_of_people}`,
      icon: Users,
    },
    ...(item.quoted_price && item.status !== "alternative"
      ? [
          {
            label: "Uw prijs",
            value: `${formatEuro(item.quoted_price)} incl. btw${expectedCommission && !item.invoiced_number ? ` · commissie ${formatEuro(expectedCommission)}` : ""}`,
            icon: Euro,
          },
        ]
      : adminTotal != null
        ? [{ label: "Verwachte prijs", value: `${formatEuro(adminTotal)} · ${getPriceBreakdownLabel(item, request.number_of_people, numberOfDaysForItem)}`, icon: Euro }]
        : item.price_indication
          ? [{ label: "Indicatie uit de configurator", value: item.price_indication, icon: Euro }]
          : []),
  ];

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ResponsiveSheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="space-y-1 border-b px-6 py-4 text-left">
          <SheetTitle className="font-display text-display-md font-medium leading-tight">{item.block_name}</SheetTitle>
          <div className="flex flex-wrap items-center gap-1.5">
            <Pill tone={statusInfo.partnerTone} size="md" title={statusInfo.partnerTooltip}>
              {statusInfo.partnerLabel}
            </Pill>
            {item.version > 1 && <Pill tone="neutral">Gewijzigd (v{item.version})</Pill>}
            {isCustomQuote && <Pill tone="brand">Maatwerk</Pill>}
          </div>
          <SheetDescription className="flex flex-wrap items-center gap-x-2 text-sm">
            <span>{CATEGORY_LABEL[item.block_category] ?? item.block_category}</span>
            {request.reference_number && (
              <span className="inline-flex items-center gap-1 font-mono text-xs">
                {request.reference_number}
                <CopyReferenceButton reference={request.reference_number} />
              </span>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
          {/* Wat er nu speelt */}
          {item.status === "cancelled" && (
            <Notice tone="danger" title="Deze aanvraag is geannuleerd">
              <p>{request.cancellation_reason ? `Reden: ${request.cancellation_reason}` : "Het programma is geannuleerd door de klant."}</p>
            </Notice>
          )}
          {isBureauCentral && <BureauCentralBadge variant="full" />}
          {item.status === "counter_proposed" && (
            <Notice
              tone="warning"
              title={`De klant wil liever ${formatTimeHHmm(item.customer_counter_time) ?? item.customer_counter_time ?? "een andere tijd"}`}
              icon={<ArrowLeftRight className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
            >
              {item.proposed_time && <p>Uw voorstel was {formatTimeHHmm(item.proposed_time)}.</p>}
              {item.customer_counter_note && <p>"{item.customer_counter_note}"</p>}
              <p>Ga akkoord met deze tijd of stel een andere tijd voor.</p>
            </Notice>
          )}
          {canAcknowledgePriceChange && adminTotal != null && (
            <Notice tone="warning" title={`Bureau Vlieland stelt een nieuwe prijs voor: ${formatEuro(adminTotal)}`}>
              <p>
                {getPriceBreakdownLabel(item, request.number_of_people, numberOfDaysForItem)}
                {item.admin_price_notes ? `. ${item.admin_price_notes}` : ""}
              </p>
              {!showPriceCounterForm ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" onClick={handleAcceptNewAdminPrice} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle className="mr-1.5 h-4 w-4" aria-hidden="true" />}
                    Akkoord met {formatEuro(adminTotal)}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={() => {
                      setShowPriceCounterForm(true);
                      setPriceCounterValue(adminTotal.toFixed(2).replace(".", ","));
                    }}
                  >
                    Eigen prijs voorstellen
                  </Button>
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  <FormField label="Uw totaalprijs (incl. btw)" htmlFor="priceCounterValue" required error={priceCounterError} help={`Totaalprijs voor ${effectivePeopleForItem} personen.`} leading={<Euro />}>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={priceCounterValue}
                      onChange={(e) => {
                        setPriceCounterValue(e.target.value);
                        setPriceCounterError("");
                      }}
                    />
                  </FormField>
                  <FormField label="Toelichting" htmlFor="priceCounterNotes" help="Bureau Vlieland ontvangt uw voorstel en koppelt terug bij de klant.">
                    <Textarea placeholder="Bijvoorbeeld: inclusief extra materiaal" value={priceCounterNotes} onChange={(e) => setPriceCounterNotes(e.target.value)} rows={2} />
                  </FormField>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={handleSubmitPriceCounter} disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                      Voorstel versturen
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowPriceCounterForm(false)} disabled={isSubmitting}>
                      Annuleren
                    </Button>
                  </div>
                </div>
              )}
            </Notice>
          )}
          {item.status === "alternative" && (
            <Notice tone="info" title="Uw voorstel wacht op de klant">
              <p>
                {item.proposed_time && <>Tijd {formatTimeHHmm(item.proposed_time)}</>}
                {item.proposed_time && item.quoted_price && <>, </>}
                {item.quoted_price && <>prijs {formatEuro(item.quoted_price)}</>}
                {item.status_note && <>. {item.status_note}</>}
              </p>
            </Notice>
          )}
          {item.status === "unavailable" && item.status_note && (
            <Notice tone="danger" title="U heeft dit onderdeel afgewezen">
              <p>{item.status_note}</p>
            </Notice>
          )}
          {awaitingTerms && (
            <Notice tone="info" title="Wacht op de klant">
              <p>De klant moet eerst de voorwaarden tekenen, of Bureau Vlieland geeft het project vrij. Daarna kunt u factureren.</p>
            </Notice>
          )}
          {item.partner_instructions && (
            <Notice tone="info" title="Instructie van Bureau Vlieland">
              <p className="whitespace-pre-wrap">{item.partner_instructions}</p>
            </Notice>
          )}

          {/* De feiten, één keer */}
          <FactList items={facts} />

          {/* De klant */}
          <section className="space-y-2" aria-labelledby="sheet-klant">
            <h3 id="sheet-klant" className="text-sm font-medium">
              Klant
            </h3>
            <div className="space-y-1 text-sm">
              <p className="flex items-center gap-2 font-medium">
                <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                {request.customer_company || request.customer_name}
              </p>
              {!isBureauCentral && (
                <>
                  <a href={`mailto:${request.customer_email}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                    <Mail className="h-4 w-4" aria-hidden="true" />
                    {request.customer_email}
                  </a>
                  <a href={`tel:${request.customer_phone}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                    <Phone className="h-4 w-4" aria-hidden="true" />
                    {request.customer_phone}
                  </a>
                </>
              )}
            </div>
            {(request.guest_names || (item.block_category === "catering" && request.dietary_notes)) && (
              <div className="rounded-lg border p-3">
                <GuestDetailsDisplay
                  guestNames={request.guest_names ?? null}
                  dietaryNotes={request.dietary_notes ?? null}
                  roomAssignment={null}
                  showDietary={item.block_category === "catering"}
                  showRoomAssignment={false}
                  updatedAt={request.guest_details_updated_at ?? null}
                />
              </div>
            )}
            {!isDemo && (
              <div className="rounded-lg border p-3">
                <ProjectDocumentsPanel programRequestId={request.id} viewer="partner" canUpload={false} compact title="Documenten van Bureau Vlieland en de klant" emptyHint="Geen documenten gedeeld." />
              </div>
            )}
          </section>

          {/* Omschrijving en plek, ingeklapt */}
          {(item.block_short_description || item.block_description || item.customer_notes || item.admin_price_notes || item.location_address || item.location_lat !== null) && (
            <details className="group rounded-lg border">
              <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-primary">Over dit onderdeel</summary>
              <div className="space-y-3 border-t px-3 py-3 text-sm">
                {item.block_short_description && <p className="font-medium">{item.block_short_description}</p>}
                {item.block_description && <p className="whitespace-pre-line text-muted-foreground">{item.block_description}</p>}
                {(item.block_short_description || item.block_description) && <p className="text-xs italic text-muted-foreground">Dit is dezelfde tekst die de klant in het portaal ziet.</p>}
                {item.customer_notes && (
                  <p>
                    <span className="font-medium">Wens van de klant: </span>
                    {item.customer_notes}
                  </p>
                )}
                {item.admin_price_notes && (
                  <p>
                    <span className="font-medium">Toelichting van Bureau Vlieland: </span>
                    {item.admin_price_notes}
                  </p>
                )}
                {(item.location_address || (item.location_lat !== null && item.location_lng !== null)) && (
                  <PartnerLocationMap lat={item.location_lat} lng={item.location_lng} label={item.block_name} address={item.location_address} isVisible={isOpen} />
                )}
              </div>
            </details>
          )}

          {/* Factuur */}
          {item.invoiced_number &&
            (() => {
              const vatRate = Number(item.vat_rate ?? 0);
              const exclVat = Number(item.invoiced_amount ?? 0);
              const vatAmount = Math.round(exclVat * (vatRate / 100) * 100) / 100;
              const inclVat = Math.round((exclVat + vatAmount) * 100) / 100;
              return (
                <FactList
                  items={[
                    { label: "Factuurnummer", value: item.invoiced_number, icon: FileText },
                    { label: "Bedrag", value: `${formatEuro(inclVat)} incl. btw (${formatEuro(exclVat)} excl., btw ${vatRate}% ${formatEuro(vatAmount)})` },
                    ...(item.invoiced_date ? [{ label: "Datum", value: format(parseISO(item.invoiced_date), "d MMMM yyyy", { locale: nl }) }] : []),
                    ...(item.commission_amount && item.commission_amount > 0
                      ? [{ label: "Commissie", value: `${formatEuro(item.commission_amount)} (${item.commission_percentage}% over het bedrag excl. btw)` }]
                      : []),
                  ]}
                />
              );
            })()}

          {/* Maatwerk: de offerte zelf opstellen */}
          {isCustomQuote && (item.status === "pending" || item.status === "alternative") && (
            <section className="space-y-2">
              <h3 className="text-sm font-medium">Maatwerkofferte opstellen</h3>
              <PartnerCustomQuoteEditor
                itemId={item.id}
                partnerId={item.provider_id}
                briefing={item.custom_briefing || item.customer_notes}
                onSubmitted={async (total, notes) => onStatusUpdate("confirmed", undefined, total, notes || undefined)}
              />
            </section>
          )}

          {/* De reactie: drie keuzes, één formulier */}
          {canRespond && (
            <section className="space-y-4" aria-labelledby="sheet-reactie">
              <h3 id="sheet-reactie" className="text-sm font-medium">
                Uw reactie
              </h3>
              <OptionGroup name="reactie" columns={1}>
                <OptionCard
                  selected={responseType === "confirmed"}
                  onSelect={() => {
                    setResponseType("confirmed");
                    setPriceError("");
                    setNoteError("");
                  }}
                  icon={<CheckCircle />}
                  title={counterTime ? `Akkoord met ${formatTimeHHmm(counterTime)}` : "Bevestigen"}
                  description={counterTime ? "U bevestigt het onderdeel op de tijd die de klant liever wil." : "Het onderdeel kan zoals gevraagd."}
                />
                <OptionCard
                  selected={responseType === "alternative"}
                  onSelect={() => {
                    setResponseType("alternative");
                    setPriceError("");
                  }}
                  icon={<MessageSquare />}
                  title="Andere tijd of prijs voorstellen"
                  description="U stelt een andere tijd voor, met een toelichting; de klant beslist."
                />
                <OptionCard
                  selected={responseType === "unavailable"}
                  onSelect={() => {
                    setResponseType("unavailable");
                    setPriceError("");
                    setNoteError("");
                  }}
                  icon={<XCircle />}
                  title="Niet beschikbaar"
                  description="Het onderdeel kan niet op deze dag."
                />
              </OptionGroup>

              {responseType === "confirmed" && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    U bevestigt op {counterTime ? formatTimeHHmm(counterTime) : item.preferred_time ? formatTimeHHmm(item.preferred_time) : "een nog af te stemmen tijd"}.
                  </p>
                  <FormField label="Totaalprijs (incl. btw)" htmlFor="quotedPrice" required error={priceError} help={`Prijs voor ${effectivePeopleForItem} personen.`} leading={<Euro />}>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={quotedPrice}
                      onChange={(e) => {
                        setQuotedPrice(e.target.value);
                        setPriceError("");
                      }}
                    />
                  </FormField>
                  <FormField label="Toelichting" htmlFor="quotedNotes">
                    <Textarea placeholder="Bijvoorbeeld: inclusief materialen" value={quotedNotes} onChange={(e) => setQuotedNotes(e.target.value)} rows={2} />
                  </FormField>
                </div>
              )}

              {responseType === "alternative" && (
                <div className="space-y-3">
                  {blockedTimeSlots.length > 0 && (
                    <Notice tone="info" title={`Bezette tijden op dag ${item.day_index + 1}`}>
                      <ul className="list-disc pl-5">
                        {blockedTimeSlots.map((slot) => (
                          <li key={slot.itemId}>
                            {slot.startTime} tot {minutesToTime(slot.endMinutes - 30)}: {slot.itemName}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-1 text-xs">Tussen twee onderdelen zit een half uur.</p>
                    </Notice>
                  )}
                  <FormField label="Voorgestelde tijd" htmlFor="proposedTimeAlt" required error={timeError}>
                    <select
                      value={proposedTime}
                      onChange={(e) => {
                        setProposedTime(e.target.value);
                        setTimeError("");
                      }}
                      className={selectClass}
                    >
                      <option value="">Kies een tijd</option>
                      {availableTimeSlots.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Andere prijs (incl. btw)" htmlFor="quotedPriceAlt" help="Alleen als de prijs afwijkt." leading={<Euro />}>
                    <Input type="text" inputMode="decimal" placeholder="0,00" value={quotedPrice} onChange={(e) => setQuotedPrice(e.target.value)} />
                  </FormField>
                  <FormField label="Toelichting voor de klant" htmlFor="statusNote" required error={noteError}>
                    <Textarea
                      placeholder="Bijvoorbeeld: om 10:00 zit de vorige groep er nog; 14:00 past beter."
                      value={statusNote}
                      onChange={(e) => {
                        setStatusNote(e.target.value);
                        setNoteError("");
                      }}
                      rows={3}
                    />
                  </FormField>
                </div>
              )}

              {responseType === "unavailable" && (
                <FormField label="Reden" htmlFor="unavailableNote" help="De klant en Bureau Vlieland zien deze reden.">
                  <Textarea placeholder="Bijvoorbeeld: volgeboekt op deze datum" value={statusNote} onChange={(e) => setStatusNote(e.target.value)} rows={2} />
                </FormField>
              )}
            </section>
          )}
        </div>

        {/* Vaste voet: één primaire knop */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t bg-background px-6 py-3">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Sluiten
          </Button>
          {canRespond ? (
            <Button onClick={handleSubmitResponse} disabled={isSubmitting} variant={responseType === "unavailable" ? "destructive" : "default"}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {responseType === "confirmed" ? "Bevestigen" : responseType === "alternative" ? "Voorstel versturen" : "Niet beschikbaar melden"}
            </Button>
          ) : (
            <>
              {canMarkExecuted && (
                <Button variant={canInvoice ? "outline" : "default"} onClick={handleMarkExecuted} disabled={isSubmitting || hasOpenAdminPriceChange} title={hasOpenAdminPriceChange ? "Reageer eerst op de nieuwe prijs van Bureau Vlieland." : undefined}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Play className="mr-2 h-4 w-4" aria-hidden="true" />}
                  Markeer als uitgevoerd
                </Button>
              )}
              {canInvoice && (
                <Button onClick={onRegisterInvoice}>
                  <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
                  Factuur registreren
                </Button>
              )}
            </>
          )}
        </div>
      </ResponsiveSheetContent>
    </Sheet>
  );
};

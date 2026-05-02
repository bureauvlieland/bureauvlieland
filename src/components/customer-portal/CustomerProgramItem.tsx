import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ItemStatusBadge } from "./ItemStatusBadge";
import { CounterProposalDialog } from "./CounterProposalDialog";
import { Badge } from "@/components/ui/badge";
import { Clock, ChevronDown, ChevronUp, Calendar, Trash2, MessageSquare, Edit2, Timer, Sparkles, Check, Loader2, ArrowLeftRight, MapPin, ExternalLink, CalendarPlus, Users, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadSingleEvent } from "@/lib/calendarExport";
import { isQuoteItemAwaitingCustomerApproval } from "@/lib/customerQuoteApproval";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { type ProgramRequestItem, type ItemStatus, itemStatusConfig } from "@/types/programRequest";
import { timeSlots } from "@/types/buildingBlock";
import { getBlockImage } from "@/lib/buildingBlockUtils";
import { getDisplayLineTotal, getDisplayUnitPrice, isPerPersonItem } from "@/lib/portalPricing";

interface CustomerProgramItemProps {
  item: ProgramRequestItem;
  selectedDates: Date[];
  onUpdate: (updates: Partial<ProgramRequestItem>) => void;
  onRemove: () => void;
  onAccept?: () => Promise<boolean>;
  onCounterProposal?: (counterTime: string, counterNote: string) => Promise<boolean>;
  onApproveQuoteItem?: () => Promise<boolean>;
  allItems?: ProgramRequestItem[];
  hasChanges?: boolean;
  isAccepting?: boolean;
  invoicingMode?: string;
  vatRate?: number;
  isPreApproval?: boolean;
  isQuoteMode?: boolean;
  quoteStatus?: string | null;
  readOnly?: boolean;
  hideDay?: boolean;
  numberOfPeople?: number;
}

export const CustomerProgramItem = ({
  item,
  selectedDates,
  onUpdate,
  onRemove,
  onAccept,
  onCounterProposal,
  onApproveQuoteItem,
  allItems = [],
  hasChanges = false,
  isAccepting = false,
  invoicingMode,
  vatRate,
  isPreApproval = false,
  isQuoteMode = false,
  quoteStatus,
  readOnly = false,
  hideDay = false,
  numberOfPeople,
}: CustomerProgramItemProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [localAccepting, setLocalAccepting] = useState(false);
  const [localApproving, setLocalApproving] = useState(false);
  const [showCounterDialog, setShowCounterDialog] = useState(false);
  
  const statusConfig = itemStatusConfig[item.status as ItemStatus];
  const currentDate = selectedDates[item.day_index];
  const isSelfArranged = item.block_type === "self_arranged";
  // Bureau Vlieland heeft de prijs aangepast nadat de klant al goedkeurde —
  // ook al heeft de DB-trigger customer_approved_at niet altijd gereset, we behandelen
  // dit als een open situatie waarop de klant opnieuw moet bevestigen.
  const customerApprovedTs = item.customer_approved_at ? new Date(item.customer_approved_at).getTime() : 0;
  const adminPriceUpdatedTs = item.admin_price_override_updated_at ? new Date(item.admin_price_override_updated_at).getTime() : 0;
  const priceChangedSinceApproval = adminPriceUpdatedTs > 0 && customerApprovedTs > 0 && adminPriceUpdatedTs > customerApprovedTs;
  const priceChangeNeedsAttention = !isSelfArranged
    && (priceChangedSinceApproval || (adminPriceUpdatedTs > 0 && customerApprovedTs === 0 && !!item.quoted_at));

  // Een onderdeel vraagt om klantactie wanneer het zowel operationeel beschikbaar is
  // ALS er nog goedkeuring ontbreekt OF er een nieuwe admin-prijs ligt waar de klant
  // opnieuw akkoord op moet geven. In quote-mode laten we de strikte item_quote_status
  // check vallen omdat status=confirmed/alternative al voldoende signaleert dat de
  // partner heeft gereageerd of dat het item via de offerte is bevestigd.
  const needsCustomerAction = !isSelfArranged
    && (item.status === "confirmed" || item.status === "alternative")
    && (!item.customer_approved_at || priceChangeNeedsAttention)
    && !item.customer_accepted_at;

  // Check if item is newly added (pending status and created within last 24 hours)
  const isNewlyAdded = item.status === "pending" && 
    new Date(item.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000;

  // Get thumbnail image
  const thumbnailSrc = getBlockImage({ image_url: item.image_url, image_asset: item.image_asset } as any);

  return (
    <div className={cn(
      "transition-all rounded-lg border bg-card p-4",
      hasChanges && "ring-2 ring-primary/50",
      item.status === "cancelled" && "opacity-60",
      needsCustomerAction && "border-amber-300 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-950/10"
    )}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          {/* Header row */}
          <div className="flex items-start gap-3">
            {/* Thumbnail */}
            {thumbnailSrc && thumbnailSrc !== "/placeholder.svg" && (
              <img
                src={thumbnailSrc}
                alt={item.block_name}
                className="w-12 h-12 md:w-16 md:h-16 rounded-md object-cover shrink-0"
              />
            )}
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium">{item.block_name}</h4>
                {isNewlyAdded && (
                  <Badge variant="secondary" className="gap-1 bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400 border-0">
                    <Sparkles className="h-3 w-3" />
                    Nieuw
                  </Badge>
                )}
                {isSelfArranged ? (
                  <Badge variant="outline" className="gap-1.5 font-medium border-0 bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Zelf te regelen
                  </Badge>
                ) : isQuoteMode && item.customer_approved_at ? (
                  <Badge variant="outline" className="gap-1.5 font-medium border-0 bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400">
                    <Check className="h-3.5 w-3.5" />
                    Goedgekeurd
                  </Badge>
                ) : (
                  <ItemStatusBadge status={item.status as ItemStatus} overrideLabel={
                    needsCustomerAction && item.status === "confirmed" ? "Beschikbaar" :
                    needsCustomerAction && item.status === "alternative" ? "Alternatief voorstel" :
                    readOnly && item.status === "pending" ? "In behandeling" : 
                    isPreApproval && item.status === "pending" && (!quoteStatus || ["concept", "in_afstemming"].includes(quoteStatus)) ? "In voorbereiding" : 
                    undefined
                  } />
                )}
                {priceChangeNeedsAttention && (
                  <Badge variant="outline" className="gap-1.5 font-medium border-0 bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Prijs gewijzigd
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {isSelfArranged ? "Zelf te boeken en betalen" : item.provider_name}
              </p>
              {(item as any).block_short_description && (
                <p className="text-sm text-muted-foreground/80 mt-0.5 line-clamp-2">
                  {(item as any).block_short_description}
                </p>
              )}
            </div>
            
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="shrink-0">
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
          
          {/* Meta row */}
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
            {!hideDay && currentDate && selectedDates.length > 1 && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Dag {item.day_index + 1} • {format(currentDate, "EEE d MMM", { locale: nl })}
              </span>
            )}
            {/* Time - only on mobile (desktop shows it in timeline column) */}
            <span className="flex items-center gap-1 font-semibold text-foreground md:hidden">
              <Clock className="h-3.5 w-3.5" />
              {item.confirmed_time 
                ? item.confirmed_time
                : item.proposed_time && (item.status === "confirmed" || item.status === "alternative")
                  ? `${item.proposed_time} (voorstel)`
                  : item.preferred_time 
                    ? (item.preferred_time === "flexibel" ? "Flexibel" : item.preferred_time)
                    : "Flexibel"}
            </span>
            {item.duration && (
              <span className="flex items-center gap-1">
                <Timer className="h-3.5 w-3.5" />
                {item.duration}
              </span>
            )}
            {(item.override_people || numberOfPeople) && (
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {item.override_people ?? numberOfPeople} pers.
              </span>
            )}
            {item.location_address && (
              <span className="flex items-center gap-1 truncate max-w-[200px]">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{item.location_address}</span>
              </span>
            )}
            {/* Show effective price (admin override wins on open changes), otherwise indication */}
            {!isSelfArranged && (() => {
              const effectivePeople = item.override_people ?? numberOfPeople ?? 1;
              const lineTotal = getDisplayLineTotal(item, effectivePeople);
              const unitPrice = getDisplayUnitPrice(item, effectivePeople);
              if (lineTotal == null) {
                return item.price_indication ? (
                  <span className="font-medium text-foreground">{item.price_indication}</span>
                ) : null;
              }
              const showPerPerson = isPerPersonItem(item) && unitPrice !== null && unitPrice !== lineTotal;
              return (
                <span className="font-semibold text-green-700 dark:text-green-500">
                  €{(showPerPerson ? unitPrice! : lineTotal).toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  {showPerPerson ? (
                    <span className="font-normal text-xs ml-1">p.p.</span>
                  ) : item.price_type === "total" ? (
                    <span className="font-normal text-xs ml-1">totaal</span>
                  ) : null}
                  {vatRate !== undefined && (
                    <span className="font-normal text-xs text-muted-foreground ml-1">({vatRate}% BTW)</span>
                  )}
                </span>
              );
            })()}
            {/* Show admin price notes if available */}
            {!isSelfArranged && item.admin_price_notes && (
              <span className="text-xs text-muted-foreground">
                {item.admin_price_notes}
              </span>
            )}
          </div>

          {/* Inline VAT breakdown */}
          {!isSelfArranged && vatRate !== undefined && (() => {
            const total = getDisplayLineTotal(item, item.override_people ?? numberOfPeople ?? 1);
            if (total == null) return null;
            const exclVat = total / (1 + vatRate / 100);
            return (
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span>Excl. BTW: €{exclVat.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span>BTW ({vatRate}%): €{(total - exclVat).toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            );
          })()}

          {/* External booking link for self-arranged items */}
          {isSelfArranged && item.external_url && (
            <div className="mt-2">
              <a
                href={item.external_url!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {item.external_url}
              </a>
            </div>
          )}

          {/* Banner: prijs is door Bureau Vlieland aangepast — klant moet opnieuw akkoord geven */}
          {priceChangeNeedsAttention && !readOnly && (
            <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                De prijs van dit onderdeel is door Bureau Vlieland aangepast. Bekijk de nieuwe prijs hieronder en geef opnieuw uw akkoord.
              </span>
            </div>
          )}

          {/* Action hint for items needing customer approval */}
          {needsCustomerAction && !readOnly && !priceChangeNeedsAttention && (
            <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-sm text-blue-700 dark:text-blue-300">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                De aanbieder is beschikbaar. Klik op <strong>'Akkoord'</strong> om deze activiteit definitief te boeken.
              </span>
            </div>
          )}

          {!isSelfArranged && item.quoted_price && item.quoted_notes && (
            <p className="mt-1 text-xs text-muted-foreground italic">
              {item.quoted_notes}
            </p>
          )}
          
          {/* Status note from provider */}
          {item.status_note && (
            <div className={cn(
              "mt-3 p-3 rounded-lg text-sm",
              statusConfig.bgColor
            )}>
              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Reactie aanbieder:</p>
                  <p className="mt-0.5">{item.status_note}</p>
                </div>
              </div>
            </div>
          )}

          {/* Counter proposal pending - waiting for partner response */}
          {item.status === "counter_proposed" && (
            <div className="mt-3 p-3 rounded-lg border bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900">
              <div className="flex items-start gap-2">
                <ArrowLeftRight className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-purple-800 dark:text-purple-300">
                    Uw tegenvoorstel: {item.customer_counter_time}
                  </p>
                  {item.customer_counter_note && (
                    <p className="text-sm text-purple-700/80 dark:text-purple-400/80 mt-1">
                      "{item.customer_counter_note}"
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground mt-2">
                    Wachten op reactie van aanbieder...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Show accepted badge if customer has accepted */}
          {item.customer_accepted_at && (
            <div className="mt-2 flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
              <Check className="h-4 w-4" />
              <span>U hebt akkoord gegeven op dit voorstel</span>
            </div>
          )}

          {/* Always-visible action row */}
          {item.status !== "cancelled" && item.status !== "counter_proposed" && !readOnly && (
            <div className="mt-3 flex flex-wrap gap-2 justify-end">
              {/* Per-item akkoord — voor zowel quote- als legacy-mode */}
              {needsCustomerAction && (isQuoteMode ? !!onApproveQuoteItem : !!onAccept) && (
                <Button
                  onClick={async () => {
                    if (isQuoteMode && onApproveQuoteItem) {
                      setLocalApproving(true);
                      await onApproveQuoteItem();
                      setLocalApproving(false);
                    } else if (onAccept) {
                      setLocalAccepting(true);
                      await onAccept();
                      setLocalAccepting(false);
                    }
                  }}
                  disabled={localApproving || localAccepting || isAccepting}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {(localApproving || localAccepting) ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-1.5" />
                  )}
                  {priceChangeNeedsAttention ? "Akkoord met nieuwe prijs" : "Akkoord"}
                </Button>
              )}

              {/* Andere tijd - for confirmed/alternative not yet accepted */}
              {!isQuoteMode && (item.status === "confirmed" || item.status === "alternative") && !item.customer_accepted_at && onCounterProposal && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCounterDialog(true)}
                  disabled={localAccepting || isAccepting}
                >
                  <ArrowLeftRight className="h-4 w-4 mr-1.5" />
                  Andere tijd
                </Button>
              )}

              {/* Tijd wijzigen - for pending, unavailable, or already accepted items */}
              {(item.status === "unavailable" || item.customer_accepted_at) && !isSelfArranged && (
                item.customer_accepted_at && onCounterProposal ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCounterDialog(true)}
                  >
                    <Edit2 className="h-4 w-4 mr-1.5" />
                    Tijd wijzigen
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsEditingTime(true);
                      setIsOpen(true);
                    }}
                  >
                    <Edit2 className="h-4 w-4 mr-1.5" />
                    Tijd wijzigen
                  </Button>
                )
              )}

              {/* Agenda export */}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
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
                    selectedDates.map((d) => d.toISOString().split("T")[0]),
                    undefined
                  );
                }}
              >
                <CalendarPlus className="h-4 w-4 mr-1.5" />
                Agenda
              </Button>

              {/* Verwijderen */}
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={onRemove}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Verwijderen
              </Button>
            </div>
          )}
          
          {/* Expanded content */}
          <CollapsibleContent className="mt-4 pt-4 border-t space-y-4">
            {/* Full description */}
            {(item as any).block_description && (
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {(item as any).block_description}
              </p>
            )}
            {/* Location with navigation link */}
            {item.location_address && (
              <a
                href={
                  item.location_lat && item.location_lng
                    ? `https://www.google.com/maps/dir/?api=1&destination=${item.location_lat},${item.location_lng}`
                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location_address)}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
              >
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="group-hover:underline">{item.location_address}</span>
                <span className="text-xs text-primary font-medium ml-auto shrink-0">Route →</span>
              </a>
            )}
            {/* Time editing */}
            <div className={cn("grid gap-4", selectedDates.length > 1 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
              <div>
                <Label className="text-sm">Gewenste tijd</Label>
                {readOnly ? (
                  <p className="text-sm mt-1.5">
                    {item.confirmed_time || item.proposed_time || item.preferred_time || "Flexibel"}
                  </p>
                ) : isEditingTime ? (
                  item.customer_accepted_at && onCounterProposal ? (
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-sm">
                        {item.confirmed_time || item.proposed_time || item.preferred_time || "Flexibel"}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7"
                        onClick={() => {
                          setShowCounterDialog(true);
                          setIsEditingTime(false);
                        }}
                      >
                        <ArrowLeftRight className="h-3 w-3 mr-1" />
                        Andere tijd voorstellen
                      </Button>
                    </div>
                  ) : (
                    <Select
                      value={item.preferred_time || "flexibel"}
                      onValueChange={(value) => {
                        onUpdate({ preferred_time: value === "flexibel" ? null : value });
                        setIsEditingTime(false);
                      }}
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((slot) => (
                          <SelectItem key={slot.value} value={slot.value}>
                            {slot.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )
                ) : (
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-sm">
                      {item.confirmed_time || item.proposed_time || item.preferred_time || "Flexibel"}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2"
                      onClick={() => setIsEditingTime(true)}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Aantal deelnemers */}
              <div>
                <Label className="text-sm flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  Aantal deelnemers
                </Label>
                {readOnly ? (
                  <p className="text-sm mt-1.5">
                    {item.override_people ?? numberOfPeople ?? "-"}
                    {item.override_people && numberOfPeople && item.override_people !== numberOfPeople && (
                      <span className="text-xs text-muted-foreground ml-1">(standaard: {numberOfPeople})</span>
                    )}
                  </p>
                ) : (
                  <div className="mt-1.5">
                    <Input
                      type="number"
                      min={1}
                      placeholder={numberOfPeople ? `${numberOfPeople} (groepstotaal)` : "Aantal"}
                      value={item.override_people ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        onUpdate({ override_people: val ? parseInt(val) : null });
                      }}
                      className="h-9"
                    />
                    {item.override_people && numberOfPeople && item.override_people !== numberOfPeople && (
                      <p className="text-xs text-muted-foreground mt-1">Standaard: {numberOfPeople} personen</p>
                    )}
                  </div>
                )}
              </div>
              
              {selectedDates.length > 1 && (
                <div>
                  <Label className="text-sm">Dag</Label>
                  {readOnly ? (
                    <p className="text-sm mt-1.5">
                      Dag {item.day_index + 1} • {format(selectedDates[item.day_index], "EEE d MMM", { locale: nl })}
                    </p>
                  ) : (
                    <Select
                      value={String(item.day_index)}
                      onValueChange={(value) => onUpdate({ day_index: parseInt(value) })}
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedDates.map((date, idx) => (
                          <SelectItem key={idx} value={String(idx)}>
                            Dag {idx + 1} • {format(date, "EEE d MMM", { locale: nl })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </div>
            
            {/* Notes */}
            <div>
              <Label className="text-sm">Opmerking</Label>
              {readOnly ? (
                item.customer_notes ? (
                  <p className="text-sm mt-1.5 text-muted-foreground">{item.customer_notes}</p>
                ) : (
                  <p className="text-sm mt-1.5 text-muted-foreground italic">Geen opmerking</p>
                )
              ) : (
                <Textarea
                  value={item.customer_notes || ""}
                  onChange={(e) => onUpdate({ customer_notes: e.target.value })}
                  placeholder="Bijzonderheden voor deze activiteit..."
                  className="mt-1.5"
                  rows={2}
                />
              )}
            </div>
          </CollapsibleContent>
      </Collapsible>

      {/* Counter Proposal Dialog */}
      {onCounterProposal && (
        <CounterProposalDialog
          item={item}
          isOpen={showCounterDialog}
          onClose={() => setShowCounterDialog(false)}
          onSubmit={onCounterProposal}
          allItems={allItems}
        />
      )}
    </div>
  );
};

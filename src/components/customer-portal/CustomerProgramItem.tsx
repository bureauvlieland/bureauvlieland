import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Clock, ChevronDown, ChevronUp, Calendar, Trash2, MessageSquare, Edit2, Timer, Sparkles, Check, Loader2, ArrowLeftRight, MapPin, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { type ProgramRequestItem, type ItemStatus, itemStatusConfig } from "@/types/programRequest";
import { timeSlots } from "@/types/buildingBlock";
import { getBlockImage } from "@/lib/buildingBlockUtils";
import type { BuildingBlock } from "@/types/buildingBlock";

interface CustomerProgramItemProps {
  item: ProgramRequestItem;
  selectedDates: Date[];
  onUpdate: (updates: Partial<ProgramRequestItem>) => void;
  onRemove: () => void;
  onAccept?: () => Promise<boolean>;
  onCounterProposal?: (counterTime: string, counterNote: string) => Promise<boolean>;
  allItems?: ProgramRequestItem[];
  isEditing?: boolean;
  hasChanges?: boolean;
  isAccepting?: boolean;
  invoicingMode?: string;
  vatRate?: number;
  isPreApproval?: boolean;
}

export const CustomerProgramItem = ({
  item,
  selectedDates,
  onUpdate,
  onRemove,
  onAccept,
  onCounterProposal,
  allItems = [],
  isEditing = false,
  hasChanges = false,
  isAccepting = false,
  invoicingMode,
  vatRate,
  isPreApproval = false,
}: CustomerProgramItemProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [localAccepting, setLocalAccepting] = useState(false);
  const [showCounterDialog, setShowCounterDialog] = useState(false);
  
  const statusConfig = itemStatusConfig[item.status as ItemStatus];
  const currentDate = selectedDates[item.day_index];
  const isSelfArranged = item.block_type === "self_arranged";
  
  // Check if item is newly added (pending status and created within last 24 hours)
  const isNewlyAdded = item.status === "pending" && 
    new Date(item.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000;
  
  // Get image URL using the utility function
  const imageUrl = getBlockImage({
    image_url: item.image_url,
    image_asset: item.image_asset,
  } as BuildingBlock);
  
  // Get available alternative times from status note (if any)
  const getAlternativeTimes = () => {
    if (item.status !== "alternative" || !item.status_note) return [];
    // Parse times from status note like "Beschikbaar om 10:00 of 16:00"
    const timeMatches = item.status_note.match(/\d{1,2}:\d{2}/g);
    return timeMatches || [];
  };
  
  const alternativeTimes = getAlternativeTimes();

  return (
    <Card className={cn(
      "transition-all",
      hasChanges && "ring-2 ring-primary/50",
      item.status === "cancelled" && "opacity-60"
    )}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardContent className="p-4">
          {/* Header row with image */}
          <div className="flex items-start gap-3">
            {/* Thumbnail */}
            <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-muted">
              <img
                src={imageUrl}
                alt={item.block_name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            
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
                ) : (
                  <ItemStatusBadge status={item.status as ItemStatus} overrideLabel={(isPreApproval || invoicingMode === "bureau_central") && item.status === "pending" ? "In voorbereiding" : undefined} />
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
          
          {/* Meta row - offset to align with content (after image) */}
          <div className="flex items-center gap-4 mt-2 ml-[76px] text-sm text-muted-foreground flex-wrap">
            {currentDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Dag {item.day_index + 1} • {format(currentDate, "d MMM", { locale: nl })}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {/* Display time priority: confirmed_time > proposed_time (as proposal) > preferred_time */}
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
            {/* Show quoted price if available (confirmed by partner), otherwise show price indication - hide for self_arranged */}
            {!isSelfArranged && (
              item.quoted_price ? (
                <span className="font-semibold text-green-700 dark:text-green-500">
                  €{item.quoted_price.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  {item.price_type === "per_person" ? (
                    <span className="font-normal text-xs ml-1">p.p.</span>
                  ) : item.price_type === "total" ? (
                    <span className="font-normal text-xs ml-1">totaal</span>
                  ) : null}
                  {vatRate !== undefined && (
                    <span className="font-normal text-xs text-muted-foreground ml-1">({vatRate}% BTW)</span>
                  )}
                </span>
              ) : item.price_indication && (
                <span className="font-medium text-foreground">
                  {item.price_indication}
                </span>
              )
            )}
            {/* Show admin price notes if available */}
            {!isSelfArranged && item.admin_price_notes && (
              <span className="text-xs text-muted-foreground">
                {item.admin_price_notes}
              </span>
            )}
          </div>

          {/* External booking link for self-arranged items */}
          {isSelfArranged && item.external_url && (
            <div className="mt-2 ml-[76px]">
              <a
                href={item.external_url!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Boek bij {item.provider_name}
              </a>
            </div>
          )}
          
          {/* Quoted price notes from partner */}
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
          
          {/* Accept action for confirmed OR alternative items - shows if not yet accepted by customer */}
          {(item.status === "confirmed" || item.status === "alternative") && !item.customer_accepted_at && onAccept && (
            <div className={cn(
              "mt-3 p-4 rounded-lg border",
              item.status === "confirmed" 
                ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900"
                : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900"
            )}>
              <div className="flex-1 mb-3">
                <p className={cn(
                  "font-medium",
                  item.status === "confirmed" 
                    ? "text-green-800 dark:text-green-300"
                    : "text-amber-800 dark:text-amber-300"
                )}>
                  {item.status === "confirmed" 
                    ? "Bevestigd door aanbieder" 
                    : "Alternatief voorstel van aanbieder"}
                </p>
                {item.proposed_time && (
                  <p className={cn(
                    "text-sm mt-0.5",
                    item.status === "confirmed"
                      ? "text-green-700/80 dark:text-green-400/80"
                      : "text-amber-700/80 dark:text-amber-400/80"
                  )}>
                    Voorgestelde tijd: {item.proposed_time}
                  </p>
                )}
                {item.quoted_price && (
                  <p className={cn(
                    "text-sm mt-0.5",
                    item.status === "confirmed"
                      ? "text-green-700/80 dark:text-green-400/80"
                      : "text-amber-700/80 dark:text-amber-400/80"
                  )}>
                    Totaalprijs: €{item.quoted_price.toLocaleString("nl-NL", { minimumFractionDigits: 2 })} incl. BTW
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={async () => {
                    setLocalAccepting(true);
                    await onAccept();
                    setLocalAccepting(false);
                  }}
                  disabled={localAccepting || isAccepting}
                  size="sm"
                >
                  {localAccepting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Akkoord
                </Button>
                {onCounterProposal && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCounterDialog(true)}
                    disabled={localAccepting || isAccepting}
                  >
                    <ArrowLeftRight className="h-4 w-4 mr-2" />
                    Andere tijd voorstellen
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Counter proposal pending - waiting for partner response */}
          {item.status === "counter_proposed" && (
            <div className="mt-3 p-4 rounded-lg border bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900">
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
            <div className="mt-3 flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
              <Check className="h-4 w-4" />
              <span>U hebt akkoord gegeven op dit voorstel</span>
            </div>
          )}
          
          {/* Alternative actions */}
          {item.status === "alternative" && alternativeTimes.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {alternativeTimes.map((time) => (
                <Button
                  key={time}
                  size="sm"
                  variant="outline"
                  onClick={() => onUpdate({ preferred_time: time, status: "pending" })}
                >
                  Accepteer {time}
                </Button>
              ))}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditingTime(true)}
              >
                Andere tijd kiezen
              </Button>
            </div>
          )}
          
          {/* Unavailable actions */}
          {item.status === "unavailable" && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditingTime(true)}
              >
                Andere tijd/dag kiezen
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={onRemove}
              >
                <Trash2 className="h-4 w-4 mr-1" />
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
            {/* Price details - hidden for self-arranged items */}
            {!isSelfArranged && item.quoted_price && vatRate !== undefined && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Excl. BTW</span>
                  <span>€{(item.quoted_price / (1 + vatRate / 100)).toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">BTW ({vatRate}%)</span>
                  <span>€{(item.quoted_price - item.quoted_price / (1 + vatRate / 100)).toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-medium pt-1 border-t">
                  <span>Incl. BTW {item.price_type === "per_person" ? "(per persoon)" : "(totaalprijs)"}</span>
                  <span>€{item.quoted_price.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            )}
            {/* Time editing */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Gewenste tijd</Label>
                {isEditingTime || isEditing ? (
                  // For accepted items, use counter-proposal dialog instead of direct edit
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
              
              {selectedDates.length > 1 && (
                <div>
                  <Label className="text-sm">Dag</Label>
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
                          Dag {idx + 1} • {format(date, "d MMM", { locale: nl })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            {/* Notes */}
            <div>
              <Label className="text-sm">Opmerking</Label>
              <Textarea
                value={item.customer_notes || ""}
                onChange={(e) => onUpdate({ customer_notes: e.target.value })}
                placeholder="Bijzonderheden voor deze activiteit..."
                className="mt-1.5"
                rows={2}
              />
            </div>
            
            {/* Actions */}
            <div className="flex justify-end gap-2">
              {item.status !== "cancelled" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={onRemove}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Annuleren
                </Button>
              )}
            </div>
          </CollapsibleContent>
        </CardContent>
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
    </Card>
  );
};

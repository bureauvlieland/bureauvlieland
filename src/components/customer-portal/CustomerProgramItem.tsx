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
import { Badge } from "@/components/ui/badge";
import { Clock, ChevronDown, ChevronUp, Calendar, Trash2, MessageSquare, Edit2, Timer, Sparkles } from "lucide-react";
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
  isEditing?: boolean;
  hasChanges?: boolean;
}

export const CustomerProgramItem = ({
  item,
  selectedDates,
  onUpdate,
  onRemove,
  isEditing = false,
  hasChanges = false,
}: CustomerProgramItemProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditingTime, setIsEditingTime] = useState(false);
  
  const statusConfig = itemStatusConfig[item.status as ItemStatus];
  const currentDate = selectedDates[item.day_index];
  
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
                <ItemStatusBadge status={item.status as ItemStatus} />
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {item.provider_name}
              </p>
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
              {item.preferred_time 
                ? (item.preferred_time === "flexibel" ? "Flexibel" : item.preferred_time)
                : "Flexibel"}
            </span>
            {item.duration && (
              <span className="flex items-center gap-1">
                <Timer className="h-3.5 w-3.5" />
                {item.duration}
              </span>
            )}
            {/* Show quoted price if available (confirmed by partner), otherwise show price indication */}
            {item.quoted_price ? (
              <span className="font-semibold text-green-700 dark:text-green-500">
                €{item.quoted_price.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            ) : item.price_indication && (
              <span className="font-medium text-foreground">
                {item.price_indication}
              </span>
            )}
          </div>
          
          {/* Quoted price notes from partner */}
          {item.quoted_price && item.quoted_notes && (
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
            {/* Time editing */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Gewenste tijd</Label>
                {isEditingTime || isEditing ? (
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
                ) : (
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-sm">
                      {item.preferred_time || "Flexibel"}
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
    </Card>
  );
};

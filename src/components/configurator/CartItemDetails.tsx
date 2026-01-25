import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Clock, Plus, Minus, MessageSquare, Calendar } from "lucide-react";
import { timeSlots, type BuildingBlock, type CartItemDetail } from "@/types/buildingBlock";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface CartItemDetailsProps {
  block: BuildingBlock;
  item: CartItemDetail;
  onUpdate: (updates: Partial<CartItemDetail>) => void;
  onRemove: () => void;
  selectedDates?: Date[];
  showDaySelector?: boolean;
}

export const CartItemDetails = ({
  block,
  item,
  onUpdate,
  onRemove,
  selectedDates = [],
  showDaySelector = false,
}: CartItemDetailsProps) => {
  const [showNotes, setShowNotes] = useState(item.notes.length > 0);

  const hasMultipleDays = selectedDates.length > 1;

  return (
    <div className="py-2.5 px-3 bg-background rounded-lg space-y-2">
      {/* Header with name and remove button */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm leading-tight truncate">{block.name}</p>
          <p className="text-xs text-muted-foreground leading-tight">
            {block.price_display_override || (block.price_adult !== null ? `€ ${block.price_adult}` : "Op aanvraag")} {block.price_adult_note || ""}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Time selector */}
      <div className="flex items-center gap-2">
        <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <Select
          value={item.preferredTime || "flexibel"}
          onValueChange={(value) => onUpdate({ preferredTime: value === "flexibel" ? null : value })}
        >
          <SelectTrigger className="h-7 text-xs flex-1">
            <SelectValue placeholder="Gewenste tijd" />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            {timeSlots.map((slot) => (
              <SelectItem key={slot.value} value={slot.value} className="text-xs">
                {slot.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Day selector - only show when there are multiple days and showDaySelector is true */}
      {showDaySelector && hasMultipleDays && (
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Select
            value={String(item.dayIndex)}
            onValueChange={(value) => onUpdate({ dayIndex: Number(value) })}
          >
            <SelectTrigger className="h-7 text-xs flex-1">
              <SelectValue placeholder="Selecteer dag" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              {selectedDates.map((date, index) => (
                <SelectItem key={index} value={String(index)} className="text-xs">
                  Dag {index + 1} - {format(date, "d MMM", { locale: nl })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Notes toggle and field */}
      {!showNotes ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs text-muted-foreground hover:text-foreground gap-1 px-1.5"
          onClick={() => setShowNotes(true)}
        >
          <Plus className="h-3 w-3" />
          <MessageSquare className="h-3 w-3" />
          Opmerking toevoegen
        </Button>
      ) : (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              Opmerking
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 text-xs text-muted-foreground hover:text-foreground gap-1 px-1"
              onClick={() => {
                if (!item.notes) {
                  setShowNotes(false);
                }
              }}
            >
              <Minus className="h-3 w-3" />
            </Button>
          </div>
          <Textarea
            value={item.notes}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            placeholder="Bijv. Engelstalige gids gewenst..."
            className="text-xs min-h-[50px] resize-none"
            maxLength={500}
          />
          <p className="text-[10px] text-muted-foreground text-right">
            {item.notes.length}/500
          </p>
        </div>
      )}
    </div>
  );
};

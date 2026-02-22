import { useState, useMemo } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Clock, CalendarDays, Plus, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { BuildingBlock, CartItemDetail } from "@/types/buildingBlock";
import {
  parseTimeToMinutes,
  parseDuration,
  timeRangesOverlap,
  minutesToTime,
  type TimeSlot,
} from "@/lib/timeUtils";

interface AddToCartDialogProps {
  block: BuildingBlock | null;
  isOpen: boolean;
  onClose: () => void;
  selectedDates: Date[];
  cartItems: CartItemDetail[];
  allBlocks: BuildingBlock[];
  onConfirm: (blockId: string, dayIndex: number, preferredTime: string | null) => void;
}

// Generate time slots from 08:00 to 22:00 in 30-min steps
const allTimeSlots = Array.from({ length: (22 - 8) * 2 + 1 }, (_, i) => {
  const totalMinutes = 8 * 60 + i * 30;
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const mins = String(totalMinutes % 60).padStart(2, "0");
  return `${hours}:${mins}`;
});

const BUFFER_MINUTES = 30;

export const AddToCartDialog = ({
  block,
  isOpen,
  onClose,
  selectedDates,
  cartItems,
  allBlocks,
  onConfirm,
}: AddToCartDialogProps) => {
  const [dayIndex, setDayIndex] = useState(0);
  const [time, setTime] = useState("flexibel");

  const isMultiDay = selectedDates.length > 1;

  const dayOptions = useMemo(
    () =>
      selectedDates.map((date, idx) => ({
        value: String(idx),
        label: `Dag ${idx + 1} — ${format(date, "EEE d MMM", { locale: nl })}`,
      })),
    [selectedDates]
  );

  // Build blocked time slots from existing cart items on the selected day
  const blockedSlots = useMemo((): TimeSlot[] => {
    return cartItems
      .filter((item) => item.dayIndex === dayIndex && item.preferredTime)
      .map((item) => {
        const itemBlock = allBlocks.find((b) => b.id === item.blockId);
        const startTime = item.preferredTime!;
        const durationMinutes = parseDuration(itemBlock?.duration ?? null);
        const startMinutes = parseTimeToMinutes(startTime);
        const endMinutes = startMinutes + durationMinutes + BUFFER_MINUTES;

        return {
          itemId: item.blockId,
          itemName: itemBlock?.name ?? "Activiteit",
          startTime,
          endTime: minutesToTime(endMinutes),
          startMinutes,
          endMinutes,
        };
      });
  }, [cartItems, dayIndex, allBlocks]);

  // Check if a time slot is blocked for the current block's duration
  const getSlotConflict = (slotTime: string): TimeSlot | null => {
    if (!block) return null;
    const blockDuration = parseDuration(block.duration);
    const start = parseTimeToMinutes(slotTime);
    const end = start + blockDuration + BUFFER_MINUTES;

    for (const slot of blockedSlots) {
      if (timeRangesOverlap(start, end, slot.startMinutes, slot.endMinutes)) {
        return slot;
      }
    }
    return null;
  };

  const handleConfirm = () => {
    if (!block) return;
    const preferredTime = time === "flexibel" ? null : time;
    onConfirm(block.id, dayIndex, preferredTime);
    setDayIndex(0);
    setTime("flexibel");
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      setDayIndex(0);
      setTime("flexibel");
    }
  };

  if (!block) return null;

  const selectedConflict = time !== "flexibel" ? getSlotConflict(time) : null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">{block.name} toevoegen</DialogTitle>
          <DialogDescription>
            Op welk moment past deze activiteit het beste in uw programma?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Day selection — only for multi-day */}
          {isMultiDay && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                Op welke dag?
              </Label>
              <Select
                value={String(dayIndex)}
                onValueChange={(v) => {
                  setDayIndex(Number(v));
                  setTime("flexibel");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dayOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Time selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Voorkeurstijd
            </Label>
            <Select value={time} onValueChange={setTime}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="flexibel">
                  Flexibel — wij plannen het in
                </SelectItem>
                {allTimeSlots.map((slot) => {
                  const conflict = getSlotConflict(slot);
                  return (
                    <SelectItem
                      key={slot}
                      value={slot}
                      disabled={!!conflict}
                      className={conflict ? "opacity-50" : ""}
                    >
                      {slot}
                      {conflict ? ` — bezet (${conflict.itemName})` : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {selectedConflict && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Overlapt met {selectedConflict.itemName} ({selectedConflict.startTime}–{selectedConflict.endTime})
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              Dit is een voorkeur — de definitieve tijd ontvangt u in ons voorstel.
              {block.duration && (
                <span className="block mt-0.5">Geschatte duur: {block.duration}.</span>
              )}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuleren
          </Button>
          <Button onClick={handleConfirm} className="gap-2">
            <Plus className="h-4 w-4" />
            Toevoegen aan programma
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

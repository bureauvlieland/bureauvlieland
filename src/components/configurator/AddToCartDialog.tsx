import { useState, useMemo } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Clock, CalendarDays, Plus } from "lucide-react";
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
import type { BuildingBlock } from "@/types/buildingBlock";

interface AddToCartDialogProps {
  block: BuildingBlock | null;
  isOpen: boolean;
  onClose: () => void;
  selectedDates: Date[];
  onConfirm: (blockId: string, dayIndex: number, preferredTime: string | null) => void;
}

// Generate time slots from 08:00 to 22:00 in 30-min steps for a cleaner list
const timeOptions = [
  { value: "flexibel", label: "Flexibel — wij plannen het in" },
  ...Array.from({ length: (22 - 8) * 2 + 1 }, (_, i) => {
    const totalMinutes = 8 * 60 + i * 30;
    const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
    const mins = String(totalMinutes % 60).padStart(2, "0");
    const value = `${hours}:${mins}`;
    return { value, label: value };
  }),
];

export const AddToCartDialog = ({
  block,
  isOpen,
  onClose,
  selectedDates,
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

  const handleConfirm = () => {
    if (!block) return;
    const preferredTime = time === "flexibel" ? null : time;
    onConfirm(block.id, dayIndex, preferredTime);
    // Reset for next use
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
                onValueChange={(v) => setDayIndex(Number(v))}
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
                {timeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Dit is een voorkeur — de definitieve tijd ontvangt u in ons voorstel.
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

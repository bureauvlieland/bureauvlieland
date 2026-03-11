import { useState, useMemo } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { CalendarDays, Plus } from "lucide-react";
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

interface AddToCartDialogProps {
  block: BuildingBlock | null;
  isOpen: boolean;
  onClose: () => void;
  selectedDates: Date[];
  cartItems: CartItemDetail[];
  allBlocks: BuildingBlock[];
  onConfirm: (blockId: string, dayIndex: number, preferredTime: string | null) => void;
}

export const AddToCartDialog = ({
  block,
  isOpen,
  onClose,
  selectedDates,
  onConfirm,
}: AddToCartDialogProps) => {
  const [dayIndex, setDayIndex] = useState(0);

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
    onConfirm(block.id, dayIndex, null);
    setDayIndex(0);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      setDayIndex(0);
    }
  };

  if (!block) return null;

  // For single-day trips, skip the dialog entirely
  if (!isMultiDay) {
    // Auto-confirm when dialog opens
    if (isOpen) {
      setTimeout(() => {
        onConfirm(block.id, 0, null);
      }, 0);
    }
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">{block.name} toevoegen</DialogTitle>
          <DialogDescription>
            Op welke dag wilt u deze activiteit plannen?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Day selection */}
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

          <p className="text-xs text-muted-foreground">
            Bureau Vlieland plant de exacte tijden voor u in.
            {block.duration && (
              <span className="block mt-0.5">Geschatte duur: {block.duration}.</span>
            )}
          </p>
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

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, AlertTriangle, Loader2 } from "lucide-react";
import { type ProgramRequestItem } from "@/types/programRequest";
import { getAvailableTimeSlots, getBlockedTimeSlots, hasTimeConflict } from "@/lib/timeUtils";

interface CounterProposalDialogProps {
  item: ProgramRequestItem;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (counterTime: string, counterNote: string) => Promise<boolean>;
  allItems: ProgramRequestItem[];
}

export const CounterProposalDialog = ({
  item,
  isOpen,
  onClose,
  onSubmit,
  allItems,
}: CounterProposalDialogProps) => {
  const [counterTime, setCounterTime] = useState("");
  const [counterNote, setCounterNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Get blocked time slots for this day
  const blockedSlots = getBlockedTimeSlots(allItems, item.day_index, item.id);
  
  // Get available time slots
  const availableTimeSlots = getAvailableTimeSlots(blockedSlots, item.duration);

  // Check if selected time has conflicts
  const selectedConflict = counterTime ? hasTimeConflict(counterTime, item.duration, blockedSlots) : null;

  const handleSubmit = async () => {
    setError("");

    if (!counterTime) {
      setError("Kies een tijd voor uw tegenvoorstel");
      return;
    }

    if (selectedConflict) {
      setError("Deze tijd overlapt met een andere activiteit");
      return;
    }

    setIsSubmitting(true);
    const success = await onSubmit(counterTime, counterNote);
    setIsSubmitting(false);

    if (success) {
      handleClose();
    } else {
      setError("Er ging iets mis. Probeer het opnieuw.");
    }
  };

  const handleClose = () => {
    setCounterTime("");
    setCounterNote("");
    setError("");
    onClose();
  };

  const currentTime = item.confirmed_time || item.proposed_time || item.preferred_time;
  const isAcceptedItem = !!item.customer_accepted_at;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Andere tijd voorstellen</DialogTitle>
          <DialogDescription>
            {isAcceptedItem 
              ? `De huidige tijd (${currentTime || "flexibel"}) past niet meer? De prijs blijft ongewijzigd, je stelt alleen een andere tijd voor.`
              : `De voorgestelde tijd (${currentTime || "flexibel"}) past niet? Geef hieronder aan welke tijd jou beter uitkomt.`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Activity info */}
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <p className="font-medium">{item.block_name}</p>
            <p className="text-muted-foreground">{item.provider_name}</p>
            {item.duration && (
              <p className="text-muted-foreground flex items-center gap-1 mt-1">
                <Clock className="h-3.5 w-3.5" />
                Duur: {item.duration}
              </p>
            )}
            {/* Show confirmed price for accepted items */}
            {isAcceptedItem && item.quoted_price && (
              <p className="text-green-700 dark:text-green-400 font-medium mt-1">
                Prijs: €{item.quoted_price.toLocaleString("nl-NL", { minimumFractionDigits: 2 })} (blijft ongewijzigd)
              </p>
            )}
          </div>

          {/* Blocked time slots info */}
          {blockedSlots.length > 0 && (
            <Alert variant="default" className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-300">
                <span className="font-medium">Bezette tijden op deze dag:</span>
                <ul className="mt-1 space-y-0.5 text-sm">
                  {blockedSlots.map((slot) => (
                    <li key={slot.itemId}>
                      {slot.startTime} - {slot.endTime} ({slot.itemName})
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Time selection */}
          <div className="space-y-2">
            <Label htmlFor="counter-time">Gewenste tijd *</Label>
            <Select value={counterTime} onValueChange={setCounterTime}>
              <SelectTrigger>
                <SelectValue placeholder="Kies een tijd" />
              </SelectTrigger>
              <SelectContent>
                {availableTimeSlots.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
                {availableTimeSlots.length === 0 && (
                  <SelectItem value="none" disabled>
                    Geen beschikbare tijden
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Explanation */}
          <div className="space-y-2">
            <Label htmlFor="counter-note">Toelichting (optioneel)</Label>
            <Textarea
              id="counter-note"
              placeholder="Waarom past deze tijd je beter?"
              value={counterNote}
              onChange={(e) => setCounterNote(e.target.value)}
              rows={3}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Annuleren
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !counterTime}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Versturen...
              </>
            ) : (
              "Tegenvoorstel versturen"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

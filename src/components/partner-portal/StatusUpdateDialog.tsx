import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle, XCircle, MessageSquare, Loader2, Euro, Clock } from "lucide-react";
import { minutesToTime } from "@/lib/timeUtils";
import type { PartnerItem } from "@/types/partner";
import { generateTimeSlots, getBlockedTimeSlotsFromPartnerItems, isTimeSlotBlocked, type PartnerConflictItem } from "@/lib/timeUtils";
import { cn } from "@/lib/utils";

interface StatusUpdateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (status: string, note?: string, quotedPrice?: number, quotedNotes?: string, proposedTime?: string) => Promise<void>;
  item: PartnerItem | null;
  allDayItems?: PartnerItem[]; // For conflict checking
}

export const StatusUpdateDialog = ({
  isOpen,
  onClose,
  onSubmit,
  item,
  allDayItems = [],
}: StatusUpdateDialogProps) => {
  const [status, setStatus] = useState<string>("confirmed");
  const [note, setNote] = useState("");
  const [quotedPrice, setQuotedPrice] = useState("");
  const [quotedNotes, setQuotedNotes] = useState("");
  const [proposedTime, setProposedTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [priceError, setPriceError] = useState("");
  const [timeError, setTimeError] = useState("");

  // Calculate blocked time slots
  const blockedTimeSlots = useMemo(() => {
    if (!item) return [];
    const compatibleItems: PartnerConflictItem[] = allDayItems.map(i => ({
      id: i.id,
      day_index: i.day_index,
      block_name: i.block_name,
      confirmed_time: i.confirmed_time,
      proposed_time: i.proposed_time,
      preferred_time: i.preferred_time,
      duration: i.duration,
      status: i.status,
    }));
    return getBlockedTimeSlotsFromPartnerItems(compatibleItems, item.day_index, item.id);
  }, [allDayItems, item]);

  // Generate available time slots
  const availableTimeSlots = useMemo(() => {
    const allSlots = generateTimeSlots();
    return allSlots.filter(time => !isTimeSlotBlocked(time, item?.duration || null, blockedTimeSlots));
  }, [blockedTimeSlots, item?.duration]);

  const handleSubmit = async () => {
    let hasError = false;

    // Time is required only for alternative
    if (status === "alternative") {
      if (!proposedTime) {
        setTimeError("Tijd is verplicht");
        hasError = true;
      } else if (isTimeSlotBlocked(proposedTime, item?.duration || null, blockedTimeSlots)) {
        setTimeError("Deze tijd conflicteert met een andere activiteit");
        hasError = true;
      }
    }

    // Validate price is required for confirmed status
    if (status === "confirmed") {
      const priceValue = parseFloat(quotedPrice.replace(",", "."));
      if (!quotedPrice || isNaN(priceValue) || priceValue <= 0) {
        setPriceError("Vul een geldige prijs in");
        hasError = true;
      }
    }

    if (hasError) return;
    try {
      const priceValue = status === "confirmed" 
        ? parseFloat(quotedPrice.replace(",", ".")) 
        : undefined;
      await onSubmit(status, note || undefined, priceValue, quotedNotes || undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setStatus("confirmed");
    setNote("");
    setQuotedPrice("");
    setQuotedNotes("");
    setProposedTime("");
    setPriceError("");
    setTimeError("");
    onClose();
  };

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reageer op aanvraag</DialogTitle>
          <DialogDescription>
            {item.block_name} voor {item.program_requests.customer_company || item.program_requests.customer_name}
            {" "}({item.program_requests.number_of_people} personen)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <RadioGroup value={status} onValueChange={setStatus} className="space-y-3">
            <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="confirmed" id="confirmed" />
              <Label htmlFor="confirmed" className="flex items-center gap-2 cursor-pointer flex-1">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Bevestigen</p>
                  <p className="text-sm text-muted-foreground">
                    De activiteit kan plaatsvinden zoals aangevraagd
                  </p>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="alternative" id="alternative" />
              <Label htmlFor="alternative" className="flex items-center gap-2 cursor-pointer flex-1">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">Alternatief voorstellen</p>
                  <p className="text-sm text-muted-foreground">
                    Stel een andere tijd of aanpassing voor
                  </p>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="unavailable" id="unavailable" />
              <Label htmlFor="unavailable" className="flex items-center gap-2 cursor-pointer flex-1">
                <XCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium">Niet beschikbaar</p>
                  <p className="text-sm text-muted-foreground">
                    De activiteit kan niet plaatsvinden
                  </p>
                </div>
              </Label>
            </div>
          </RadioGroup>

          {/* Price input for confirmed status */}
          {status === "confirmed" && (
            <div className="space-y-4 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900">
              {/* Read-only preferred time */}
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Gewenste tijd:</span>
                <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                  {item?.preferred_time || "Niet opgegeven"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                U bevestigt de activiteit op de gewenste tijd van de klant.
              </p>

              <div className="space-y-2">
                <Label htmlFor="quotedPrice" className="flex items-center gap-1">
                  <Euro className="h-4 w-4" />
                  Totaalprijs voor deze aanvraag (incl. BTW) *
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                  <Input
                    id="quotedPrice"
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={quotedPrice}
                    onChange={(e) => {
                      setQuotedPrice(e.target.value);
                      setPriceError("");
                    }}
                    className={cn("pl-7", priceError && "border-destructive")}
                  />
                </div>
                {priceError && (
                  <p className="text-sm text-destructive">{priceError}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Dit is de prijs voor {item?.program_requests.number_of_people} personen. 
                  De klant ziet deze prijs direct na bevestiging.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="quotedNotes">Toelichting bij prijs (optioneel)</Label>
                <Textarea
                  id="quotedNotes"
                  placeholder="Bijv. 'Inclusief materialen en begeleiding' of 'Exclusief drankjes'"
                  value={quotedNotes}
                  onChange={(e) => setQuotedNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}

          {status === "alternative" && (
            <div className="space-y-4 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
              {/* Blocked time slots - show actual end times without buffer */}
              {blockedTimeSlots.length > 0 && (
                <div className="p-3 bg-background rounded-lg border">
                  <p className="text-sm font-medium mb-2">
                    <Clock className="h-4 w-4 inline mr-1" />
                    Bezette tijden:
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {blockedTimeSlots.map(slot => {
                      const actualEndMinutes = slot.endMinutes - 30;
                      const actualEndTime = minutesToTime(actualEndMinutes);
                      return (
                        <li key={slot.itemId}>
                          {slot.startTime} – {actualEndTime}: {slot.itemName}
                        </li>
                      );
                    })}
                  </ul>
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    Er wordt 30 min marge aangehouden tussen activiteiten.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="proposedTimeAlt" className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Voorgestelde tijd *
                </Label>
                <select
                  id="proposedTimeAlt"
                  value={proposedTime}
                  onChange={(e) => {
                    setProposedTime(e.target.value);
                    setTimeError("");
                  }}
                  className={cn(
                    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    timeError && "border-destructive"
                  )}
                >
                  <option value="">Selecteer een tijd...</option>
                  {availableTimeSlots.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
                {timeError && <p className="text-sm text-destructive">{timeError}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">
                  Alternatief voorstel *
                </Label>
                <Textarea
                  id="note"
                  placeholder="Bijv. 'Beschikbaar op 14:00 in plaats van 10:00'"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          {status === "unavailable" && (
            <div className="space-y-2">
              <Label htmlFor="note">Reden (optioneel)</Label>
              <Textarea
                id="note"
                placeholder="Bijv. 'Volgeboekt op deze datum'"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Annuleren
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Bevestigen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

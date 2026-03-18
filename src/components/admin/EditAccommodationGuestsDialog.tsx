import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Loader2, Users } from "lucide-react";

interface QuotePartnerInfo {
  quoteId: string;
  partnerId: string;
  partnerName: string;
  status: string;
}

interface EditAccommodationGuestsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentGuests: number;
  quotes: QuotePartnerInfo[];
  onSave: (newGuests: number, selectedQuoteIds: string[]) => Promise<void>;
}

const STATUS_LABELS: Record<string, string> = {
  selected: "Geaccepteerd",
  submitted: "Offerte ontvangen",
  pending: "Wachtend op offerte",
  declined: "Afgewezen",
  rejected: "Afgewezen",
  expired: "Verlopen",
};

const STATUS_COLORS: Record<string, string> = {
  selected: "text-green-700 bg-green-50 border-green-200",
  submitted: "text-blue-700 bg-blue-50 border-blue-200",
  pending: "text-amber-700 bg-amber-50 border-amber-200",
  declined: "text-red-700 bg-red-50 border-red-200",
  rejected: "text-red-700 bg-red-50 border-red-200",
  expired: "text-muted-foreground bg-muted border-border",
};

export const EditAccommodationGuestsDialog = ({
  isOpen,
  onClose,
  currentGuests,
  quotes,
  onSave,
}: EditAccommodationGuestsDialogProps) => {
  const [guests, setGuests] = useState(currentGuests);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedQuoteIds, setSelectedQuoteIds] = useState<string[]>([]);

  // Active quotes that can be notified
  const activeQuotes = quotes.filter((q) =>
    ["pending", "submitted", "selected"].includes(q.status)
  );

  // Initialize selection when dialog opens
  useEffect(() => {
    if (isOpen) {
      setGuests(currentGuests);
      const selectedQuote = activeQuotes.find((q) => q.status === "selected");
      if (selectedQuote) {
        setSelectedQuoteIds([selectedQuote.quoteId]);
      } else {
        setSelectedQuoteIds(activeQuotes.map((q) => q.quoteId));
      }
    }
  }, [isOpen]);

  const hasChanges = guests !== currentGuests;

  const toggleQuote = (quoteId: string) => {
    setSelectedQuoteIds((prev) =>
      prev.includes(quoteId)
        ? prev.filter((id) => id !== quoteId)
        : [...prev, quoteId]
    );
  };

  const handleSave = async () => {
    if (!hasChanges) return;
    setIsSubmitting(true);
    try {
      await onSave(guests, selectedQuoteIds);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setGuests(currentGuests);
    onClose();
  };

  const selectedCount = selectedQuoteIds.length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Aantal gasten wijzigen</DialogTitle>
          <DialogDescription>
            Pas het aantal gasten aan en kies welke partners geïnformeerd worden.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="guests" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Aantal gasten
            </Label>
            <Input
              id="guests"
              type="number"
              min={1}
              max={500}
              value={guests}
              onChange={(e) =>
                setGuests(Math.max(1, parseInt(e.target.value) || 1))
              }
              className="w-32"
            />
          </div>

          {hasChanges && activeQuotes.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Partners informeren & offertes resetten
              </Label>
              <div className="space-y-2 rounded-md border p-3">
                {activeQuotes.map((q) => (
                  <label
                    key={q.quoteId}
                    className="flex items-center gap-3 cursor-pointer py-1"
                  >
                    <Checkbox
                      checked={selectedQuoteIds.includes(q.quoteId)}
                      onCheckedChange={() => toggleQuote(q.quoteId)}
                    />
                    <span className="flex-1 text-sm font-medium">
                      {q.partnerName}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[q.status] || ""}`}
                    >
                      {STATUS_LABELS[q.status] || q.status}
                    </span>
                  </label>
                ))}
              </div>

              <Alert
                variant="default"
                className="border-amber-200 bg-amber-50"
              >
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  {selectedCount > 0 ? (
                    <>
                      {selectedCount === 1
                        ? "De geselecteerde offerte wordt"
                        : `${selectedCount} geselecteerde offertes worden`}{" "}
                      gereset naar "wachtend". De betreffende partner
                      {selectedCount > 1 ? "s worden" : " wordt"} per e-mail op
                      de hoogte gesteld. Het gekoppelde programma wordt ook
                      bijgewerkt.
                    </>
                  ) : (
                    <>
                      Het aantal gasten wordt bijgewerkt zonder partners te
                      informeren. Geen offertes worden gereset.
                    </>
                  )}
                </AlertDescription>
              </Alert>
            </div>
          )}

          {hasChanges && activeQuotes.length === 0 && (
            <Alert variant="default" className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                Er zijn geen actieve offertes. Het aantal gasten en het
                gekoppelde programma worden bijgewerkt.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Annuleren
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || isSubmitting}>
            {isSubmitting && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            {selectedCount > 0
              ? `Opslaan & ${selectedCount} partner${selectedCount > 1 ? "s" : ""} informeren`
              : "Opslaan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

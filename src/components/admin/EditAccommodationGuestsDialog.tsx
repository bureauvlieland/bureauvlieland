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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2, Users } from "lucide-react";

interface EditAccommodationGuestsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentGuests: number;
  onSave: (newGuests: number) => Promise<void>;
}

export const EditAccommodationGuestsDialog = ({
  isOpen,
  onClose,
  currentGuests,
  onSave,
}: EditAccommodationGuestsDialogProps) => {
  const [guests, setGuests] = useState(currentGuests);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasChanges = guests !== currentGuests;

  const handleSave = async () => {
    if (!hasChanges) return;
    setIsSubmitting(true);
    try {
      await onSave(guests);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setGuests(currentGuests);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Aantal gasten wijzigen</DialogTitle>
          <DialogDescription>
            Pas het aantal gasten aan voor deze logiesaanvraag.
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
              onChange={(e) => setGuests(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-32"
            />
          </div>

          {hasChanges && (
            <Alert variant="default" className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                Alle bestaande offertes (inclusief geaccepteerde) worden gereset.
                Partners worden per e-mail op de hoogte gesteld en gevraagd opnieuw te offreren.
                {" "}Het gekoppelde programma wordt ook bijgewerkt.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Annuleren
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Opslaan & partners informeren
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

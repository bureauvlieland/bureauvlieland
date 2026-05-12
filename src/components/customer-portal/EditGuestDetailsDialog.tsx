import { useEffect, useState } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Loader2, Users, UtensilsCrossed, BedDouble } from "lucide-react";

interface EditGuestDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialGuestNames: string;
  initialDietaryNotes: string;
  initialRoomAssignment: string;
  showDietary: boolean;
  showRoomAssignment: boolean;
  onSave: (updates: {
    guest_names?: string | null;
    dietary_notes?: string | null;
    room_assignment?: string | null;
  }) => Promise<boolean>;
}

const MAX_LEN = 5000;

export const EditGuestDetailsDialog = ({
  isOpen,
  onClose,
  initialGuestNames,
  initialDietaryNotes,
  initialRoomAssignment,
  showDietary,
  showRoomAssignment,
  onSave,
}: EditGuestDetailsDialogProps) => {
  const [guestNames, setGuestNames] = useState(initialGuestNames);
  const [dietaryNotes, setDietaryNotes] = useState(initialDietaryNotes);
  const [roomAssignment, setRoomAssignment] = useState(initialRoomAssignment);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setGuestNames(initialGuestNames);
      setDietaryNotes(initialDietaryNotes);
      setRoomAssignment(initialRoomAssignment);
    }
  }, [isOpen, initialGuestNames, initialDietaryNotes, initialRoomAssignment]);

  const hasChanges =
    guestNames !== initialGuestNames ||
    (showDietary && dietaryNotes !== initialDietaryNotes) ||
    (showRoomAssignment && roomAssignment !== initialRoomAssignment);

  const handleSave = async () => {
    setIsSubmitting(true);
    const updates: {
      guest_names?: string | null;
      dietary_notes?: string | null;
      room_assignment?: string | null;
    } = {};
    if (guestNames !== initialGuestNames) updates.guest_names = guestNames || null;
    if (showDietary && dietaryNotes !== initialDietaryNotes) updates.dietary_notes = dietaryNotes || null;
    if (showRoomAssignment && roomAssignment !== initialRoomAssignment) updates.room_assignment = roomAssignment || null;

    const ok = await onSave(updates);
    setIsSubmitting(false);
    if (ok) onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Groep & wensen</DialogTitle>
          <DialogDescription>
            Vul hier de gastenlijst en eventuele wensen in. U kunt dit tot vlak voor aankomst bijwerken.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="guest-names" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Gastenlijst
            </Label>
            <Textarea
              id="guest-names"
              value={guestNames}
              maxLength={MAX_LEN}
              onChange={(e) => setGuestNames(e.target.value)}
              placeholder={"Bijv.\nJan de Vries\nMarieke Bakker\n…"}
              className="min-h-[120px]"
            />
            <p className="text-xs text-muted-foreground">
              Vrij invulbaar — één naam per regel of gewoon een opsomming.
            </p>
          </div>

          {showDietary && (
            <div className="space-y-2">
              <Label htmlFor="dietary-notes" className="flex items-center gap-2">
                <UtensilsCrossed className="h-4 w-4" />
                Dieetwensen & allergieën
              </Label>
              <Textarea
                id="dietary-notes"
                value={dietaryNotes}
                maxLength={MAX_LEN}
                onChange={(e) => setDietaryNotes(e.target.value)}
                placeholder="Bijv. 2 x vegetarisch, 1 x glutenvrij, Jan eet geen vis, Lisa heeft notenallergie."
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground">
                Alleen invullen als er catering, lunch of diner in het programma zit.
              </p>
            </div>
          )}

          {showRoomAssignment && (
            <div className="space-y-2">
              <Label htmlFor="room-assignment" className="flex items-center gap-2">
                <BedDouble className="h-4 w-4" />
                Kamerindeling (logies)
              </Label>
              <Textarea
                id="room-assignment"
                value={roomAssignment}
                maxLength={MAX_LEN}
                onChange={(e) => setRoomAssignment(e.target.value)}
                placeholder={"Bijv.\nKamer 1: Jan & Marieke (1 tweepersoonsbed)\nKamer 2: Pieter & Sanne (2 eenpersoonsbedden)\n…"}
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground">
                Voorkeur voor kamerverdeling — de accommodatie probeert hier zo veel mogelijk rekening mee te houden.
              </p>
            </div>
          )}

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Bureau Vlieland en de aanbieders kunnen alleen rekening houden met wensen die hier zijn vermeld.
              Vergeet ze niet aan te vullen of bij te werken als er nog gasten of wijzigingen bijkomen.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Annuleren
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Opslaan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

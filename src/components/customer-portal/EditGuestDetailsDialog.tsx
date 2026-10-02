import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Sheet, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FormField, Notice, ResponsiveSheetContent } from "@/components/system";

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

/**
 * Gastenlijst, dieetwensen en kamerindeling als sheet met `FormField`s
 * (klantportaal fase 3): van onderen op een telefoon, van rechts op desktop.
 */
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
    const updates: { guest_names?: string | null; dietary_notes?: string | null; room_assignment?: string | null } = {};
    if (guestNames !== initialGuestNames) updates.guest_names = guestNames || null;
    if (showDietary && dietaryNotes !== initialDietaryNotes) updates.dietary_notes = dietaryNotes || null;
    if (showRoomAssignment && roomAssignment !== initialRoomAssignment) updates.room_assignment = roomAssignment || null;
    const ok = await onSave(updates);
    setIsSubmitting(false);
    if (ok) onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <ResponsiveSheetContent className="flex w-full flex-col overflow-y-auto sm:max-w-lg">
        <SheetHeader className="text-left">
          <SheetTitle>Groep en wensen</SheetTitle>
          <SheetDescription>Vul de gastenlijst en eventuele wensen in. U kunt dit tot vlak voor aankomst bijwerken.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          <FormField label="Gastenlijst" htmlFor="guest-names" help="Vrij invulbaar: één naam per regel of een opsomming.">
            <Textarea
              id="guest-names"
              value={guestNames}
              maxLength={MAX_LEN}
              onChange={(e) => setGuestNames(e.target.value)}
              placeholder={"Bijvoorbeeld:\nJan de Vries\nMarieke Bakker"}
              className="min-h-[120px]"
            />
          </FormField>

          {showDietary && (
            <FormField label="Dieetwensen en allergieën" htmlFor="dietary-notes" help="Alleen nodig als er catering, lunch of diner in het programma zit.">
              <Textarea
                id="dietary-notes"
                value={dietaryNotes}
                maxLength={MAX_LEN}
                onChange={(e) => setDietaryNotes(e.target.value)}
                placeholder="Bijvoorbeeld: 2 keer vegetarisch, 1 keer glutenvrij, Jan eet geen vis, Lisa heeft een notenallergie."
                className="min-h-[100px]"
              />
            </FormField>
          )}

          {showRoomAssignment && (
            <FormField label="Kamerindeling" htmlFor="room-assignment" help="Uw voorkeur voor de kamerverdeling. De accommodatie houdt hier zo veel mogelijk rekening mee.">
              <Textarea
                id="room-assignment"
                value={roomAssignment}
                maxLength={MAX_LEN}
                onChange={(e) => setRoomAssignment(e.target.value)}
                placeholder={"Bijvoorbeeld:\nKamer 1: Jan en Marieke (tweepersoonsbed)\nKamer 2: Pieter en Sanne (twee eenpersoonsbedden)"}
                className="min-h-[100px]"
              />
            </FormField>
          )}

          <Notice tone="info">
            <p>Bureau Vlieland en de aanbieders houden alleen rekening met wensen die hier staan. Vul ze aan als er gasten of wijzigingen bijkomen.</p>
          </Notice>
        </div>

        <SheetFooter className="mt-6 gap-2 sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Annuleren
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Opslaan
          </Button>
        </SheetFooter>
      </ResponsiveSheetContent>
    </Sheet>
  );
};

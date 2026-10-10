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
  onSave: (updates: { guest_names?: string | null; dietary_notes?: string | null; room_assignment?: string | null }) => Promise<boolean>;
}

const MAX_LEN = 5000;

/**
 * Groep en wensen (klantportaal fase 3b): gastenlijst, dieet en
 * kamerindeling als `FormField`s in een sheet die op een telefoon van
 * onderen komt. Alleen de gewijzigde velden gaan naar de server.
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

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!hasChanges) return;
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
      <ResponsiveSheetContent className="flex flex-col gap-0 overflow-y-auto sm:max-w-lg">
        <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col">
          <SheetHeader className="text-left">
            <SheetTitle>Groep en wensen</SheetTitle>
            <SheetDescription>Vul de gastenlijst en uw wensen in. U kunt dit tot vlak voor aankomst bijwerken.</SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-5 py-5">
            <FormField
              label="Gastenlijst"
              htmlFor="guest-names"
              help="Eén naam per regel, of gewoon een opsomming."
            >
              <Textarea
                value={guestNames}
                maxLength={MAX_LEN}
                onChange={(e) => setGuestNames(e.target.value)}
                placeholder={"Jan de Vries\nMarieke Bakker"}
                className="min-h-[120px]"
              />
            </FormField>

            {showDietary && (
              <FormField
                label="Dieetwensen en allergieën"
                htmlFor="dietary-notes"
                help="Voor de lunch, het diner of de catering in uw programma."
              >
                <Textarea
                  value={dietaryNotes}
                  maxLength={MAX_LEN}
                  onChange={(e) => setDietaryNotes(e.target.value)}
                  placeholder="2 keer vegetarisch, 1 keer glutenvrij, Lisa heeft een notenallergie."
                  className="min-h-[100px]"
                />
              </FormField>
            )}

            {showRoomAssignment && (
              <FormField
                label="Kamerindeling"
                htmlFor="room-assignment"
                help="Uw voorkeur; de accommodatie houdt er zo veel mogelijk rekening mee."
              >
                <Textarea
                  value={roomAssignment}
                  maxLength={MAX_LEN}
                  onChange={(e) => setRoomAssignment(e.target.value)}
                  placeholder={"Kamer 1: Jan en Marieke (tweepersoonsbed)\nKamer 2: Pieter en Sanne (twee eenpersoonsbedden)"}
                  className="min-h-[100px]"
                />
              </FormField>
            )}

            <Notice tone="info">
              Bureau Vlieland en de aanbieders houden alleen rekening met wat hier staat. Komen er gasten of wensen bij, werk het
              dan hier bij.
            </Notice>
          </div>

          <SheetFooter className="gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Annuleren
            </Button>
            <Button type="submit" disabled={!hasChanges || isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {isSubmitting ? "Opslaan…" : "Opslaan"}
            </Button>
          </SheetFooter>
        </form>
      </ResponsiveSheetContent>
    </Sheet>
  );
};

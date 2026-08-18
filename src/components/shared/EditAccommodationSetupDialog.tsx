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
import { Loader2 } from "lucide-react";
import { AccommodationSetupFields } from "./AccommodationSetupFields";
import {
  accommodationSetupChanged,
  normalizeAccommodationSetup,
  type AccommodationSetup,
} from "@/lib/accommodationSetup";

interface EditAccommodationSetupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialValue: Partial<AccommodationSetup> | null | undefined;
  numberOfGuests?: number | null;
  audience?: "admin" | "customer";
  onSave: (setup: AccommodationSetup) => Promise<boolean | void>;
}

/**
 * Bewerkdialoog voor kamerbezetting en verzorging — gedeeld door admin en
 * klantportaal, zodat beide dezelfde velden, validatie en normalisatie krijgen.
 */
export const EditAccommodationSetupDialog = ({
  isOpen,
  onClose,
  initialValue,
  numberOfGuests,
  audience = "admin",
  onSave,
}: EditAccommodationSetupDialogProps) => {
  const [value, setValue] = useState<AccommodationSetup>(
    normalizeAccommodationSetup(initialValue),
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setValue(normalizeAccommodationSetup(initialValue));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const hasChanges = accommodationSetupChanged(initialValue, value);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const ok = await onSave(normalizeAccommodationSetup(value));
      if (ok !== false) onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Kamers &amp; verzorging</DialogTitle>
          <DialogDescription>
            {audience === "customer"
              ? "Geef aan hoe u de kamers wilt indelen en welke verzorging u wenst. Wij nemen dit mee in de aanvraag bij de accommodaties."
              : "Leg de gevraagde kamerbezetting en verzorging vast. Deze gegevens gaan mee in de offerte-aanvraag naar de logiespartner."}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <AccommodationSetupFields
            value={value}
            onChange={setValue}
            numberOfGuests={numberOfGuests}
            audience={audience}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Annuleren
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Opslaan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

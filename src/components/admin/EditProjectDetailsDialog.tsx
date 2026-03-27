import { useState, useEffect } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MultiDatePicker } from "@/components/configurator/MultiDatePicker";
import { toast } from "sonner";

interface EditProjectDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  selectedDates: string[];
  numberOfPeople: number;
  generalNotes: string | null;
  linkedAccommodationId: string | null;
  onSuccess: () => void;
}

export function EditProjectDetailsDialog({
  open,
  onOpenChange,
  requestId,
  selectedDates: initialDates,
  numberOfPeople: initialPeople,
  generalNotes: initialNotes,
  linkedAccommodationId,
  onSuccess,
}: EditProjectDetailsDialogProps) {
  const [dates, setDates] = useState<Date[]>([]);
  const [people, setPeople] = useState(initialPeople);
  const [notes, setNotes] = useState(initialNotes || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDates(initialDates.map((d) => new Date(d)));
      setPeople(initialPeople);
      setNotes(initialNotes || "");
    }
  }, [open, initialDates, initialPeople, initialNotes]);

  const handleAddDate = (date: Date): boolean => {
    const alreadyExists = dates.some(
      (d) => d.toDateString() === date.toDateString()
    );
    if (alreadyExists) return false;
    setDates((prev) => [...prev, date].sort((a, b) => a.getTime() - b.getTime()));
    return true;
  };

  const handleRemoveDate = (index: number) => {
    setDates((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (dates.length === 0) {
      toast.error("Selecteer minimaal één datum");
      return;
    }
    if (people < 1) {
      toast.error("Aantal personen moet minimaal 1 zijn");
      return;
    }

    setSaving(true);
    try {
      const dateStrings = dates.map((d) => format(d, "yyyy-MM-dd"));

      const { error } = await supabase
        .from("program_requests")
        .update({
          selected_dates: dateStrings,
          number_of_people: people,
          general_notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;

      // Sync accommodation dates if linked
      if (linkedAccommodationId && dates.length > 0) {
        const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime());
        const arrivalDate = format(sortedDates[0], "yyyy-MM-dd");
        const departureDate = format(sortedDates[sortedDates.length - 1], "yyyy-MM-dd");

        await supabase
          .from("accommodation_requests")
          .update({
            arrival_date: arrivalDate,
            departure_date: departureDate,
            number_of_guests: people,
            updated_at: new Date().toISOString(),
          })
          .eq("id", linkedAccommodationId);
      }

      toast.success("Evenement details bijgewerkt");
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      console.error(err);
      toast.error("Fout bij opslaan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Evenement details bewerken</DialogTitle>
          <DialogDescription>
            Pas datums, aantal personen en notities aan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Datums</Label>
            <MultiDatePicker
              selectedDates={dates}
              onAddDate={handleAddDate}
              onRemoveDate={handleRemoveDate}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-people">Aantal personen</Label>
            <Input
              id="edit-people"
              type="number"
              min={1}
              value={people}
              onChange={(e) => setPeople(parseInt(e.target.value) || 1)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notities</Label>
            <Textarea
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Eventuele opmerkingen..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuleren
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Opslaan..." : "Opslaan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

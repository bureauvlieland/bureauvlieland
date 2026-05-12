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
import { Loader2, Users, UtensilsCrossed, BedDouble } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: "program_request" | "accommodation_request";
  recordId: string;
  initialGuestNames?: string | null;
  initialDietaryNotes?: string | null;
  initialRoomAssignment?: string | null;
  showDietary?: boolean;
  showRoomAssignment?: boolean;
  onSaved?: () => void;
}

const MAX = 5000;

export const AdminGuestDetailsDialog = ({
  open,
  onOpenChange,
  scope,
  recordId,
  initialGuestNames,
  initialDietaryNotes,
  initialRoomAssignment,
  showDietary = true,
  showRoomAssignment = false,
  onSaved,
}: Props) => {
  const [guestNames, setGuestNames] = useState(initialGuestNames || "");
  const [dietaryNotes, setDietaryNotes] = useState(initialDietaryNotes || "");
  const [roomAssignment, setRoomAssignment] = useState(initialRoomAssignment || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setGuestNames(initialGuestNames || "");
      setDietaryNotes(initialDietaryNotes || "");
      setRoomAssignment(initialRoomAssignment || "");
    }
  }, [open, initialGuestNames, initialDietaryNotes, initialRoomAssignment]);

  const handleSave = async () => {
    setSaving(true);
    const now = new Date().toISOString();
    try {
      if (scope === "program_request") {
        const { error } = await supabase
          .from("program_requests")
          .update({
            guest_names: guestNames || null,
            dietary_notes: showDietary ? (dietaryNotes || null) : undefined,
            guest_details_updated_at: now,
          } as any)
          .eq("id", recordId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("accommodation_requests")
          .update({
            room_assignment: roomAssignment || null,
            guest_details_updated_at: now,
          } as any)
          .eq("id", recordId);
        if (error) throw error;
      }
      toast({ title: "Opgeslagen", description: "Groep & wensen bijgewerkt." });
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Opslaan mislukt", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Groep & wensen aanpassen</DialogTitle>
          <DialogDescription>
            Hier kun je namens de klant de gastenlijst en wensen invullen of bijwerken.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {scope === "program_request" && (
            <>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Users className="h-4 w-4" /> Gastenlijst</Label>
                <Textarea
                  value={guestNames}
                  maxLength={MAX}
                  onChange={(e) => setGuestNames(e.target.value)}
                  className="min-h-[120px]"
                />
              </div>
              {showDietary && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><UtensilsCrossed className="h-4 w-4" /> Dieetwensen & allergieën</Label>
                  <Textarea
                    value={dietaryNotes}
                    maxLength={MAX}
                    onChange={(e) => setDietaryNotes(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
              )}
            </>
          )}
          {scope === "accommodation_request" && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><BedDouble className="h-4 w-4" /> Kamerindeling</Label>
              <Textarea
                value={roomAssignment}
                maxLength={MAX}
                onChange={(e) => setRoomAssignment(e.target.value)}
                className="min-h-[120px]"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuleren</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Opslaan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

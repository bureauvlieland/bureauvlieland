import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FormField, Notice } from "@/components/system";
import { toast } from "@/hooks/use-toast";
import { validateDismissReason } from "@/lib/partnerInvoiceDismiss";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  projectLabel: string;
  itemCount: number;
  partnerToken: string;
  onDismissed: () => void;
}

export function DismissProjectDialog({
  open,
  onOpenChange,
  requestId,
  projectLabel,
  itemCount,
  partnerToken,
  onDismissed,
}: Props) {
  const [reason, setReason] = useState("Opdracht afgerond en afgehandeld.");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const valid = validateDismissReason(reason);
    if (valid.ok === false) {
      toast({ title: "Reden ontbreekt", description: valid.error, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dismiss-partner-invoice-item`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ partnerToken, requestId, reason: reason.trim() }),
        },
      );
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Sluiten mislukt");
      toast({
        title: "Project gesloten",
        description: `${payload.dismissed ?? itemCount} onderdelen zijn uit uw werkbank gehaald.`,
      });
      onOpenChange(false);
      onDismissed();
    } catch (e) {
      toast({
        title: "Sluiten mislukt",
        description: e instanceof Error ? e.message : "Onbekende fout",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Project sluiten</DialogTitle>
          <DialogDescription>
            U haalt <span className="font-medium">{projectLabel}</span> uit uw werkbank. Alle
            onderdelen die geen actie meer vragen ({itemCount}) worden in één keer gesloten.
          </DialogDescription>
        </DialogHeader>

        <Notice tone="warning">
          <p>Al gefactureerde onderdelen en onderdelen die nog uw reactie vragen blijven staan. Bureau Vlieland ziet uw toelichting in het projectdossier en kan het project heropenen.</p>
        </Notice>

        <FormField label="Reden" htmlFor="dismiss-project-reason" required help={`${reason.length} van 500 tekens`}>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Bijvoorbeeld: opdracht afgerond en buiten het portaal om gefactureerd." rows={3} maxLength={500} />
        </FormField>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Annuleren
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Bezig met sluiten" : "Project sluiten"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

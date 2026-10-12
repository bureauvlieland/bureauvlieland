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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { validateDismissReason } from "@/lib/partnerInvoiceDismiss";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  itemLabel: string;
  partnerToken: string;
  onDismissed: () => void;
}

export function DismissInvoiceDialog({
  open,
  onOpenChange,
  itemId,
  itemLabel,
  partnerToken,
  onDismissed,
}: Props) {
  const [reason, setReason] = useState("");
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
          body: JSON.stringify({ partnerToken, itemId, reason: reason.trim() }),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Sluiten mislukt");
      }
      toast({ title: "Onderdeel gesloten", description: "Bureau Vlieland ziet uw toelichting." });
      setReason("");
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
          <DialogTitle>Sluiten zonder factuur</DialogTitle>
          <DialogDescription>
            U haalt <span className="font-medium">{itemLabel}</span> van uw werkbank. Gebruik dit als u voor dit onderdeel geen factuur (meer) stuurt, bijvoorbeeld omdat het buiten Bureau Vlieland om is afgehandeld, gratis was of niet is doorgegaan.
          </DialogDescription>
        </DialogHeader>

        <Notice tone="warning">
          <p>Bureau Vlieland ziet uw toelichting in het projectdossier en kan het onderdeel heropenen, zodat u er alsnog een factuur voor registreert.</p>
        </Notice>

        <FormField label="Reden" htmlFor="dismiss-reason" required help={`${reason.length} van 500 tekens`}>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Bijvoorbeeld: gratis proefsessie, direct met de klant afgerekend, niet doorgegaan." rows={4} maxLength={500} />
        </FormField>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Annuleren
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Bezig met sluiten" : "Sluiten"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";
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
          <DialogTitle>Geen factuur — sluiten</DialogTitle>
          <DialogDescription>
            U verwijdert <span className="font-medium">{itemLabel}</span> uit uw werkbank. Gebruik dit
            als u voor dit onderdeel geen factuur (meer) stuurt — bijvoorbeeld omdat het buiten Bureau
            Vlieland om is afgehandeld, gratis was, of niet is doorgegaan.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 flex gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            Bureau Vlieland ziet uw toelichting in het projectdossier. Bij twijfel kan admin het item
            heropenen zodat u er alsnog een factuur voor kunt registreren.
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="dismiss-reason">Reden</Label>
          <Textarea
            id="dismiss-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Bijv. gratis proefsessie, direct met klant afgerekend, niet doorgegaan…"
            rows={4}
            maxLength={500}
          />
          <div className="text-xs text-muted-foreground text-right">{reason.length}/500</div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Annuleren
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Sluiten…" : "Sluiten"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

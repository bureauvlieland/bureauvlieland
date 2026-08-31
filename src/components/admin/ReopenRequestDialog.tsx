/**
 * Heropen een geannuleerde aanvraag.
 *
 * Waarom: annuleren was eenrichtingsverkeer. Meldt een klant zich later toch,
 * dan moest het project handmatig in de database worden teruggezet. Deze dialog
 * doet dat met een verplichte reden en zonder mails te versturen — de admin
 * kiest zelf of daarna een status-mail of offerte uitgaat.
 */
import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface ReopenRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  referenceNumber?: string | null;
  /** ISO-datum (yyyy-mm-dd) van de offertegeldigheid; bepaalt de verleng-optie. */
  quoteValidUntil?: string | null;
  onReopened: () => void;
}

export function ReopenRequestDialog({
  open,
  onOpenChange,
  requestId,
  referenceNumber,
  quoteValidUntil,
  onReopened,
}: ReopenRequestDialogProps) {
  const [reason, setReason] = useState("");
  const [reopenItems, setReopenItems] = useState(true);
  const [extendValidity, setExtendValidity] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const validityExpired = !!quoteValidUntil &&
    new Date(`${quoteValidUntil}T23:59:59`).getTime() < Date.now();

  const submit = async () => {
    if (reason.trim().length < 3) {
      toast.error("Vul een reden van heropening in");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("reopen-program-request", {
        body: {
          requestId,
          reason: reason.trim(),
          reopenItems,
          extendValidity: validityExpired && extendValidity,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(typeof data.error === "string" ? data.error : "Heropenen mislukt");

      const failed = (data?.itemErrors ?? []) as Array<{ block_name: string }>;
      if (failed.length > 0) {
        toast.warning(
          `Aanvraag heropend, maar ${failed.length} onderdeel/onderdelen konden niet terug: ${failed
            .map((f) => f.block_name)
            .join(", ")}`,
        );
      } else {
        toast.success(
          `Aanvraag heropend${data?.itemsReopened ? ` — ${data.itemsReopened} onderdelen terug op 'in afwachting'` : ""}`,
        );
      }
      setReason("");
      onOpenChange(false);
      onReopened();
    } catch (err) {
      toast.error(`Heropenen mislukt: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Aanvraag heropenen{referenceNumber ? ` · ${referenceNumber}` : ""}
          </DialogTitle>
          <DialogDescription>
            De aanvraag wordt weer actief en verdwijnt uit het archief. Er gaat géén mail naar
            de klant of partners — dat doe je daarna zelf via "Stuur status-mail" of
            "Offerte opnieuw versturen".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reopen-reason">Reden van heropening *</Label>
            <Textarea
              id="reopen-reason"
              value={reason}
              maxLength={2000}
              placeholder="Bijv. klant heeft alsnog gereageerd en wil het programma doorzetten"
              onChange={(e) => setReason(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Wordt vastgelegd in de projecthistorie.
            </p>
          </div>

          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={reopenItems}
              onCheckedChange={(v) => setReopenItems(v === true)}
              className="mt-0.5"
            />
            <span>
              Onderdelen mee heropenen
              <span className="block text-xs text-muted-foreground">
                Geannuleerde onderdelen gaan terug naar "in afwachting". Bevestigde en
                uitgevoerde onderdelen blijven ongewijzigd.
              </span>
            </span>
          </label>

          {validityExpired && (
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={extendValidity}
                onCheckedChange={(v) => setExtendValidity(v === true)}
                className="mt-0.5"
              />
              <span>
                Offerte 14 dagen langer geldig maken
                <span className="block text-xs text-muted-foreground">
                  De geldigheid is verlopen; zonder verlenging kan de klant niet akkoord geven.
                </span>
              </span>
            </label>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Annuleren
          </Button>
          <Button onClick={submit} disabled={submitting || reason.trim().length < 3}>
            {submitting ? "Bezig…" : "Heropen aanvraag"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

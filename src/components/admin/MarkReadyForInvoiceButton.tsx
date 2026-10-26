import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface MarkReadyForInvoiceButtonProps {
  programId: string;
  size?: "sm" | "default";
  /** Heeft de klant de voorwaarden ondertekend? Zo niet, dan waarschuwt de dialoog nadrukkelijk. */
  termsAccepted?: boolean;
  onDone?: () => void;
}

export const MarkReadyForInvoiceButton = ({
  programId,
  size = "sm",
  termsAccepted = true,
  onDone,
}: MarkReadyForInvoiceButtonProps) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke(
      "set-project-ready-for-invoice",
      {
        body: { program_id: programId, reason: reason.trim() || undefined },
      },
    );
    setSubmitting(false);
    if (error || (data as any)?.error) {
      toast({
        title: "Kon project niet op facturatie zetten",
        description: error?.message || (data as any)?.error || "Onbekende fout",
        variant: "destructive",
      });
      return;
    }
    const billingMissing = !!(data as { billingMissing?: boolean } | null)?.billingMissing;
    toast({
      title: "Project staat klaar voor facturatie",
      description: billingMissing
        ? "Partners kunnen nu factureren, maar de factuurgegevens van de klant zijn onvolledig. Vul die aan bij het project."
        : "Partners kunnen nu factureren. Een Facturatie-todo is aangemaakt.",
      variant: billingMissing ? "destructive" : undefined,
    });
    setOpen(false);
    setReason("");
    onDone?.();
  };

  return (
    <>
      <Button
        variant="outline"
        size={size}
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <FileCheck className="h-4 w-4" />
        Markeer als klaar voor facturatie
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Project op facturatie zetten?</AlertDialogTitle>
            <AlertDialogDescription>
              Hiermee verschuift het project naar de fase Facturatie en wordt
              er een "Facturatie"-todo aangemaakt. Partners kunnen vanaf dat
              moment hun factuur registreren, ook als de klant de AV nog niet
              via de portal heeft geaccepteerd. Dit wordt met je naam en reden
              in de history vastgelegd. Controleer of de factuurgegevens van de
              klant compleet zijn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {!termsAccepted && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
              De klant heeft de algemene voorwaarden nog niet ondertekend. Zonder
              handtekening gelden de annulerings- en betalingsvoorwaarden niet
              aantoonbaar. Stuur bij voorkeur eerst een ondertekenverzoek en zet
              het project daarna op facturatie.
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm">
              Reden (optioneel, komt in de history)
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Bijv. klant heeft mondeling akkoord gegeven; uitvoering is geweest"
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={submitting}>
              {submitting ? "Bezig…" : "Op facturatie zetten"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

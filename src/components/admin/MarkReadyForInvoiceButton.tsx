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
  onDone?: () => void;
}

export const MarkReadyForInvoiceButton = ({
  programId,
  size = "sm",
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
    toast({
      title: "Project staat klaar voor facturatie",
      description: "Een Facturatie-todo is aangemaakt.",
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
              er een "Facturatie"-todo aangemaakt — ook als de klant de AV nog
              niet via de portal heeft geaccepteerd. Gebruik dit als shortcut
              wanneer de uitvoering al rond is.
            </AlertDialogDescription>
          </AlertDialogHeader>
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

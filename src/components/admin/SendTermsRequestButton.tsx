import { useState } from "react";
import { FileSignature } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface SendTermsRequestButtonProps {
  requestId: string;
  customerEmail: string | null | undefined;
  /** Al getekend: de knop verdwijnt. */
  termsAcceptedAt: string | null | undefined;
  size?: "sm" | "default";
  variant?: "outline" | "default" | "secondary";
  className?: string;
  onDone?: () => void;
}

/**
 * "Ondertekenverzoek sturen": mailt de klant een directe link naar het tabblad
 * Akkoord in het portaal, ongeacht de offertefase. Voor projecten die per mail
 * of telefoon zijn gesloten en waar het portaal de klant dus nooit iets heeft
 * gevraagd (plan klantreis en ondertekening, fase 3).
 */
export const SendTermsRequestButton = ({
  requestId,
  customerEmail,
  termsAcceptedAt,
  size = "sm",
  variant = "outline",
  className,
  onDone,
}: SendTermsRequestButtonProps) => {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (termsAcceptedAt) return null;

  const handleConfirm = async () => {
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("send-terms-request", {
      body: { request_id: requestId },
    });
    setSubmitting(false);
    const serverError = (data as { error?: string } | null)?.error;
    if (error || serverError) {
      toast({
        title: "Ondertekenverzoek niet verstuurd",
        description: serverError || error?.message || "Onbekende fout",
        variant: "destructive",
      });
      return;
    }
    const recipient = (data as { recipient?: string } | null)?.recipient ?? customerEmail ?? "de klant";
    toast({
      title: "Ondertekenverzoek verstuurd",
      description: `De klant (${recipient}) heeft een mail met een directe link naar het tabblad Akkoord.`,
    });
    setOpen(false);
    onDone?.();
  };

  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={() => setOpen(true)}>
        <FileSignature className="mr-1.5 h-4 w-4" />
        Ondertekenverzoek sturen
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ondertekenverzoek sturen?</AlertDialogTitle>
            <AlertDialogDescription>
              De klant{customerEmail ? ` (${customerEmail})` : ""} krijgt een mail met een
              directe link naar het tabblad Akkoord in het portaal, om de voorwaarden te
              ondertekenen. Staat het voorstel nog open, dan vraagt de mail ook om akkoord.
              Onderdelen die nog op een aanbieder wachten, tekent de klant onder voorbehoud.
              De mail komt in het communicatiedossier van het project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={submitting || !customerEmail}>
              {submitting ? "Bezig…" : "Versturen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

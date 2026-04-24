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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SendCommissionInvoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  commissionInvoiceId: string;
  defaultRecipient: string;
  recipientName?: string | null;
  invoiceNumber: string;
  amountInclVat: number;
  /** Async; resolves with the PDF blob to send. */
  onGeneratePdf: () => Promise<Blob | null>;
  onSent?: () => void;
}

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

export const SendCommissionInvoiceDialog = ({
  isOpen,
  onClose,
  commissionInvoiceId,
  defaultRecipient,
  recipientName,
  invoiceNumber,
  amountInclVat,
  onGeneratePdf,
  onSent,
}: SendCommissionInvoiceDialogProps) => {
  const [recipient, setRecipient] = useState(defaultRecipient);
  const [subject, setSubject] = useState(`Commissiefactuur ${invoiceNumber} – Bureau Vlieland`);
  const [message, setMessage] = useState(
    `Beste ${recipientName || "partner"},\n\nIn de bijlage vindt u commissiefactuur ${invoiceNumber}. ` +
      `Wij verzoeken u vriendelijk het bedrag binnen de op de factuur vermelde betaaltermijn over ` +
      `te maken onder vermelding van het factuurnummer.\n\nMet vriendelijke groet,\nBureau Vlieland`
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRecipient(defaultRecipient);
      setSubject(`Commissiefactuur ${invoiceNumber} – Bureau Vlieland`);
      setMessage(
        `Beste ${recipientName || "partner"},\n\nIn de bijlage vindt u commissiefactuur ${invoiceNumber}. ` +
          `Wij verzoeken u vriendelijk het bedrag binnen de op de factuur vermelde betaaltermijn over ` +
          `te maken onder vermelding van het factuurnummer.\n\nMet vriendelijke groet,\nBureau Vlieland`
      );
    }
  }, [isOpen, defaultRecipient, recipientName, invoiceNumber]);

  const handleSend = async () => {
    if (!recipient.trim()) {
      toast.error("Geef een ontvanger op");
      return;
    }
    setIsSubmitting(true);
    try {
      const blob = await onGeneratePdf();
      if (!blob) throw new Error("PDF kon niet worden gegenereerd");
      const base64 = await blobToBase64(blob);

      const { error: fnError } = await supabase.functions.invoke(
        "send-commission-invoice-to-partner",
        {
          body: {
            commissionInvoiceId,
            pdfBase64: base64,
            pdfFilename: `Commissiefactuur-${invoiceNumber}.pdf`,
            recipientEmail: recipient.trim(),
            customSubject: subject.trim() || undefined,
            customMessage: message.trim() || undefined,
          },
        }
      );

      if (fnError) throw fnError;

      toast.success(`Commissiefactuur verstuurd naar ${recipient}`);
      onSent?.();
      onClose();
    } catch (error) {
      console.error("Send commission invoice error:", error);
      toast.error(
        error instanceof Error
          ? `Fout bij versturen: ${error.message}`
          : "Fout bij versturen factuur"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Verstuur commissiefactuur naar partner
          </DialogTitle>
          <DialogDescription>
            De factuur-PDF wordt als bijlage met deze e-mail meegestuurd. De gekoppelde commissies
            worden gemarkeerd als "Gefactureerd".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipient">Ontvanger *</Label>
            <Input
              id="recipient"
              type="email"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="partner@voorbeeld.nl"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Onderwerp</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Bericht</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={7}
              disabled={isSubmitting}
            />
          </div>

          <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Factuurnummer:</span>
              <span className="font-medium">{invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Totaal incl. BTW:</span>
              <span className="font-medium tabular-nums">
                €{amountInclVat.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Annuleren
          </Button>
          <Button onClick={handleSend} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Versturen...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Verstuur
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

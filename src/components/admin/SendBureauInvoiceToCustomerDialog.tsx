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
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Mail } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { InvoiceType } from "@/types/bureauInvoice";

interface SendBureauInvoiceToCustomerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: string;
  defaultRecipient: string;
  recipientName?: string | null;
  invoiceNumber: string;
  invoiceDate: Date;
  amountExclVat: number;
  vatAmount: number;
  invoiceType?: InvoiceType;
  description?: string;
  /** Async; resolves with the PDF blob to send. */
  onGeneratePdf: () => Promise<Blob | null>;
  onSent?: () => void;
}

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // strip the data URL prefix → keep only base64
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

export const SendBureauInvoiceToCustomerDialog = ({
  isOpen,
  onClose,
  requestId,
  defaultRecipient,
  recipientName,
  invoiceNumber,
  invoiceDate,
  amountExclVat,
  vatAmount,
  invoiceType = "partial",
  description,
  onGeneratePdf,
  onSent,
}: SendBureauInvoiceToCustomerDialogProps) => {
  const [recipient, setRecipient] = useState(defaultRecipient);
  const [subject, setSubject] = useState(`Factuur ${invoiceNumber} – Bureau Vlieland`);
  const [message, setMessage] = useState(
    `Beste ${recipientName || "relatie"},\n\nIn de bijlage vindt u factuur ${invoiceNumber}. ` +
      `Wij verzoeken u vriendelijk het bedrag binnen de vermelde betaaltermijn over te maken ` +
      `onder vermelding van het factuurnummer.\n\nMet vriendelijke groet,\nBureau Vlieland`
  );
  const [alsoRegister, setAlsoRegister] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRecipient(defaultRecipient);
      setSubject(`Factuur ${invoiceNumber} – Bureau Vlieland`);
      setMessage(
        `Beste ${recipientName || "relatie"},\n\nIn de bijlage vindt u factuur ${invoiceNumber}. ` +
          `Wij verzoeken u vriendelijk het bedrag binnen de vermelde betaaltermijn over te maken ` +
          `onder vermelding van het factuurnummer.\n\nMet vriendelijke groet,\nBureau Vlieland`
      );
      setAlsoRegister(true);
    }
  }, [isOpen, defaultRecipient, recipientName, invoiceNumber]);

  const totalInclVat = amountExclVat + vatAmount;

  const handleSend = async () => {
    if (!recipient.trim()) {
      toast.error("Geef een ontvanger op");
      return;
    }
    if (!invoiceNumber.trim()) {
      toast.error("Factuurnummer is verplicht");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Generate PDF
      const blob = await onGeneratePdf();
      if (!blob) throw new Error("PDF kon niet worden gegenereerd");
      const base64 = await blobToBase64(blob);

      // 2. Optionally register the invoice first → returns id we can pass along
      let invoiceId: string | null = null;
      if (alsoRegister) {
        const { data: session } = await supabase.auth.getSession();
        const { data: inserted, error: insertError } = await supabase
          .from("bureau_invoices")
          .insert({
            request_id: requestId,
            invoice_number: invoiceNumber,
            invoice_date: format(invoiceDate, "yyyy-MM-dd"),
            amount_excl_vat: amountExclVat,
            vat_amount: vatAmount,
            invoice_type: invoiceType,
            description: description || null,
            created_by: session.session?.user.id,
          })
          .select("id")
          .single();

        if (insertError) {
          if (insertError.message?.toLowerCase().includes("duplicate")) {
            toast.error(`Factuurnummer ${invoiceNumber} bestaat al`);
            setIsSubmitting(false);
            return;
          }
          throw insertError;
        }
        invoiceId = inserted?.id ?? null;

        await supabase.from("program_request_history").insert({
          request_id: requestId,
          action: `Bureau Vlieland factuur geregistreerd: ${invoiceNumber}`,
          actor: "admin",
          actor_name: "Bureau Vlieland",
          new_value: {
            invoice_number: invoiceNumber,
            amount_incl_vat: totalInclVat,
            type: invoiceType,
          },
        });
      }

      // 3. Send to customer
      const { error: fnError } = await supabase.functions.invoke(
        "send-bureau-invoice-to-customer",
        {
          body: {
            requestId,
            pdfBase64: base64,
            pdfFilename: `Factuur-${invoiceNumber}.pdf`,
            invoiceNumber,
            invoiceDate: format(invoiceDate, "yyyy-MM-dd"),
            amountInclVat: totalInclVat,
            invoiceId,
            recipientEmail: recipient.trim(),
            customSubject: subject.trim() || undefined,
            customMessage: message.trim() || undefined,
          },
        }
      );

      if (fnError) throw fnError;

      toast.success(`Factuur verstuurd naar ${recipient}`);
      onSent?.();
      onClose();
    } catch (error) {
      console.error("Send invoice to customer error:", error);
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
            Verstuur factuur naar klant
          </DialogTitle>
          <DialogDescription>
            De factuur-PDF wordt als bijlage met deze e-mail meegestuurd.
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
              placeholder="klant@voorbeeld.nl"
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
                €{totalInclVat.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="alsoRegister"
              checked={alsoRegister}
              onCheckedChange={(v) => setAlsoRegister(!!v)}
              disabled={isSubmitting}
            />
            <div className="space-y-0.5">
              <Label htmlFor="alsoRegister" className="cursor-pointer">
                Factuur ook registreren in administratie
              </Label>
              <p className="text-xs text-muted-foreground">
                Voegt de factuur toe aan het Financieel Overzicht zodat je 'm later naar Snelstart kunt doorsturen.
              </p>
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

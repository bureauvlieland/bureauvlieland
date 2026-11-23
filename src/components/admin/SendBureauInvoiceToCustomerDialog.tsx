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
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { storesFullProforma } from "@/lib/proforma";
import { markProformaRegistered } from "@/hooks/useProformaChanges";
import { toast } from "sonner";
import type { InvoiceType } from "@/types/bureauInvoice";
import { reportError } from "@/lib/errorReporting";
import type { StoredInvoiceLineInput } from "@/lib/bureauInvoiceLines";
import { INVOICE_NUMBER_PENDING_LABEL, INVOICE_NUMBER_PLACEHOLDER } from "@/lib/invoiceNumber";
import { registerBureauInvoice } from "@/lib/registerBureauInvoice";

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
  /** Existing registered invoice to send; when set, do not insert a duplicate row. */
  existingInvoiceId?: string | null;
  /** Regels die bij registreren worden bevroren bij de factuur (`bureau_invoice_lines`). */
  linesToStore?: StoredInvoiceLineInput[];
  /** De proforma waar `linesToStore` van komt; dekt de factuur haar helemaal, dan wordt zij geregistreerd. */
  proformaId?: string | null;
  /**
   * Async; resolves with the PDF blob to send. Krijgt het factuurnummer mee:
   * bij een nieuwe factuur kent de database dat pas toe bij registreren, en
   * de pdf moet het dragen.
   */
  onGeneratePdf: (invoiceNumber: string, invoiceId: string | null) => Promise<Blob | null>;
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
  existingInvoiceId = null,
  linesToStore = [],
  proformaId = null,
  onGeneratePdf,
  onSent,
}: SendBureauInvoiceToCustomerDialogProps) => {
  const [recipient, setRecipient] = useState(defaultRecipient);
  // Nieuwe factuur: het nummer komt pas bij registreren; in onderwerp en
  // tekst staat tot die tijd {{nummer}}, dat we na toekenning vervangen.
  const numberToken = invoiceNumber || INVOICE_NUMBER_PLACEHOLDER;
  const [subject, setSubject] = useState(`Factuur ${numberToken} – Bureau Vlieland`);
  const [message, setMessage] = useState(
    `Beste ${recipientName || "relatie"},\n\nIn de bijlage vindt u factuur ${numberToken}. ` +
      `Wij verzoeken u vriendelijk het bedrag binnen de vermelde betaaltermijn over te maken ` +
      `onder vermelding van het factuurnummer.\n\nMet vriendelijke groet,\nBureau Vlieland`
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRecipient(defaultRecipient);
      setSubject(`Factuur ${numberToken} – Bureau Vlieland`);
      setMessage(
        `Beste ${recipientName || "relatie"},\n\nIn de bijlage vindt u factuur ${numberToken}. ` +
          `Wij verzoeken u vriendelijk het bedrag binnen de vermelde betaaltermijn over te maken ` +
          `onder vermelding van het factuurnummer.\n\nMet vriendelijke groet,\nBureau Vlieland`
      );
    }
  }, [isOpen, defaultRecipient, recipientName, numberToken, existingInvoiceId]);

  const totalInclVat = amountExclVat + vatAmount;

  const handleSend = async () => {
    if (!recipient.trim()) {
      toast.error("Geef een ontvanger op");
      return;
    }
    if (existingInvoiceId && !invoiceNumber.trim()) {
      toast.error("Factuurnummer is verplicht");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Registreren: de database kent het nummer toe (jaarreeks JJNNNN) en
      //    slaat kop en regels in één transactie op. Pas daarna kan de pdf
      //    worden gemaakt, want die draagt het nummer.
      let invoiceId: string | null = existingInvoiceId;
      let assignedNumber = invoiceNumber;
      if (!existingInvoiceId) {
        const registered = await registerBureauInvoice({
          header: {
            request_id: requestId,
            invoice_date: format(invoiceDate, "yyyy-MM-dd"),
            amount_excl_vat: amountExclVat,
            vat_amount: vatAmount,
            invoice_type: invoiceType,
            description: description || null,
          },
          lines: linesToStore,
        });
        if (!registered.ok || !registered.id || !registered.invoiceNumber) {
          toast.error(registered.message ?? "Factuur registreren mislukt");
          setIsSubmitting(false);
          return;
        }
        invoiceId = registered.id;
        assignedNumber = registered.invoiceNumber;

        if (proformaId && storesFullProforma(linesToStore)) {
          await markProformaRegistered(proformaId, registered.id);
        }

        await supabase.from("program_request_history").insert({
          request_id: requestId,
          action: `Bureau Vlieland factuur geregistreerd: ${assignedNumber}`,
          actor: "admin",
          actor_name: "Bureau Vlieland",
          new_value: {
            invoice_number: assignedNumber,
            amount_incl_vat: totalInclVat,
            type: invoiceType,
          },
        });
      }

      // 2. PDF met het toegekende nummer
      const blob = await onGeneratePdf(assignedNumber, invoiceId);
      if (!blob) throw new Error("PDF kon niet worden gegenereerd");
      const base64 = await blobToBase64(blob);
      const fillNumber = (text: string) => text.split(INVOICE_NUMBER_PLACEHOLDER).join(assignedNumber);

      // 3. Send to customer
      const { error: fnError } = await supabase.functions.invoke(
        "send-bureau-invoice-to-customer",
        {
          body: {
            requestId,
            pdfBase64: base64,
            pdfFilename: `Factuur-${assignedNumber}.pdf`,
            invoiceNumber: assignedNumber,
            invoiceDate: format(invoiceDate, "yyyy-MM-dd"),
            amountInclVat: totalInclVat,
            invoiceId,
            forceResend: Boolean(existingInvoiceId),
            recipientEmail: recipient.trim(),
            customSubject: fillNumber(subject.trim()) || undefined,
            customMessage: fillNumber(message.trim()) || undefined,
          },
        }
      );

      if (fnError) throw fnError;

      // 4. Archive PDF in storage so it can be re-downloaded later
      if (invoiceId) {
        try {
          const pdfPath = `${requestId}/${assignedNumber}.pdf`;
          const { error: uploadErr } = await supabase.storage
            .from("bureau-invoices")
            .upload(pdfPath, blob, {
              contentType: "application/pdf",
              upsert: true,
            });
          if (uploadErr) {
            reportError(uploadErr, { where: "SendBureauInvoiceToCustomerDialog: PDF archive upload failed" });
          } else {
            await supabase
              .from("bureau_invoices")
              .update({ pdf_path: pdfPath })
              .eq("id", invoiceId);
          }
        } catch (archiveErr) {
          reportError(archiveErr, { where: "SendBureauInvoiceToCustomerDialog: PDF archive error" });
        }
      }

      toast.success(`Factuur verstuurd naar ${recipient}`);
      onSent?.();
      onClose();
    } catch (error) {
      reportError(error, { where: "SendBureauInvoiceToCustomerDialog: Send invoice to customer error" });
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
              <span className="font-medium">{invoiceNumber || INVOICE_NUMBER_PENDING_LABEL}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Totaal incl. BTW:</span>
              <span className="font-medium tabular-nums">
                €{totalInclVat.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {existingInvoiceId ? (
            <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900">
              Deze factuur is al geregistreerd; hij wordt opnieuw naar de klant verstuurd zonder dubbele factuurregel.
            </div>
          ) : (
            <div className="rounded-md bg-muted/40 border p-3 text-xs text-muted-foreground">
              Bij versturen wordt de factuur geregistreerd en krijgt zij het volgende nummer uit de
              jaarreeks (bijvoorbeeld 260041). Dat nummer komt op de pdf, in het onderwerp en in de
              tekst op de plek van {INVOICE_NUMBER_PLACEHOLDER}.
            </div>
          )}
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

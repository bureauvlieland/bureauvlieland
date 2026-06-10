import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Mail, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAppSettings } from "@/hooks/useAppSettings";
import type { PurchaseInvoiceWithRelations } from "@/types/purchaseInvoice";

type SendMethod = "outlook" | "mailjet";

interface ForwardToAccountingDialogProps {
  invoice: PurchaseInvoiceWithRelations | null;
  defaultMethod?: SendMethod;
  onClose: () => void;
}

export function ForwardToAccountingDialog({ invoice, defaultMethod = "outlook", onClose }: ForwardToAccountingDialogProps) {
  const [includePdf, setIncludePdf] = useState(true);
  const [method, setMethod] = useState<SendMethod>(defaultMethod);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { getSetting } = useAppSettings();

  useEffect(() => {
    if (invoice) setMethod(defaultMethod);
  }, [invoice, defaultMethod]);

  const snelstartEmail = getSetting("snelstart_email", "bureauvlieland@boekhouding.nl");

  const handleForward = async () => {
    if (!invoice) return;

    setIsSubmitting(true);
    try {
      const fnName = method === "outlook"
        ? "forward-purchase-invoice-outlook"
        : "forward-purchase-invoice";

      const { error } = await supabase.functions.invoke(fnName, {
        body: {
          invoiceId: invoice.id,
          includePdf: includePdf && !!invoice.file_path,
        },
      });

      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();

      await supabase
        .from("partner_purchase_invoices")
        .update({
          status: "forwarded",
          forwarded_to_accounting_at: new Date().toISOString(),
          forwarded_by: user?.id || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoice.id);

      queryClient.invalidateQueries({ queryKey: ["purchase-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-forward-history", invoice.id] });
      toast.success(
        method === "outlook"
          ? "Factuur verstuurd via Outlook"
          : "Factuur verstuurd via Mailjet",
      );
      onClose();
    } catch (error: any) {
      console.error("Error forwarding invoice:", error);
      toast.error(`Fout bij doorsturen: ${error?.message || "onbekend"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!invoice) return null;

  return (
    <Dialog open={!!invoice} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Doorsturen naar boekhouding
          </DialogTitle>
          <DialogDescription>
            De volgende factuurgegevens worden doorgestuurd naar:
            <span className="block font-medium text-foreground mt-1">
              📧 {snelstartEmail}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Verzendmethode</Label>
          <RadioGroup value={method} onValueChange={(v) => setMethod(v as SendMethod)} className="gap-2">
            <label className="flex items-start gap-2 rounded-md border p-2 cursor-pointer hover:bg-accent/50">
              <RadioGroupItem value="outlook" id="m-outlook" className="mt-0.5" />
              <div className="text-sm">
                <div className="font-medium">Outlook (aanbevolen)</div>
                <div className="text-xs text-muted-foreground">
                  Verstuurt vanuit jouw Microsoft 365 mailbox. Snelstart herkent dit als normale zakelijke mail.
                </div>
              </div>
            </label>
            <label className="flex items-start gap-2 rounded-md border p-2 cursor-pointer hover:bg-accent/50">
              <RadioGroupItem value="mailjet" id="m-mailjet" className="mt-0.5" />
              <div className="text-sm">
                <div className="font-medium">Mailjet</div>
                <div className="text-xs text-muted-foreground">
                  Verstuurt via Mailjet (transactional). Snelstart filtert dit soms als bulk.
                </div>
              </div>
            </label>
          </RadioGroup>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Leverancier:</span>
            <span className="font-medium">{invoice.partner?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Factuurnummer:</span>
            <span className="font-medium">{invoice.invoice_number}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Datum:</span>
            <span>{format(new Date(invoice.invoice_date), "d MMMM yyyy", { locale: nl })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Totaal:</span>
            <span className="font-medium">€{Number(invoice.amount_incl_vat).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Project:</span>
            <span>{invoice.program_request?.reference_number || "Geen ref"}</span>
          </div>
        </div>

        {invoice.file_path && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id="include-pdf"
              checked={includePdf}
              onCheckedChange={(checked) => setIncludePdf(!!checked)}
            />
            <Label htmlFor="include-pdf" className="flex items-center gap-2 text-sm cursor-pointer">
              <FileText className="h-4 w-4" />
              Inclusief PDF bijlage
            </Label>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Annuleren
          </Button>
          <Button onClick={handleForward} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Bezig...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Versturen via {method === "outlook" ? "Outlook" : "Mailjet"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

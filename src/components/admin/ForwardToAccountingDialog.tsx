import { useState } from "react";
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
import { Mail, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAppSettings } from "@/hooks/useAppSettings";
import type { PurchaseInvoiceWithRelations } from "@/types/purchaseInvoice";

interface ForwardToAccountingDialogProps {
  invoice: PurchaseInvoiceWithRelations | null;
  onClose: () => void;
}

export function ForwardToAccountingDialog({ invoice, onClose }: ForwardToAccountingDialogProps) {
  const [includePdf, setIncludePdf] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { getSetting } = useAppSettings();

  const snelstartEmail = getSetting("snelstart_email", "bureauvlieland@boekhouding.nl");

  const handleForward = async () => {
    if (!invoice) return;

    setIsSubmitting(true);
    try {
      // Call edge function to send email
      const { error } = await supabase.functions.invoke("forward-purchase-invoice", {
        body: {
          invoiceId: invoice.id,
          includePdf: includePdf && !!invoice.file_path,
        },
      });

      if (error) throw error;

      // Update invoice status
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
      toast.success("Factuur doorgestuurd naar boekhouding");
      onClose();
    } catch (error) {
      console.error("Error forwarding invoice:", error);
      toast.error("Fout bij doorsturen factuur");
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
            <span className="text-muted-foreground">Bedrag excl:</span>
            <span className="font-medium">€{Number(invoice.amount_excl_vat).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">BTW ({invoice.vat_rate}%):</span>
            <span>€{Number(invoice.vat_amount).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Totaal:</span>
            <span className="font-medium">€{Number(invoice.amount_incl_vat).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Project:</span>
            <span>{invoice.program_request?.reference_number || "Geen ref"}</span>
          </div>
          {invoice.description && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Omschrijving:</span>
              <span className="text-right max-w-[200px] truncate">{invoice.description}</span>
            </div>
          )}
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
                Doorsturen
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

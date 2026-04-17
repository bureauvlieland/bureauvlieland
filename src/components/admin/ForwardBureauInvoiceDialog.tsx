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
import { Mail, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAppSettings } from "@/hooks/useAppSettings";
import { invoiceTypeLabels, type InvoiceType } from "@/types/bureauInvoice";

export interface BureauInvoiceForForward {
  id: string;
  invoice_number: string;
  invoice_date: string;
  amount_excl_vat: number;
  vat_amount: number;
  amount_incl_vat?: number | null;
  invoice_type: InvoiceType | string;
  description?: string | null;
  customer_label: string;
  reference_number?: string | null;
}

interface ForwardBureauInvoiceDialogProps {
  invoice: BureauInvoiceForForward | null;
  onClose: () => void;
}

export function ForwardBureauInvoiceDialog({ invoice, onClose }: ForwardBureauInvoiceDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { getSetting } = useAppSettings();

  const snelstartEmail = getSetting("snelstart_email", "bureauvlieland@boekhouding.nl");

  const handleForward = async () => {
    if (!invoice) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("forward-bureau-invoice", {
        body: { invoiceId: invoice.id },
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["admin-invoicing-requests"] });
      queryClient.invalidateQueries({ queryKey: ["bureau-invoices"] });
      toast.success("Verkoopfactuur doorgestuurd naar boekhouding");
      onClose();
    } catch (error) {
      console.error("Error forwarding bureau invoice:", error);
      toast.error("Fout bij doorsturen verkoopfactuur");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!invoice) return null;

  const totalIncl =
    invoice.amount_incl_vat ?? Number(invoice.amount_excl_vat) + Number(invoice.vat_amount);
  const typeLabel =
    invoiceTypeLabels[invoice.invoice_type as InvoiceType] || invoice.invoice_type;

  return (
    <Dialog open={!!invoice} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Verkoopfactuur doorsturen
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
            <span className="text-muted-foreground">Klant:</span>
            <span className="font-medium">{invoice.customer_label}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Factuurnummer:</span>
            <span className="font-medium">{invoice.invoice_number}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Type:</span>
            <span>{typeLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Datum:</span>
            <span>{format(new Date(invoice.invoice_date), "d MMMM yyyy", { locale: nl })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Bedrag excl:</span>
            <span className="font-medium">
              €{Number(invoice.amount_excl_vat).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">BTW:</span>
            <span>
              €{Number(invoice.vat_amount).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Totaal:</span>
            <span className="font-medium">
              €{totalIncl.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Project:</span>
            <span>{invoice.reference_number || "Geen ref"}</span>
          </div>
          {invoice.description && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Omschrijving:</span>
              <span className="text-right max-w-[200px] truncate">{invoice.description}</span>
            </div>
          )}
        </div>

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

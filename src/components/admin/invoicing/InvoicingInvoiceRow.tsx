import { Download, FileText, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/system";
import { supabase } from "@/integrations/supabase/client";
import { isInvoiceForwarded } from "@/lib/adminInvoicingView";
import { formatCurrency } from "./formatCurrency";
import type { InvoicingInvoice } from "./types";

interface Props {
  requestId: string;
  invoice: InvoicingInvoice;
}

/** Eén geregistreerde factuur met PDF- en doorstuurknop. */
export const InvoicingInvoiceRow = ({ requestId, invoice }: Props) => {
  const navigate = useNavigate();
  const forwarded = isInvoiceForwarded(invoice);
  const totalIncl = invoice.amount_incl_vat ?? invoice.amount_excl_vat + invoice.vat_amount;

  const openPdf = async () => {
    const { data, error } = await supabase.storage
      .from("bureau-invoices")
      .createSignedUrl(invoice.pdf_path!, 300);
    if (error || !data?.signedUrl) {
      toast.error("Kon PDF niet ophalen");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2 text-sm">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="font-medium">{invoice.invoice_number}</span>
        <span className="text-muted-foreground">· {formatCurrency(totalIncl)}</span>
        {Array.isArray(invoice.vat_breakdown) && invoice.vat_breakdown.length > 0 && (
          <span className="text-xs text-muted-foreground">
            · {invoice.vat_breakdown.map((line) => `${line.rate}%: ${formatCurrency(line.vatAmount)}`).join(" · ")}
          </span>
        )}
        {forwarded ? (
          <Pill tone="success">Doorgestuurd</Pill>
        ) : (
          <Pill tone="warning">Nog niet doorgestuurd</Pill>
        )}
      </div>
      <div className="flex items-center gap-2">
        {invoice.pdf_path ? (
          <Button size="sm" variant="ghost" className="gap-2" onClick={openPdf}>
            <Download className="h-3.5 w-3.5" />
            PDF
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="gap-2"
            title="Origineel PDF niet gearchiveerd — open de factuur om opnieuw te genereren"
            onClick={() => navigate(`/admin/projecten/${requestId}/factuur?invoiceId=${invoice.id}`)}
          >
            <Download className="h-3.5 w-3.5" />
            PDF genereren
          </Button>
        )}
        {!forwarded && (
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() =>
              navigate(`/admin/projecten/${requestId}/factuur?action=forward&invoiceId=${invoice.id}`)
            }
          >
            <Mail className="h-3.5 w-3.5" />
            Doorsturen naar boekhouding
          </Button>
        )}
      </div>
    </div>
  );
};

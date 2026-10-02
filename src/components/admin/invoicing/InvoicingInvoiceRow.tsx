import { useState } from "react";
import { CheckCircle2, Download, FileText, Loader2, Mail } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
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
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
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

  /** Factuur is buiten het systeem om in Snelstart gemaakt: direct als afgehandeld markeren. */
  const markHandledExternally = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("bureau_invoices")
        .update({
          status: "forwarded",
          forwarded_to_accounting_at: new Date().toISOString(),
          forwarded_by: user?.id ?? null,
        })
        .eq("id", invoice.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["admin-invoicing-requests"] });
      queryClient.invalidateQueries({ queryKey: ["invoicing-ready-count"] });
      toast.success("Factuur gemarkeerd als afgehandeld");
      setConfirmOpen(false);
    } catch (error: any) {
      toast.error(`Markeren mislukt: ${error?.message || "onbekend"}`);
    } finally {
      setSaving(false);
    }
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
            variant="ghost"
            className="gap-2"
            title="Al buiten het systeem in Snelstart verwerkt"
            onClick={() => setConfirmOpen(true)}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Al verwerkt
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
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Factuur al verwerkt in Snelstart?</AlertDialogTitle>
            <AlertDialogDescription>
              Factuur {invoice.invoice_number} wordt als afgehandeld gemarkeerd, zonder e-mail naar de
              boekhouding. Het project verdwijnt dan uit "Door te sturen".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              onClick={(event) => {
                event.preventDefault();
                void markHandledExternally();
              }}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Markeer als afgehandeld
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

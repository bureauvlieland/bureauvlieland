import { useMemo, useState } from "react";
import { Mail, AlertTriangle, Loader2 } from "lucide-react";
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
import { toast } from "sonner";
import type { PurchaseInvoiceWithRelations } from "@/types/purchaseInvoice";

interface Props {
  invoices: PurchaseInvoiceWithRelations[];
}

export function MissingPdfReminderButton({ invoices }: Props) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { partnerCount, invoiceCount } = useMemo(() => {
    const missing = invoices.filter((i) => !i.file_path);
    const partners = new Set(missing.map((i) => i.partner_id));
    return { partnerCount: partners.size, invoiceCount: missing.length };
  }, [invoices]);

  const handleSend = async () => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "notify-partners-missing-invoice-pdf",
        { body: { mode: "bulk", origin: window.location.origin } },
      );
      if (error) throw error;
      toast.success(
        `Reminder verstuurd naar ${data?.partners_notified ?? 0} partner(s) — ${data?.invoices_referenced ?? 0} factu(u)r(en) genoemd.`,
      );
      setOpen(false);
    } catch (e: any) {
      console.error(e);
      toast.error(`Versturen mislukt: ${e?.message || "onbekende fout"}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (invoiceCount === 0) return null;

  return (
    <>
      <Button
        variant="outline"
        className="border-destructive/40 text-destructive hover:bg-destructive/10"
        onClick={() => setOpen(true)}
      >
        <Mail className="h-4 w-4 mr-2" />
        Reminder ontbrekende PDF's ({invoiceCount})
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Reminder versturen naar partners
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  Er worden <strong>{partnerCount}</strong> partner(s) ge-e-maild
                  over <strong>{invoiceCount}</strong> inkoopfactu(u)r(en) zonder
                  PDF-bijlage.
                </p>
                <p>
                  Elke partner ontvangt één e-mail met de boodschap dat we hun
                  factu(u)r(en) niet in behandeling kunnen nemen zonder PDF, en
                  een directe link naar het partnerportaal.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleSend} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Verstuur reminder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

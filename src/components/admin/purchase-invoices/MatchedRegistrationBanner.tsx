import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link2, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { normalizeInvoiceNumber } from "@/lib/purchaseInvoiceDuplicateCheck";
import type { PurchaseInvoiceInboxItem } from "@/types/purchaseInvoiceInbox";

interface MatchRow {
  id: string;
  invoice_number: string;
  invoice_date: string;
  amount_incl_vat: number | null;
  amount_excl_vat: number;
  status: string;
  description: string | null;
  file_path: string | null;
  partner_id: string;
  request_id: string | null;
  item_id: string | null;
  partner: { name: string } | null;
  program_request: { reference_number: string | null; customer_company: string | null; customer_name: string | null } | null;
}

interface Props {
  item: PurchaseInvoiceInboxItem;
  onLinked: (invoiceId: string) => void | Promise<void>;
}

/**
 * Looks up partner_purchase_invoices that match the scanned invoice number.
 * Used to detect partner "via e-mail"–registraties zonder PDF, zodat de admin
 * de PDF uit de inbox met 1 klik kan koppelen i.p.v. dubbel te boeken.
 */
export function MatchedRegistrationBanner({ item, onLinked }: Props) {
  const queryClient = useQueryClient();
  const [linkingId, setLinkingId] = useState<string | null>(null);

  const scanInvoiceNumber = item.scan_result?.invoice_number || "";
  const normalized = normalizeInvoiceNumber(scanInvoiceNumber);
  const supplierName = (item.scan_result?.supplier_name || "").toLowerCase().trim();

  const { data: matches } = useQuery({
    queryKey: ["inbox-match", item.id, normalized, supplierName],
    enabled: !!normalized && normalized.length >= 3 && item.status === "new",
    queryFn: async (): Promise<MatchRow[]> => {
      // Pull candidates by date proximity; filter normalized client-side.
      const { data, error } = await supabase
        .from("partner_purchase_invoices")
        .select(
          `id, invoice_number, invoice_date, amount_incl_vat, amount_excl_vat, status, description, file_path,
           partner_id, request_id, item_id,
           partner:partners!partner_purchase_invoices_partner_id_fkey(name),
           program_request:program_requests!partner_purchase_invoices_request_id_fkey(reference_number, customer_company, customer_name)`,
        )
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) {
        console.error("Match lookup failed:", error);
        return [];
      }
      const all = (data || []) as unknown as MatchRow[];
      const exact = all.filter((r) => normalizeInvoiceNumber(r.invoice_number) === normalized);
      if (exact.length === 0) return [];
      // If supplier hint, prefer rows with matching partner name; otherwise show all.
      if (supplierName) {
        const supplierMatches = exact.filter((r) => {
          const pname = (r.partner?.name || "").toLowerCase();
          return pname && (pname.includes(supplierName) || supplierName.includes(pname));
        });
        if (supplierMatches.length > 0) return supplierMatches;
      }
      return exact;
    },
  });

  if (!matches || matches.length === 0) return null;

  const handleLink = async (match: MatchRow) => {
    if (!item.attachment_path) {
      toast.error("Geen PDF-bijlage in dit inbox-item");
      return;
    }
    setLinkingId(match.id);
    try {
      const { error: updErr } = await supabase
        .from("partner_purchase_invoices")
        .update({ file_path: item.attachment_path, updated_at: new Date().toISOString() })
        .eq("id", match.id);
      if (updErr) throw updErr;

      if (match.item_id) {
        await supabase
          .from("program_request_items")
          .update({ invoiced_file_path: item.attachment_path, updated_at: new Date().toISOString() })
          .eq("id", match.item_id);
      }

      await onLinked(match.id);
      queryClient.invalidateQueries({ queryKey: ["purchase-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-invoice-inbox"] });
      toast.success("PDF gekoppeld aan bestaande registratie");
    } catch (err) {
      console.error("Link PDF failed:", err);
      toast.error("Koppelen mislukt");
    } finally {
      setLinkingId(null);
    }
  };

  return (
    <div className="rounded-md border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 p-3 space-y-2">
      <div className="flex items-start gap-2 text-sm text-blue-900 dark:text-blue-100">
        <Link2 className="h-4 w-4 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium">
            {matches.length === 1
              ? "Deze factuur is al door de partner geregistreerd"
              : `${matches.length} bestaande registraties gevonden met dit factuurnummer`}
          </p>
          <p className="text-xs mt-0.5 text-blue-800 dark:text-blue-200">
            Koppel de PDF aan de bestaande registratie i.p.v. een nieuwe inkoopfactuur aan te maken.
          </p>
        </div>
      </div>
      <div className="space-y-2">
        {matches.map((m) => {
          const hasPdf = !!m.file_path;
          return (
            <div
              key={m.id}
              className="flex items-center justify-between gap-3 rounded border border-blue-200/70 bg-background/60 p-2"
            >
              <div className="flex-1 min-w-0 text-xs">
                <div className="font-medium">
                  {m.partner?.name || "Onbekende partner"} · #{m.invoice_number}
                </div>
                <div className="text-muted-foreground truncate">
                  {format(new Date(m.invoice_date), "d MMM yyyy", { locale: nl })} ·{" "}
                  {m.program_request?.reference_number || "geen ref"} —{" "}
                  {m.program_request?.customer_company || m.program_request?.customer_name || "—"} · €
                  {Number(m.amount_incl_vat ?? m.amount_excl_vat).toLocaleString("nl-NL", {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </div>
              {hasPdf ? (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 shrink-0">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> PDF al gekoppeld
                </Badge>
              ) : (
                <Button
                  size="sm"
                  onClick={() => handleLink(m)}
                  disabled={linkingId === m.id || !item.attachment_path}
                >
                  {linkingId === m.id ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Link2 className="h-3 w-3 mr-1" />
                  )}
                  PDF koppelen
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

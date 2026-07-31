import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  findOrphanInvoicedItems,
  type InvoicedItemRef,
} from "@/lib/purchaseInvoiceConsistency";

/**
 * Toont onderdelen met een factuurnummer waar géén inkoopfactuur bij hoort.
 * Sinds de sync-trigger kan dit alleen nog bij historische registraties voorkomen.
 */
export function InvoiceConsistencyPanel() {
  const { data } = useQuery({
    queryKey: ["purchase-invoice-consistency"],
    queryFn: async () => {
      const [itemsRes, allocRes, headerRes] = await Promise.all([
        supabase
          .from("program_request_items")
          .select("id, request_id, block_name, invoiced_number, invoiced_amount, invoiced_date, provider_id")
          .not("invoiced_number", "is", null),
        supabase.from("partner_purchase_invoice_allocations").select("item_id"),
        supabase.from("partner_purchase_invoices").select("item_id").not("item_id", "is", null),
      ]);

      const linked = [
        ...((allocRes.data ?? []).map((a) => a.item_id as string)),
        ...((headerRes.data ?? []).map((h) => h.item_id as string)),
      ].filter(Boolean);

      return findOrphanInvoicedItems((itemsRes.data ?? []) as InvoicedItemRef[], linked);
    },
    staleTime: 60_000,
  });

  if (!data || data.length === 0) return null;

  return (
    <Alert className="border-amber-300 bg-amber-50/70">
      <AlertTriangle className="h-4 w-4 text-amber-700" />
      <AlertTitle className="text-amber-900">
        Afwijkingen ({data.length})
      </AlertTitle>
      <AlertDescription className="text-amber-900/90">
        <p className="mb-2 text-sm">
          Deze onderdelen hebben wel een factuurnummer, maar er staat geen inkoopfactuur
          tegenover. Registreer de factuur alsnog of maak het nummer leeg op het onderdeel.
        </p>
        <ul className="space-y-1">
          {data.slice(0, 10).map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate">
                <span className="font-medium">{o.block_name || "Onderdeel"}</span>
                {" · "}
                <span className="tabular-nums">{o.invoiced_number}</span>
                {o.invoiced_amount != null && (
                  <span className="tabular-nums">
                    {" · €"}
                    {Number(o.invoiced_amount).toLocaleString("nl-NL", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                )}
              </span>
              {o.request_id && (
                <Button asChild size="sm" variant="outline">
                  <Link to={`/admin/projecten/${o.request_id}`}>Openen</Link>
                </Button>
              )}
            </li>
          ))}
        </ul>
        {data.length > 10 && (
          <p className="mt-2 text-xs">en nog {data.length - 10} andere…</p>
        )}
      </AlertDescription>
    </Alert>
  );
}

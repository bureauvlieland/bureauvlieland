import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  findOrphanInvoicedItems,
  type InvoicedItemRef,
  type OrphanInvoicedItem,
  type PurchaseInvoiceRef,
} from "@/lib/purchaseInvoiceConsistency";

/**
 * Toont onderdelen met een factuurnummer waar géén inkoopfactuur bij hoort.
 * Dekking wordt vastgesteld via onderdeel-koppeling, allocatie én via een
 * factuurrij met hetzelfde nummer bij dezelfde leverancier (projectniveau /
 * verzamelfactuur). Placeholder-nummers ("nvt", "-") worden genegeerd.
 */
export function InvoiceConsistencyPanel() {
  const queryClient = useQueryClient();
  const [pendingClear, setPendingClear] = useState<OrphanInvoicedItem | null>(null);

  const { data } = useQuery({
    queryKey: ["purchase-invoice-consistency"],
    queryFn: async () => {
      const [itemsRes, allocRes, headerRes, invoicesRes] = await Promise.all([
        supabase
          .from("program_request_items")
          .select(
            "id, request_id, block_name, invoiced_number, invoiced_amount, invoiced_date, provider_id, program_requests(reference_number)",
          )
          .not("invoiced_number", "is", null),
        supabase.from("partner_purchase_invoice_allocations").select("item_id"),
        supabase.from("partner_purchase_invoices").select("item_id").not("item_id", "is", null),
        supabase
          .from("partner_purchase_invoices")
          .select("partner_id, invoice_number, invoice_number_normalized"),
      ]);

      const linked = [
        ...((allocRes.data ?? []).map((a) => a.item_id as string)),
        ...((headerRes.data ?? []).map((h) => h.item_id as string)),
      ].filter(Boolean);

      const items = ((itemsRes.data ?? []) as any[]).map((row) => ({
        id: row.id,
        request_id: row.request_id,
        block_name: row.block_name,
        invoiced_number: row.invoiced_number,
        invoiced_amount: row.invoiced_amount,
        invoiced_date: row.invoiced_date,
        provider_id: row.provider_id,
        reference_number: row.program_requests?.reference_number ?? null,
      })) as InvoicedItemRef[];

      return findOrphanInvoicedItems(
        items,
        linked,
        (invoicesRes.data ?? []) as PurchaseInvoiceRef[],
      );
    },
    staleTime: 60_000,
  });

  const clearNumber = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("program_request_items")
        .update({ invoiced_number: null })
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Factuurnummer gewist");
      queryClient.invalidateQueries({ queryKey: ["purchase-invoice-consistency"] });
      setPendingClear(null);
    },
    onError: (e: any) => toast.error(e?.message ?? "Wissen mislukt"),
  });

  if (!data || data.length === 0) return null;

  return (
    <>
      <Alert className="border-amber-300 bg-amber-50/70">
        <AlertTriangle className="h-4 w-4 text-amber-700" />
        <AlertTitle className="text-amber-900">Afwijkingen ({data.length})</AlertTitle>
        <AlertDescription className="text-amber-900/90">
          <p className="mb-2 text-sm">
            Deze onderdelen hebben wel een factuurnummer, maar er staat geen inkoopfactuur
            tegenover. Registreer de factuur alsnog of wis het nummer op het onderdeel.
          </p>
          <ul className="space-y-1">
            {data.slice(0, 10).map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">
                  <span className="font-medium">{o.block_name || "Onderdeel"}</span>
                  {o.reference_number && (
                    <span className="text-amber-900/70">{` · ${o.reference_number}`}</span>
                  )}
                  {o.provider_id && (
                    <span className="text-amber-900/70">{` · ${o.provider_id}`}</span>
                  )}
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
                <span className="flex shrink-0 items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setPendingClear(o)}>
                    Nummer wissen
                  </Button>
                  {o.request_id && (
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/admin/projecten/${o.request_id}`}>Openen</Link>
                    </Button>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {data.length > 10 && (
            <p className="mt-2 text-xs">en nog {data.length - 10} andere…</p>
          )}
        </AlertDescription>
      </Alert>

      <AlertDialog open={!!pendingClear} onOpenChange={(o) => !o && setPendingClear(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Factuurnummer wissen?</AlertDialogTitle>
            <AlertDialogDescription>
              Het nummer {pendingClear?.invoiced_number} wordt van{" "}
              {pendingClear?.block_name || "dit onderdeel"} verwijderd. Bedragen en commissie
              blijven staan. Doe dit alleen als er geen partnerfactuur bij hoort.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingClear && clearNumber.mutate(pendingClear.id)}
              disabled={clearNumber.isPending}
            >
              Wissen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { PurchaseInvoiceInboxItem, InboxStatus } from "@/types/purchaseInvoiceInbox";

export function usePurchaseInvoiceInbox(status: InboxStatus | "all" = "new") {
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ["purchase-invoice-inbox", status],
    queryFn: async () => {
      let q = supabase
        .from("purchase_invoice_inbox")
        .select("*")
        .order("created_at", { ascending: false });
      if (status !== "all") q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as PurchaseInvoiceInboxItem[];
    },
    refetchInterval: 30000,
  });

  const newCount = items?.filter((i) => i.status === "new").length || 0;

  const discard = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("purchase_invoice_inbox")
        .update({ status: "discarded" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-invoice-inbox"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-invoice-inbox-count"] });
      toast.success("Item genegeerd");
    },
  });

  const markProcessed = useMutation({
    mutationFn: async ({ id, invoiceId }: { id: string; invoiceId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("purchase_invoice_inbox")
        .update({
          status: "processed",
          processed_invoice_id: invoiceId,
          processed_by: user?.id,
          processed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-invoice-inbox"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-invoice-inbox-count"] });
    },
  });

  const rescan = useMutation({
    mutationFn: async (item: PurchaseInvoiceInboxItem) => {
      if (!item.attachment_path) throw new Error("Geen bijlage");
      const { error: markScanningError } = await supabase
        .from("purchase_invoice_inbox")
        .update({ scan_status: "scanning", scan_error: null })
        .eq("id", item.id);
      if (markScanningError) throw markScanningError;

      const { data, error } = await supabase.functions.invoke("scan-purchase-invoice", {
        body: { file_path: item.attachment_path },
      });
      if (error || data?.error) {
        const message = data?.error || error?.message || "Scan mislukt";
        await supabase
          .from("purchase_invoice_inbox")
          .update({ scan_status: "failed", scan_error: message })
          .eq("id", item.id);
        throw new Error(message);
      }

      const { error: markScannedError } = await supabase
        .from("purchase_invoice_inbox")
        .update({ scan_status: "scanned", scan_result: data.data, scan_error: null })
        .eq("id", item.id);
      if (markScannedError) throw markScannedError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-invoice-inbox"] });
      toast.success("Opnieuw gescand");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Scan mislukt");
    },
  });

  const reprocess = useMutation({
    mutationFn: async (item: PurchaseInvoiceInboxItem) => {
      const invoiceId = item.processed_invoice_id;
      if (invoiceId) {
        // Fetch invoice for cleanup metadata
        const { data: inv } = await supabase
          .from("partner_purchase_invoices")
          .select("id, item_id, request_id, file_path, invoice_number, partner_id, amount_excl_vat")
          .eq("id", invoiceId)
          .maybeSingle();

        // Cascade cleanup children
        await supabase.from("purchase_invoice_lines").delete().eq("invoice_id", invoiceId);
        await supabase.from("partner_purchase_invoice_allocations").delete().eq("invoice_id", invoiceId);

        // Delete invoice header
        await supabase.from("partner_purchase_invoices").delete().eq("id", invoiceId);

        if (inv?.item_id) {
          await supabase
            .from("program_request_items")
            .update({
              invoiced_amount: null,
              invoiced_number: null,
              invoiced_date: null,
              invoiced_file_path: null,
              commission_amount: null,
              commission_status: "not_applicable",
              commission_notes: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", inv.item_id);
        }

        // NB: bewust GEEN storage.remove() — het bestand blijft nodig voor
        // de inbox-rij (attachment_path) en voor eventuele andere invoices
        // die naar hetzelfde pad wijzen (extra-projects delen file_path).
        // De bevestigingsdialoog belooft expliciet dat de bijlage bewaard blijft.

        if (inv?.request_id) {
          await supabase.from("program_request_history").insert({
            request_id: inv.request_id,
            item_id: inv.item_id || null,
            action: "purchase_invoice_reprocessed",
            actor: "admin",
            notes: `Inkoopfactuur ${inv.invoice_number || "(zonder nummer)"} (€${inv.amount_excl_vat}) teruggezet naar inbox voor herverwerking`,
          });
        }
      }

      // Reset inbox row back to "new" (keeps scan_result + bijlage)
      const { error } = await supabase
        .from("purchase_invoice_inbox")
        .update({
          status: "new",
          processed_invoice_id: null,
          processed_by: null,
          processed_at: null,
        })
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-invoice-inbox"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-invoice-inbox-count"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-invoices"] });
      toast.success("Verwerking ongedaan gemaakt — klaar om opnieuw te verwerken");
    },
    onError: (err: Error) => {
      console.error("Reprocess error:", err);
      toast.error(err.message || "Kon verwerking niet ongedaan maken");
    },
  });

  return { items, isLoading, newCount, discard, markProcessed, rescan, reprocess };
}

export function usePurchaseInvoiceInboxCount() {
  return useQuery({
    queryKey: ["purchase-invoice-inbox-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("purchase_invoice_inbox")
        .select("id", { count: "exact", head: true })
        .eq("status", "new");
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 60000,
  });
}

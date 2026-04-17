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
      // Reset to pending and trigger scan via internal function (admin can call scan-purchase-invoice)
      await supabase
        .from("purchase_invoice_inbox")
        .update({ scan_status: "scanning", scan_error: null })
        .eq("id", item.id);

      const { data, error } = await supabase.functions.invoke("scan-purchase-invoice", {
        body: { file_path: item.attachment_path },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      await supabase
        .from("purchase_invoice_inbox")
        .update({ scan_status: "scanned", scan_result: data.data })
        .eq("id", item.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-invoice-inbox"] });
      toast.success("Opnieuw gescand");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Scan mislukt");
    },
  });

  return { items, isLoading, newCount, discard, markProcessed, rescan };
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

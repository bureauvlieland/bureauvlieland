import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns a map: invoiceId → most-recent-sent-at timestamp (ISO string)
 * for emails sent of type "bureau_invoice_to_customer" linked to a request.
 */
export const useInvoiceCustomerSendStatus = (requestId: string | undefined, invoiceIds: string[]) => {
  const ids = [...invoiceIds].sort().join(",");

  return useQuery({
    queryKey: ["bureau-invoice-customer-sends", requestId, ids],
    enabled: !!requestId && invoiceIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_log")
        .select("metadata, sent_at, status")
        .eq("related_request_id", requestId!)
        .eq("email_type", "bureau_invoice_to_customer")
        .eq("status", "sent")
        .order("sent_at", { ascending: false });

      if (error) throw error;

      const map: Record<string, string> = {};
      (data || []).forEach((row) => {
        const meta = (row.metadata ?? {}) as Record<string, unknown>;
        const id = typeof meta.invoiceId === "string" ? meta.invoiceId : null;
        if (id && row.sent_at && !map[id]) {
          map[id] = row.sent_at as string;
        }
      });
      return map;
    },
    staleTime: 30_000,
  });
};

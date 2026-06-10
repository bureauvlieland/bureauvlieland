import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface InvoiceForwardLogEntry {
  id: string;
  created_at: string;
  sent_at: string | null;
  status: string;
  recipient_email: string;
  subject: string;
  error_message: string | null;
  mailjet_message_id: string | null;
  metadata: Record<string, any> | null;
}

export function useInvoiceForwardHistory(invoiceId: string | null | undefined) {
  return useQuery({
    queryKey: ["invoice-forward-history", invoiceId],
    enabled: !!invoiceId,
    queryFn: async (): Promise<InvoiceForwardLogEntry[]> => {
      const { data, error } = await supabase
        .from("email_log")
        .select("id, created_at, sent_at, status, recipient_email, subject, error_message, mailjet_message_id, metadata")
        .eq("email_type", "purchase_invoice_forward")
        .contains("metadata", { invoiceId })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as InvoiceForwardLogEntry[];
    },
  });
}

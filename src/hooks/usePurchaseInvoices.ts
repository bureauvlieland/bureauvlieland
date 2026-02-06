import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { 
  PurchaseInvoice, 
  PurchaseInvoiceWithRelations,
  PurchaseInvoiceInsert, 
  PurchaseInvoiceUpdate,
  PurchaseInvoiceFilters,
  PurchaseInvoiceStats 
} from "@/types/purchaseInvoice";

export function usePurchaseInvoices(filters?: PurchaseInvoiceFilters) {
  const queryClient = useQueryClient();

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["purchase-invoices", filters],
    queryFn: async () => {
      let query = supabase
        .from("partner_purchase_invoices")
        .select(`
          *,
          partners!inner(id, name, email),
          program_requests!inner(id, reference_number, customer_name, customer_company),
          program_request_items(id, block_name)
        `)
        .order("created_at", { ascending: false });

      if (filters?.requestId) {
        query = query.eq("request_id", filters.requestId);
      }
      if (filters?.partnerId) {
        query = query.eq("partner_id", filters.partnerId);
      }
      if (filters?.status && filters.status !== 'all') {
        query = query.eq("status", filters.status);
      }
      if (filters?.search) {
        query = query.ilike("invoice_number", `%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((invoice: any) => ({
        ...invoice,
        partner: invoice.partners,
        program_request: invoice.program_requests,
        program_request_item: invoice.program_request_items,
      })) as PurchaseInvoiceWithRelations[];
    },
  });

  const stats: PurchaseInvoiceStats = {
    pending: invoices?.filter(i => i.status === 'pending').length || 0,
    forwarded: invoices?.filter(i => i.status === 'forwarded').length || 0,
    paid: invoices?.filter(i => i.status === 'paid').length || 0,
    totalAmount: invoices?.reduce((sum, i) => sum + Number(i.amount_excl_vat), 0) || 0,
  };

  const createInvoice = useMutation({
    mutationFn: async (invoice: PurchaseInvoiceInsert) => {
      const { data, error } = await supabase
        .from("partner_purchase_invoices")
        .insert(invoice)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-invoices"] });
      toast.success("Inkoopfactuur geregistreerd");
    },
    onError: (error) => {
      console.error("Error creating purchase invoice:", error);
      toast.error("Fout bij registreren inkoopfactuur");
    },
  });

  const updateInvoice = useMutation({
    mutationFn: async ({ id, ...updates }: PurchaseInvoiceUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("partner_purchase_invoices")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-invoices"] });
    },
    onError: (error) => {
      console.error("Error updating purchase invoice:", error);
      toast.error("Fout bij bijwerken inkoopfactuur");
    },
  });

  const markAsPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("partner_purchase_invoices")
        .update({ 
          status: 'paid', 
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString() 
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-invoices"] });
      toast.success("Factuur gemarkeerd als betaald");
    },
    onError: (error) => {
      console.error("Error marking invoice as paid:", error);
      toast.error("Fout bij markeren als betaald");
    },
  });

  const markAsForwarded = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("partner_purchase_invoices")
        .update({ 
          status: 'forwarded', 
          forwarded_to_accounting_at: new Date().toISOString(),
          forwarded_by: user?.id || null,
          updated_at: new Date().toISOString() 
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-invoices"] });
    },
  });

  const getDownloadUrl = async (filePath: string) => {
    const { data, error } = await supabase.storage
      .from("partner-invoices")
      .createSignedUrl(filePath, 3600); // 1 hour

    if (error) {
      console.error("Error getting download URL:", error);
      toast.error("Fout bij ophalen download link");
      return null;
    }

    return data.signedUrl;
  };

  return {
    invoices,
    isLoading,
    stats,
    createInvoice,
    updateInvoice,
    markAsPaid,
    markAsForwarded,
    getDownloadUrl,
  };
}

export function usePurchaseInvoicesByRequest(requestId: string) {
  return usePurchaseInvoices({ requestId });
}

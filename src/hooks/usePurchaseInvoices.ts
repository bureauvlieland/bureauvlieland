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
      const { lines, allocations, ...invoiceData } = invoice;
      const { data, error } = await supabase
        .from("partner_purchase_invoices")
        .insert(invoiceData)
        .select()
        .single();

      if (error) throw error;

      // Insert order lines if provided
      if (lines && lines.length > 0 && data?.id) {
        const linesToInsert = lines.map((line, idx) => ({
          invoice_id: data.id,
          description: line.description,
          quantity: line.quantity,
          unit_price: line.unit_price,
          amount_excl_vat: line.amount_excl_vat,
          vat_rate: line.vat_rate,
          vat_amount: line.vat_amount,
          amount_incl_vat: line.amount_incl_vat,
          sort_order: idx,
        }));
        const { error: linesErr } = await supabase
          .from("purchase_invoice_lines")
          .insert(linesToInsert);
        if (linesErr) {
          console.error("Error inserting invoice lines:", linesErr);
          // non-fatal: header is already saved
        }
      }

      // Insert allocations (split across program items) if provided
      if (allocations && allocations.length > 0 && data?.id) {
        const allocationsToInsert = allocations.map((a, idx) => ({
          invoice_id: data.id,
          item_id: a.item_id,
          amount_excl_vat: a.amount_excl_vat,
          vat_rate: a.vat_rate,
          vat_amount: a.vat_amount,
          amount_incl_vat: a.amount_incl_vat,
          notes: a.notes ?? null,
          sort_order: idx,
        }));
        const { error: allocErr } = await supabase
          .from("partner_purchase_invoice_allocations")
          .insert(allocationsToInsert);
        if (allocErr) {
          console.error("Error inserting invoice allocations:", allocErr);
          toast.error("Factuur opgeslagen, maar verdeling per onderdeel niet — controleer handmatig");
        }
      }
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

  const deleteInvoice = useMutation({
    mutationFn: async (invoice: PurchaseInvoiceWithRelations) => {
      const { id, item_id, request_id, file_path, invoice_number, partner_id, amount_excl_vat } = invoice;

      // Cascade-cleanup children first
      await supabase.from("purchase_invoice_lines").delete().eq("invoice_id", id);
      await supabase.from("partner_purchase_invoice_allocations").delete().eq("invoice_id", id);

      const { error } = await supabase.from("partner_purchase_invoices").delete().eq("id", id);
      if (error) throw error;

      // Reset invoice/commission fields on the linked program item
      if (item_id) {
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
          .eq("id", item_id);
      }

      // Best-effort: remove PDF from storage
      if (file_path) {
        await supabase.storage.from("partner-invoices").remove([file_path]);
      }

      // Best-effort: log
      if (request_id) {
        await supabase.from("program_request_history").insert({
          request_id,
          item_id: item_id || null,
          action: "purchase_invoice_deleted",
          actor: "admin",
          notes: `Inkoopfactuur ${invoice_number || "(zonder nummer)"} (€${amount_excl_vat}) verwijderd${partner_id ? ` voor partner ${partner_id}` : ""}`,
        });
      }

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-invoices"] });
      toast.success("Inkoopfactuur verwijderd");
    },
    onError: (error) => {
      console.error("Error deleting purchase invoice:", error);
      toast.error("Fout bij verwijderen inkoopfactuur");
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
    deleteInvoice,
    getDownloadUrl,
  };
}

export function usePurchaseInvoicesByRequest(requestId: string) {
  return usePurchaseInvoices({ requestId });
}

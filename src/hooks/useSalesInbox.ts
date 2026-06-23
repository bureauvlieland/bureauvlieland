import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { SalesInboxItem, SalesInboxStatus } from "@/types/salesInbox";

export function useSalesInbox(status: SalesInboxStatus | "all" = "new") {
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ["sales-inbox", status],
    queryFn: async () => {
      let q = supabase
        .from("sales_inbox")
        .select("*")
        .order("created_at", { ascending: false });
      if (status !== "all") q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as SalesInboxItem[];
    },
    refetchInterval: 30000,
  });

  const discard = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sales_inbox")
        .update({ status: "discarded" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-inbox"] });
      queryClient.invalidateQueries({ queryKey: ["sales-inbox-count"] });
      toast.success("Item genegeerd");
    },
  });

  const rescan = useMutation({
    mutationFn: async (item: SalesInboxItem) => {
      const { data, error } = await supabase.functions.invoke("scan-sales-lead", {
        body: { inbox_id: item.id },
      });
      if (error || data?.error) {
        throw new Error(data?.error || error?.message || "Scan mislukt");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-inbox"] });
      toast.success("Opnieuw gescand");
    },
    onError: (err: Error) => toast.error(err.message || "Scan mislukt"),
  });

  return { items, isLoading, discard, rescan };
}

export function useSalesInboxCount() {
  return useQuery({
    queryKey: ["sales-inbox-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("sales_inbox")
        .select("id", { count: "exact", head: true })
        .eq("status", "new");
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 60000,
  });
}

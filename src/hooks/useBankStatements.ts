import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BankStatement {
  id: string;
  file_path: string;
  file_name: string | null;
  iban: string | null;
  account_name: string | null;
  statement_date: string | null;
  opening_balance: number | null;
  closing_balance: number | null;
  currency: string | null;
  line_count: number;
  matched_count: number;
  created_at: string;
}

export interface BankStatementLine {
  id: string;
  statement_id: string;
  booking_date: string | null;
  value_date: string | null;
  amount: number;
  currency: string | null;
  direction: "in" | "out";
  counterparty_name: string | null;
  counterparty_iban: string | null;
  description: string | null;
  end_to_end_id: string | null;
  status: "unmatched" | "suggested" | "ambiguous" | "confirmed" | "ignored";
  matched_invoice_type: "sales" | "purchase" | "batch" | null;
  matched_invoice_id: string | null;
  confidence: number | null;
  suggestions: Array<{
    type: "sales" | "purchase" | "batch";
    id: string;
    label: string;
    amount: number;
    confidence: number;
  }>;
  confirmed_at: string | null;
  notes: string | null;
}

export function useBankStatements() {
  const qc = useQueryClient();

  const { data: statements, isLoading } = useQuery({
    queryKey: ["bank-statements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_statements")
        .select("*")
        .order("statement_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BankStatement[];
    },
  });

  const uploadStatement = useMutation({
    mutationFn: async (file: File) => {
      const ts = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${ts}_${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("bank-statements")
        .upload(path, file, { contentType: "application/xml" });
      if (upErr) throw upErr;

      const { data, error } = await supabase.functions.invoke("parse-bank-statement", {
        body: { file_path: path },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Verwerken mislukt");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bank-statements"] });
      qc.invalidateQueries({ queryKey: ["bank-statement-lines"] });
      qc.invalidateQueries({ queryKey: ["bank-pending-count"] });
      toast.success("Bankafschrift verwerkt");
    },
    onError: (err: Error) => toast.error(err.message || "Fout bij uploaden"),
  });

  const deleteStatement = useMutation({
    mutationFn: async (s: BankStatement) => {
      await supabase.storage.from("bank-statements").remove([s.file_path]);
      const { error } = await supabase.from("bank_statements").delete().eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bank-statements"] });
      qc.invalidateQueries({ queryKey: ["bank-statement-lines"] });
      toast.success("Afschrift verwijderd");
    },
  });

  return { statements, isLoading, uploadStatement, deleteStatement };
}

export function useBankStatementLines(statementId?: string) {
  return useQuery({
    queryKey: ["bank-statement-lines", statementId ?? "all-pending"],
    queryFn: async () => {
      let q = supabase.from("bank_statement_lines").select("*").order("booking_date", { ascending: false });
      if (statementId) q = q.eq("statement_id", statementId);
      else q = q.in("status", ["unmatched", "suggested", "ambiguous"]);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as BankStatementLine[];
    },
  });
}

export function useBankPendingCount() {
  return useQuery({
    queryKey: ["bank-pending-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("bank_statement_lines")
        .select("id", { count: "exact", head: true })
        .in("status", ["unmatched", "suggested", "ambiguous"]);
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 60000,
  });
}

export function useConfirmMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      line,
      type,
      invoiceId,
    }: {
      line: BankStatementLine;
      type: "sales" | "purchase" | "batch";
      invoiceId: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const nowIso = new Date().toISOString();

      // Mark line confirmed
      const { error: lineErr } = await supabase
        .from("bank_statement_lines")
        .update({
          status: "confirmed",
          matched_invoice_type: type,
          matched_invoice_id: invoiceId,
          confirmed_by: user?.id ?? null,
          confirmed_at: nowIso,
        })
        .eq("id", line.id);
      if (lineErr) throw lineErr;

      // Mark invoice / batch as paid + linked to bank line
      if (type === "sales") {
        await supabase
          .from("bureau_invoices")
          .update({ bank_line_id: line.id, paid_at: nowIso, status: "paid" })
          .eq("id", invoiceId);
      } else if (type === "purchase") {
        await supabase
          .from("partner_purchase_invoices")
          .update({ bank_line_id: line.id, paid_at: nowIso, status: "paid" })
          .eq("id", invoiceId);
      } else if (type === "batch") {
        await supabase
          .from("payment_batches")
          .update({ bank_line_id: line.id, status: "paid", paid_at: nowIso })
          .eq("id", invoiceId);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bank-statement-lines"] });
      qc.invalidateQueries({ queryKey: ["bank-statements"] });
      qc.invalidateQueries({ queryKey: ["bank-pending-count"] });
      qc.invalidateQueries({ queryKey: ["purchase-invoices"] });
      qc.invalidateQueries({ queryKey: ["bureau-invoices"] });
      qc.invalidateQueries({ queryKey: ["payment-batches"] });
      toast.success("Match bevestigd");
    },
    onError: (err: Error) => toast.error(err.message || "Fout bij bevestigen"),
  });
}

export function useIgnoreLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lineId: string) => {
      const { error } = await supabase
        .from("bank_statement_lines")
        .update({ status: "ignored" })
        .eq("id", lineId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bank-statement-lines"] });
      qc.invalidateQueries({ queryKey: ["bank-pending-count"] });
    },
  });
}

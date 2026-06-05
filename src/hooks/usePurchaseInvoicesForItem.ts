import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LinkedPurchaseInvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount_excl_vat: number;
  vat_rate: number;
  vat_amount: number;
  amount_incl_vat: number;
  sort_order: number;
}

export interface LinkedPurchaseInvoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  partner_id: string;
  amount_excl_vat: number;
  vat_rate: number;
  vat_amount: number;
  amount_incl_vat: number;
  link_type: "direct" | "allocation";
  /** Only present when link_type === "allocation": the allocated share for this item */
  allocation?: {
    id: string;
    amount_excl_vat: number;
    vat_rate: number;
    vat_amount: number;
    amount_incl_vat: number;
    notes: string | null;
  };
  lines: LinkedPurchaseInvoiceLine[];
}

export const usePurchaseInvoicesForItem = (itemId: string | null) => {
  const [invoices, setInvoices] = useState<LinkedPurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!itemId) return;
    setLoading(true);
    const [direct, allocs] = await Promise.all([
      supabase
        .from("partner_purchase_invoices")
        .select("id, invoice_number, invoice_date, partner_id, amount_excl_vat, vat_rate, vat_amount, amount_incl_vat")
        .eq("item_id", itemId),
      supabase
        .from("partner_purchase_invoice_allocations")
        .select(
          "id, invoice_id, amount_excl_vat, vat_rate, vat_amount, amount_incl_vat, notes, invoice:partner_purchase_invoices(id, invoice_number, invoice_date, partner_id, amount_excl_vat, vat_rate, vat_amount, amount_incl_vat)",
        )
        .eq("item_id", itemId),
    ]);

    const all: LinkedPurchaseInvoice[] = [];
    const seen = new Set<string>();
    (direct.data ?? []).forEach((inv: any) => {
      all.push({ ...inv, link_type: "direct", lines: [] });
      seen.add(inv.id);
    });
    (allocs.data ?? []).forEach((a: any) => {
      const inv = a.invoice;
      if (!inv || seen.has(inv.id)) return;
      all.push({
        ...inv,
        link_type: "allocation",
        allocation: {
          id: a.id,
          amount_excl_vat: Number(a.amount_excl_vat),
          vat_rate: Number(a.vat_rate),
          vat_amount: Number(a.vat_amount),
          amount_incl_vat: Number(a.amount_incl_vat),
          notes: a.notes,
        },
        lines: [],
      });
      seen.add(inv.id);
    });

    if (all.length > 0) {
      const { data: linesData } = await supabase
        .from("purchase_invoice_lines")
        .select("*")
        .in("invoice_id", all.map((i) => i.id))
        .order("sort_order", { ascending: true });
      const byInvoice: Record<string, LinkedPurchaseInvoiceLine[]> = {};
      (linesData ?? []).forEach((l: any) => {
        if (!byInvoice[l.invoice_id]) byInvoice[l.invoice_id] = [];
        byInvoice[l.invoice_id].push(l);
      });
      all.forEach((inv) => {
        inv.lines = byInvoice[inv.id] ?? [];
      });
    }

    all.sort((a, b) => (a.invoice_date < b.invoice_date ? 1 : -1));
    setInvoices(all);
    setLoading(false);
  }, [itemId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { invoices, loading, refetch: fetchData };
};

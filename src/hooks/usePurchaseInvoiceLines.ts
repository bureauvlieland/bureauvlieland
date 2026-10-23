import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { reportError } from "@/lib/errorReporting";
import type { SplitPart } from "@/lib/purchaseInvoiceLineSplit";

export type ChargeStatus = "open" | "charged" | "kept_quote" | "skipped" | "legacy";

export interface PurchaseInvoiceLineRow {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount_excl_vat: number;
  vat_rate: number;
  vat_amount: number;
  amount_incl_vat: number;
  sort_order: number;
  item_id: string | null;
  charge_status: ChargeStatus;
  skip_reason: string | null;
  charged_at: string | null;
  /** Het project van de regel; bij een verzamelfactuur per regel verschillend. */
  request_id: string | null;
  booking_reference: string | null;
  departure_date: string | null;
  lodging_quote_id: string | null;
  lodging_target: "room" | "extra" | null;
}

export const PURCHASE_INVOICE_LINES_KEY = "purchase-invoice-lines";

/** Alle orderregels die bij een project horen, ook die van verzamelfacturen. */
export function usePurchaseInvoiceLinesByRequest(requestId: string | null | undefined) {
  return useQuery({
    queryKey: [PURCHASE_INVOICE_LINES_KEY, requestId],
    enabled: !!requestId,
    queryFn: async (): Promise<PurchaseInvoiceLineRow[]> => {
      const { data, error } = await supabase
        .from("purchase_invoice_lines")
        .select("*")
        .eq("request_id", requestId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as PurchaseInvoiceLineRow[];
    },
  });
}

/** Alle orderregels van één inkoopfactuur (voor het verdelen over projecten). */
export function usePurchaseInvoiceLinesByInvoice(invoiceId: string | null | undefined) {
  return useQuery({
    queryKey: [PURCHASE_INVOICE_LINES_KEY, "invoice", invoiceId],
    enabled: !!invoiceId,
    queryFn: async (): Promise<PurchaseInvoiceLineRow[]> => {
      const { data, error } = await supabase
        .from("purchase_invoice_lines")
        .select("*")
        .eq("invoice_id", invoiceId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as PurchaseInvoiceLineRow[];
    },
  });
}

export type ChargeDecision =
  | { line_id: string; action: "item"; item_id: string }
  | { line_id: string; action: "new_cost"; cost_key: string; cost_name: string }
  | { line_id: string; action: "skip"; skip_reason: string | null }
  | { line_id: string; action: "open" };

export interface ApplyChargesResult {
  charged: number;
  kept: number;
  skipped: number;
  reopened: number;
  new_costs: number;
  new_cost_ids: Record<string, string>;
}

const invalidateAfterCharges = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: [PURCHASE_INVOICE_LINES_KEY] });
  queryClient.invalidateQueries({ queryKey: ["purchase-invoices"] });
  queryClient.invalidateQueries({ queryKey: ["commission-worklist"] });
  queryClient.invalidateQueries({ queryKey: ["purchase-invoice-consistency"] });
  queryClient.invalidateQueries({ queryKey: ["item-billing-lines"] });
};

/** De ene schrijfactie van het werkblad: besluiten per regel, in één transactie. */
export function useApplyPurchaseLineCharges(requestId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (decisions: ChargeDecision[]): Promise<ApplyChargesResult> => {
      const { data, error } = await supabase.rpc("apply_purchase_line_charges", {
        p_request_id: requestId,
        p_decisions: decisions as unknown as Parameters<typeof supabase.rpc>[1] extends infer A ? A extends { p_decisions: infer J } ? J : never : never,
      });
      if (error) throw error;
      return data as unknown as ApplyChargesResult;
    },
    onSuccess: () => invalidateAfterCharges(queryClient),
    onError: (error: Error) => {
      reportError(error, { where: "useApplyPurchaseLineCharges" });
      toast.error(error.message || "Doorbelasten mislukt");
    },
  });
}

/**
 * Orderregels maken voor een factuur die er geen heeft (partnerregistratie,
 * handmatige kop). Eén regel per verdeling, anders één regel uit de kop.
 */
export function useCreateLinesFromInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invoice: {
      id: string;
      request_id?: string | null;
      description: string | null;
      invoice_number: string;
      amount_excl_vat: number;
      vat_rate: number;
      vat_amount: number;
      amount_incl_vat: number;
      allocations?: Array<{ item_id: string; amount_excl_vat: number; program_request_item?: { block_name: string } | null }> | null;
    }) => {
      const rows: Array<{
        invoice_id: string;
        request_id: string | null;
        description: string;
        quantity: number;
        unit_price: number;
        amount_excl_vat: number;
        vat_rate: number;
        vat_amount: number;
        amount_incl_vat: number;
        sort_order: number;
        item_id: string | null;
        charge_status: ChargeStatus;
      }> = [];
      const allocations = invoice.allocations ?? [];
      if (allocations.length > 0) {
        const { data: allocRows, error } = await supabase
          .from("partner_purchase_invoice_allocations")
          .select("item_id, amount_excl_vat, vat_rate, vat_amount, amount_incl_vat, notes, sort_order")
          .eq("invoice_id", invoice.id)
          .order("sort_order");
        if (error) throw error;
        (allocRows ?? []).forEach((a, idx) => {
          const name = allocations.find((x) => x.item_id === a.item_id)?.program_request_item?.block_name;
          rows.push({
            invoice_id: invoice.id,
            request_id: invoice.request_id ?? null,
            description: a.notes || name || `Factuur ${invoice.invoice_number}`,
            quantity: 1,
            unit_price: Number(a.amount_excl_vat),
            amount_excl_vat: Number(a.amount_excl_vat),
            vat_rate: Number(a.vat_rate),
            vat_amount: Number(a.vat_amount),
            amount_incl_vat: Number(a.amount_incl_vat),
            sort_order: idx,
            // De verdeling bestaat al; de regel krijgt die bestemming mee en
            // staat als 'legacy' tot de admin hem in het werkblad opnieuw verdeelt.
            item_id: a.item_id,
            charge_status: "legacy",
          });
        });
      } else {
        rows.push({
          invoice_id: invoice.id,
          request_id: invoice.request_id ?? null,
          description: invoice.description?.trim() || `Factuur ${invoice.invoice_number}`,
          quantity: 1,
          unit_price: Number(invoice.amount_excl_vat),
          amount_excl_vat: Number(invoice.amount_excl_vat),
          vat_rate: Number(invoice.vat_rate),
          vat_amount: Number(invoice.vat_amount),
          amount_incl_vat: Number(invoice.amount_incl_vat),
          sort_order: 0,
          item_id: null,
          charge_status: "open",
        });
      }
      const { error: insertError } = await supabase.from("purchase_invoice_lines").insert(rows);
      if (insertError) throw insertError;
      return rows.length;
    },
    onSuccess: (count) => {
      invalidateAfterCharges(queryClient);
      toast.success(`${count} ${count === 1 ? "orderregel" : "orderregels"} aangemaakt`);
    },
    onError: (error: Error) => {
      reportError(error, { where: "useCreateLinesFromInvoice" });
      toast.error(error.message || "Orderregels aanmaken mislukt");
    },
  });
}

/**
 * Regels naar een (ander) project verplaatsen. Een verplaatste regel begint
 * daar opnieuw: bestemming en klantregels gaan weg. Daarna volgt de kop de
 * regels: één project → op de kop; meerdere → verzamelfactuur.
 */
export function useMoveLinesToProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { invoiceId: string; moves: Array<{ lineId: string; requestId: string | null }> }) => {
      let changed = 0;
      for (const move of input.moves) {
        const { error: lineErr } = await supabase
          .from("purchase_invoice_lines")
          .update({
            request_id: move.requestId,
            item_id: null,
            charge_status: "open",
            skip_reason: null,
            charged_at: null,
          })
          .eq("id", move.lineId);
        if (lineErr) throw lineErr;
        const { error: blErr } = await supabase
          .from("program_item_billing_lines")
          .delete()
          .eq("purchase_invoice_line_id", move.lineId);
        if (blErr) throw blErr;
        changed += 1;
      }
      const { data, error } = await supabase.rpc("sync_collective_invoice_header", { p_invoice_id: input.invoiceId });
      if (error) throw error;
      return { changed, header: data as { changed: boolean; is_collective?: boolean } | null };
    },
    onSuccess: ({ changed, header }) => {
      invalidateAfterCharges(queryClient);
      toast.success(
        header?.is_collective
          ? `${changed} ${changed === 1 ? "regel" : "regels"} verplaatst; de factuur is nu een verzamelfactuur`
          : `${changed} ${changed === 1 ? "regel" : "regels"} verplaatst`,
      );
    },
    onError: (error: Error) => {
      reportError(error, { where: "useMoveLinesToProject" });
      toast.error(error.message || "Verplaatsen mislukt");
    },
  });
}

/**
 * Eén of meer regels in delen knippen (src/lib/purchaseInvoiceLineSplit.ts
 * rekent; hier wordt geschreven). De oorspronkelijke regel verdwijnt, de delen
 * komen op zijn plek, elk met zijn eigen project en open om door te belasten.
 * Alleen regels die nog niet zijn doorbelast kunnen worden gesplitst; een al
 * doorbelaste regel heeft klantregels die eerst terug moeten.
 */
export function useSplitInvoiceLines() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      invoiceId: string;
      splits: Array<{ line: PurchaseInvoiceLineRow; parts: SplitPart[] }>;
    }) => {
      for (const { line, parts } of input.splits) {
        if (line.charge_status !== "open" && line.charge_status !== "skipped") {
          throw new Error(`"${line.description}" is al doorbelast; maak dat eerst ongedaan in het werkblad.`);
        }
        if (parts.length < 2) throw new Error("Een splitsing heeft minstens twee delen.");
        const rows = parts.map((p, idx) => ({
          invoice_id: input.invoiceId,
          description: p.description.slice(0, 500),
          quantity: 1,
          unit_price: p.unit_price,
          amount_excl_vat: p.amount_excl_vat,
          vat_rate: p.vat_rate,
          vat_amount: p.vat_amount,
          amount_incl_vat: p.amount_incl_vat,
          // Tussen de buren van de oorspronkelijke regel; hieronder wordt hernummerd.
          sort_order: line.sort_order * 1000 + idx + 1,
          request_id: p.request_id,
          item_id: null,
          charge_status: "open",
          skip_reason: null,
          charged_at: null,
          booking_reference: line.booking_reference,
          departure_date: line.departure_date,
        }));
        const { error: insErr } = await supabase.from("purchase_invoice_lines").insert(rows);
        if (insErr) throw insErr;
        const { error: delErr } = await supabase.from("purchase_invoice_lines").delete().eq("id", line.id);
        if (delErr) throw delErr;
      }

      // Hernummeren: de delen staan nu op sort_order × 1000, de rest op zijn oude
      // nummer. Op volgorde van (sort_order, created_at) weer 0, 1, 2, … maken.
      const { data: all, error: listErr } = await supabase
        .from("purchase_invoice_lines")
        .select("id, sort_order, created_at")
        .eq("invoice_id", input.invoiceId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (listErr) throw listErr;
      const ordered = (all ?? []).map((r, idx) => ({ id: r.id, from: r.sort_order, to: idx }));
      for (const r of ordered) {
        if (r.from === r.to) continue;
        const { error } = await supabase
          .from("purchase_invoice_lines")
          .update({ sort_order: r.to })
          .eq("id", r.id);
        if (error) throw error;
      }

      const { data, error } = await supabase.rpc("sync_collective_invoice_header", { p_invoice_id: input.invoiceId });
      if (error) throw error;
      return { split: input.splits.length, header: data as { changed: boolean; is_collective?: boolean } | null };
    },
    onSuccess: ({ split }) => {
      invalidateAfterCharges(queryClient);
      toast.success(split === 1 ? "Regel gesplitst" : `${split} regels gesplitst`);
    },
    onError: (error: Error) => {
      reportError(error, { where: "useSplitInvoiceLines" });
      toast.error(error.message || "Splitsen mislukt");
    },
  });
}

export interface LodgingQuoteOption {
  id: string;
  partner_id: string | null;
  accommodation_name: string;
  price_total: number;
  vat_rate: number | null;
  status: string;
}

/** Logies-offertes van de logiesaanvragen die aan dit programma hangen. */
export function useLodgingQuotesForProject(requestId: string | null | undefined) {
  return useQuery({
    queryKey: ["lodging-quotes-for-project", requestId],
    enabled: !!requestId,
    queryFn: async (): Promise<LodgingQuoteOption[]> => {
      const { data: reqs, error: reqErr } = await supabase
        .from("accommodation_requests")
        .select("id")
        .eq("linked_program_id", requestId!);
      if (reqErr) throw reqErr;
      const reqIds = (reqs ?? []).map((r) => r.id);
      if (reqIds.length === 0) return [];
      const { data, error } = await supabase
        .from("accommodation_quotes")
        .select("id, partner_id, accommodation_name, price_total, vat_rate, status")
        .in("request_id", reqIds)
        .in("status", ["selected", "accepted", "pending", "sent"])
        .order("status");
      if (error) throw error;
      return (data ?? []) as LodgingQuoteOption[];
    },
  });
}

export interface LodgingLineDecision {
  line: PurchaseInvoiceLineRow;
  quoteId: string;
  target: "room" | "extra";
  category: "fb" | "facilities" | "transport" | "other";
}

/**
 * Regels op een logies-offerte toepassen: kamerregels overschrijven de
 * kamerprijs, extra-regels worden extra's bij de offerte
 * (`apply-purchase-invoice-to-lodging`). Daarna krijgt de regel de offerte
 * als bestemming; terugdraaien gaat via de offerte zelf.
 */
export function useApplyLodgingLines() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      decisions: LodgingLineDecision[];
      invoices: Record<string, { partner_id: string | null; invoice_number: string | null }>;
    }) => {
      const byQuote = new Map<string, LodgingLineDecision[]>();
      for (const d of input.decisions) {
        const arr = byQuote.get(d.quoteId) ?? [];
        arr.push(d);
        byQuote.set(d.quoteId, arr);
      }
      let applied = 0;
      for (const [quoteId, decisions] of byQuote) {
        const invoiceId = decisions[0].line.invoice_id;
        const invoice = input.invoices[invoiceId];
        const room = decisions.filter((d) => d.target === "room");
        const extra = decisions.filter((d) => d.target === "extra");
        const { data, error } = await supabase.functions.invoke("apply-purchase-invoice-to-lodging", {
          body: {
            quote_id: quoteId,
            purchase_invoice_id: invoiceId,
            partner_id: invoice?.partner_id ?? null,
            invoice_number: invoice?.invoice_number ?? undefined,
            room_lines: room.map((d) => ({
              amount_incl_vat: Number(d.line.amount_incl_vat),
              amount_excl_vat: Number(d.line.amount_excl_vat),
              vat_rate: Number(d.line.vat_rate),
              description: d.line.description,
            })),
            extra_lines: extra.map((d) => ({
              category: d.category,
              description: d.line.description,
              amount_incl_vat: Number(d.line.amount_incl_vat),
              vat_rate: Number(d.line.vat_rate),
            })),
          },
        });
        if (error) throw error;
        if (data && typeof data === "object" && "error" in data && data.error) {
          throw new Error(String((data as { error: unknown }).error));
        }
        for (const d of decisions) {
          const { error: lineErr } = await supabase
            .from("purchase_invoice_lines")
            .update({
              item_id: null,
              lodging_quote_id: quoteId,
              lodging_target: d.target,
              charge_status: "charged",
              skip_reason: null,
              charged_at: new Date().toISOString(),
            })
            .eq("id", d.line.id);
          if (lineErr) throw lineErr;
          applied += 1;
        }
      }
      return applied;
    },
    onSuccess: (applied) => {
      invalidateAfterCharges(queryClient);
      queryClient.invalidateQueries({ queryKey: ["lodging-quotes-for-project"] });
      toast.success(`${applied} ${applied === 1 ? "regel" : "regels"} op de logies-offerte toegepast`);
    },
    onError: (error: Error) => {
      reportError(error, { where: "useApplyLodgingLines" });
      toast.error(error.message || "Toepassen op logies-offerte mislukt");
    },
  });
}

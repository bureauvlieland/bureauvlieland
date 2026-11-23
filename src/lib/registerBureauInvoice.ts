/**
 * Klantfactuur registreren via register_bureau_invoice (docs/nummering.md).
 * Los van invoiceNumber.ts zodat de pure nummerhulpjes zonder Supabase-client
 * te testen blijven.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { StoredInvoiceLineInput } from "@/lib/bureauInvoiceLines";

export interface RegisterBureauInvoiceHeader {
  request_id: string;
  invoice_date: string;
  amount_excl_vat: number;
  vat_amount: number;
  invoice_type: string;
  description?: string | null;
  /** Alleen om een elders gemaakte factuur met haar eigen nummer vast te leggen; leeg = volgende uit de reeks. */
  invoice_number?: string | null;
}

export interface RegisterBureauInvoiceResult {
  ok: boolean;
  id: string | null;
  invoiceNumber: string | null;
  /** Gevuld als ok false is. */
  message: string | null;
}

/**
 * Registreert een klantfactuur via register_bureau_invoice: de database kent
 * het nummer toe en slaat kop en regels in één transactie op. Regels mogen
 * {{nummer}} in hun omschrijving hebben; de database vult het nummer in.
 */
export async function registerBureauInvoice(args: {
  header: RegisterBureauInvoiceHeader;
  lines?: StoredInvoiceLineInput[];
}): Promise<RegisterBureauInvoiceResult> {
  const { data, error } = await supabase.rpc("register_bureau_invoice", {
    p_header: args.header as unknown as Json,
    p_lines: (args.lines ?? []) as unknown as Json,
  });
  if (error) {
    if (error.code === "23505" || error.message?.toLowerCase().includes("bestaat al") || error.message?.toLowerCase().includes("duplicate")) {
      return fail(`Factuurnummer ${args.header.invoice_number ?? ""} bestaat al`.replace(/\s+/g, " ").trim());
    }
    return fail(error.message || "Factuur registreren mislukt");
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id || !row?.invoice_number) return fail("Factuur registreren gaf geen nummer terug");
  return { ok: true, id: row.id, invoiceNumber: row.invoice_number, message: null };
}

const fail = (message: string): RegisterBureauInvoiceResult => ({ ok: false, id: null, invoiceNumber: null, message });

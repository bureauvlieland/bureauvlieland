/**
 * De PDF van een definitieve commissiefactuur maken uit wat er in de
 * database staat, en in de opslag zetten. Gebruikt na "Definitief maken",
 * na crediteren en bij "PDF opnieuw maken": één weg, altijd op de cent
 * gelijk aan de opgeslagen kop en regels.
 */
import { parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { commissionInvoicePdfPath } from "@/lib/commissionInvoiceStatus";
import {
  buildCommissionInvoicePdf,
  bureauFromSettings,
  paymentTermFromSettings,
} from "@/lib/commissionInvoicePdf";

type GetSetting = <T>(id: string, fallback: T) => T;

export interface StoredCommissionInvoicePdf {
  invoiceNumber: string;
  path: string;
}

export async function renderAndStoreCommissionInvoicePdf(
  invoiceId: string,
  getSetting: GetSetting,
): Promise<StoredCommissionInvoicePdf> {
  const [{ data: invoice, error: invoiceError }, { data: lines, error: linesError }] =
    await Promise.all([
      supabase
        .from("commission_invoices")
        // Eén letterlijke string: alleen dan leidt de Supabase-client er typen uit af.
        .select(
          "id, invoice_number, invoice_date, due_date, partner_id, recipient_name, recipient_address_street, recipient_address_postal, recipient_address_city, notes, vat_rate, amount_excl_vat, vat_amount, amount_incl_vat",
        )
        .eq("id", invoiceId)
        .maybeSingle(),
      supabase
        .from("commission_invoice_lines")
        .select(
          "description, reference_number, event_date, invoiced_amount_excl_vat, commission_percentage, commission_amount",
        )
        .eq("invoice_id", invoiceId)
        .order("sort_order"),
    ]);
  if (invoiceError) throw invoiceError;
  if (linesError) throw linesError;
  if (!invoice) throw new Error("Commissiefactuur niet gevonden");
  if (!invoice.invoice_number) throw new Error("De factuur heeft nog geen nummer");

  const invoiceDate = parseISO(invoice.invoice_date);
  const dueDate = invoice.due_date ? parseISO(invoice.due_date) : invoiceDate;

  const blob = await buildCommissionInvoicePdf({
    bureau: bureauFromSettings(getSetting),
    // De ontvanger zoals hij op de factuur is bevroren, niet de partner van nu.
    partner: {
      id: invoice.partner_id,
      name: invoice.recipient_name,
      address_street: invoice.recipient_address_street,
      address_postal: invoice.recipient_address_postal,
      address_city: invoice.recipient_address_city,
    },
    invoiceNumber: invoice.invoice_number,
    invoiceDate,
    dueDate,
    paymentTermDays: paymentTermFromSettings(getSetting),
    notes: invoice.notes,
    vatRate: Number(invoice.vat_rate) || undefined,
    lines: (lines ?? []).map((l) => ({
      description: l.description ?? "",
      reference: l.reference_number,
      eventDate: l.event_date,
      baseAmountExclVat: Number(l.invoiced_amount_excl_vat) || 0,
      commissionPct: Number(l.commission_percentage) || 0,
      commissionAmount: Number(l.commission_amount) || 0,
    })),
    totals: {
      totalExclVat: Number(invoice.amount_excl_vat) || 0,
      totalVat: Number(invoice.vat_amount) || 0,
      totalInclVat: Number(invoice.amount_incl_vat) || 0,
    },
  });

  const path = commissionInvoicePdfPath(invoice.partner_id, invoice.invoice_number);
  const { error: uploadError } = await supabase.storage
    .from("commission-invoices")
    .upload(path, blob, { contentType: "application/pdf", upsert: true });
  if (uploadError) throw uploadError;

  const { error: pathError } = await supabase
    .from("commission_invoices")
    .update({ pdf_path: path })
    .eq("id", invoiceId);
  if (pathError) throw pathError;

  return { invoiceNumber: invoice.invoice_number, path };
}

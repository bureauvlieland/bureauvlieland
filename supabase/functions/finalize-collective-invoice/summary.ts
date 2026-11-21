// Samenvattingsmail van een verzamelfactuur aan de boekhouding, los van
// index.ts zodat de test hem kan importeren. Bedragen via formatCurrencyNL;
// de projectkolom zegt "gekoppeld aan BV-…" in plaats van een vinkje.

import { formatCurrencyNL, sanitizeHtml } from "../_shared/email-templates.ts";

export interface SummaryBooking {
  resnr: string;
  customer_name: string;
  departure_dates: string[];
  amount_incl_vat: number;
  match_status: "matched" | "ambiguous" | "unmatched" | "manual" | "internal";
  item_id: string | null;
  request_id?: string | null;
}

export interface SummaryInvoice {
  invoice_number: string;
  invoice_date: string;
  total_incl_vat: number;
  total_supplier_commission: number;
}

/** Leesbare projectkolom per boeking. */
export function projectLabel(
  b: Pick<SummaryBooking, "item_id" | "match_status" | "request_id">,
  referenceByRequestId: Record<string, string>,
): string {
  const ref = b.request_id ? referenceByRequestId[b.request_id] : undefined;
  if (b.item_id || b.request_id) return ref ? `gekoppeld aan ${ref}` : "gekoppeld aan een project";
  if (b.match_status === "internal") return "intern (bureau)";
  return "niet gekoppeld";
}

export function collectiveInvoiceSubject(invoiceNumber: string, totalInclVat: number): string {
  return `Inkoopfactuur ${invoiceNumber} — verzamelfactuur (${formatCurrencyNL(totalInclVat)})`;
}

export function buildSummaryHtml(
  invoice: SummaryInvoice,
  bookings: SummaryBooking[],
  storedAmountInclVat: number,
  referenceByRequestId: Record<string, string>,
): string {
  const rows = bookings
    .map((b) => `<tr>
        <td style="padding:4px 8px;border-bottom:1px solid #eee">${sanitizeHtml(b.resnr)}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee">${sanitizeHtml(b.customer_name)}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee">${(b.departure_dates || []).map(sanitizeHtml).join(" / ")}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right">${formatCurrencyNL(b.amount_incl_vat)}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee;font-size:11px;color:#666">${projectLabel(b, referenceByRequestId)}</td>
      </tr>`)
    .join("");

  const touristTax = storedAmountInclVat > invoice.total_incl_vat + 0.005
    ? `<strong>Toeristenbelasting (0% btw):</strong> ${formatCurrencyNL(storedAmountInclVat - invoice.total_incl_vat)}<br/>
       <strong>Factuurbedrag:</strong> ${formatCurrencyNL(storedAmountInclVat)}<br/>`
    : "";

  return `<div style="font-family:Arial,sans-serif;max-width:720px">
    <h2>Verzamelfactuur ${sanitizeHtml(invoice.invoice_number)}</h2>
    <p><strong>Datum:</strong> ${sanitizeHtml(invoice.invoice_date)}<br/>
       <strong>Totaal incl. btw:</strong> ${formatCurrencyNL(invoice.total_incl_vat)}<br/>
       ${touristTax}
       <strong>Commissie Bureau Vlieland (verrekend):</strong> ${formatCurrencyNL(invoice.total_supplier_commission)}</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:12px">
      <thead><tr style="background:#f7f7f7">
        <th style="padding:6px 8px;text-align:left">Resnr</th>
        <th style="padding:6px 8px;text-align:left">Klant</th>
        <th style="padding:6px 8px;text-align:left">Datum(s)</th>
        <th style="padding:6px 8px;text-align:right">Bedrag</th>
        <th style="padding:6px 8px;text-align:left">Project</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="color:#999;font-size:11px;margin-top:16px">Automatisch verstuurd vanuit de administratie van Bureau Vlieland.</p>
  </div>`;
}

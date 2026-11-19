import { PURCHASE_INVOICE_INBOX } from "@/lib/bureauContact";
import type { InvoiceBilledTo } from "@/lib/invoiceBilledTo";
import { formatEuro } from "@/lib/formatEuro";
import { defaultBilledToForProject } from "@/lib/invoiceBilledTo";
import { getPartnerBillableAmount } from "@/lib/partnerBillableAmount";
import type { PartnerAccommodationQuote, PartnerItem } from "@/types/partner";

/**
 * De knop "Factuur mailen" in het partnerportaal
 * (docs/plan-inkoopfacturen-via-inbox.md, §3.1): een `mailto:` naar de
 * inkoop-inbox met ons referentienummer in het onderwerp en in de tekst de
 * drie dingen die op de factuur moeten staan. De partner typt geen bedrag,
 * geen btw en geen factuurnummer meer in; de pdf is de enige bron.
 */

export interface InvoiceMailLine {
  name: string;
  /** Bedrag volgens prijsopgave incl. btw, als bekend (alleen ter herinnering). */
  amountInclVat: number | null;
}

export interface InvoiceMailInput {
  partnerName: string;
  /** Ons referentienummer (BV-…); zonder nummer valt het onderwerp terug op de klant. */
  referenceNumber: string | null;
  customerLabel: string;
  /** Uitvoeringsdatum(s) als ISO yyyy-mm-dd. */
  dates: string[];
  billedTo: InvoiceBilledTo;
  lines: InvoiceMailLine[];
  /** "Logies" of "Onderdelen": kopje boven de regels. */
  kind?: "items" | "accommodation";
}

const formatDate = (iso: string): string => {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
};

/** Datums als "12 augustus 2026" of "12 tot 14 augustus 2026". */
export function formatInvoiceMailDates(dates: string[]): string | null {
  const sorted = [...new Set(dates.filter(Boolean))].sort();
  if (sorted.length === 0) return null;
  if (sorted.length === 1) return formatDate(sorted[0]);
  return `${formatDate(sorted[0])} tot ${formatDate(sorted[sorted.length - 1])}`;
}

export function invoiceMailSubject(input: Pick<InvoiceMailInput, "partnerName" | "referenceNumber" | "customerLabel">): string {
  const ref = input.referenceNumber?.trim();
  return `Factuur ${input.partnerName.trim()} voor ${ref || input.customerLabel.trim()}`;
}

export function invoiceMailBody(input: InvoiceMailInput): string {
  const ref = input.referenceNumber?.trim();
  const dates = formatInvoiceMailDates(input.dates);
  const lines: string[] = ["Beste Bureau Vlieland,", "", "In de bijlage de pdf van onze factuur. Op de factuur staat:"];
  lines.push(`- Referentie: ${ref || "(geen nummer bekend)"}`);
  lines.push(`- ${input.kind === "accommodation" ? "Verblijf" : "Programma"}: ${input.customerLabel.trim()}${dates ? `, ${dates}` : ""}`);
  lines.push(`- ${input.billedTo === "customer" ? "Betaald door de gast (alleen commissie)" : "Gericht aan Bureau Vlieland"}`);
  if (input.lines.length > 0) {
    lines.push("", input.kind === "accommodation" ? "Logies:" : "Onderdelen:");
    for (const l of input.lines) {
      lines.push(`- ${l.name}${l.amountInclVat != null ? ` (prijsopgave ${formatEuro(l.amountInclVat)} incl. btw)` : ""}`);
    }
  }
  lines.push("", "Met vriendelijke groet,", input.partnerName.trim());
  return lines.join("\n");
}

/** De volledige `mailto:`-link voor de knop. */
export function buildInvoiceMailto(input: InvoiceMailInput): string {
  const params = new URLSearchParams({ subject: invoiceMailSubject(input), body: invoiceMailBody(input) });
  // URLSearchParams maakt spaties tot "+", wat mailclients letterlijk tonen.
  return `mailto:${PURCHASE_INVOICE_INBOX}?${params.toString().replace(/\+/g, "%20")}`;
}

/** Eén factuur per project: alle te factureren onderdelen van dat project in één mail. */
export function invoiceMailInputForItems(partnerName: string, items: PartnerItem[]): InvoiceMailInput {
  const request = items[0]?.program_requests;
  const dates = (request?.selected_dates ?? []) as string[];
  return {
    partnerName,
    referenceNumber: request?.reference_number ?? null,
    customerLabel: request?.customer_company || request?.customer_name || "uw project",
    dates: items.map((it) => dates[it.day_index]).filter((d): d is string => !!d),
    billedTo: defaultBilledToForProject(request, "item"),
    lines: items.map((it) => ({ name: it.block_name, amountInclVat: getPartnerBillableAmount(it) || null })),
    kind: "items",
  };
}

export function invoiceMailInputForAccommodation(partnerName: string, quote: PartnerAccommodationQuote): InvoiceMailInput {
  const req = quote.accommodation_requests;
  return {
    partnerName,
    referenceNumber: req.reference_number ?? null,
    customerLabel: req.customer_company || req.customer_name || "uw gast",
    dates: [req.arrival_date, req.departure_date].filter(Boolean),
    billedTo: req.accommodation_billed_directly || req.invoicing_mode === "partner_direct" ? "customer" : "bureau",
    lines: [{ name: quote.accommodation_name, amountInclVat: quote.price_total || null }],
    kind: "accommodation",
  };
}

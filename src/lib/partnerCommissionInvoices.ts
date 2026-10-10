/**
 * Commissiefacturen zoals de partner ze ziet op Facturatie
 * (docs/plan-commissiefacturen.md, fase 3, partnerportaal). De gegevens komen
 * uit de edge function `get-partner-commission-invoices`; dit bestand bepaalt
 * alleen de weergave: status in partnertaal, totalen en volgorde.
 */
import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";
import type { PillTone } from "@/components/system";
import { countsTowardsTotal, type CommissionInvoiceStatus } from "@/lib/commissionInvoiceStatus";

export interface PartnerCommissionInvoiceLine {
  id: string;
  item_type: string;
  block_name: string;
  customer_label: string | null;
  event_date: string | null;
  reference_number: string | null;
  invoiced_amount_excl_vat: number;
  commission_percentage: number;
  commission_amount: number;
  description: string | null;
  sort_order: number;
}

export interface PartnerCommissionInvoice {
  id: string;
  invoice_number: string | null;
  invoice_date: string;
  due_date: string | null;
  status: CommissionInvoiceStatus;
  amount_excl_vat: number;
  vat_amount: number;
  amount_incl_vat: number;
  vat_rate: number;
  sent_at: string | null;
  paid_at: string | null;
  credited_at: string | null;
  credits_invoice_id: string | null;
  credit_reason: string | null;
  notes: string | null;
  /** Tijdelijke link naar de PDF (één uur geldig), null als er geen PDF is. */
  pdfUrl: string | null;
  lines: PartnerCommissionInvoiceLine[];
}

export interface PartnerCommissionInvoicesResponse {
  partner: { id: string; name: string };
  invoices: PartnerCommissionInvoice[];
}

/** Openstaand voor de partner: verstuurd of doorgestuurd, nog niet betaald. */
const OPEN_STATUSES: CommissionInvoiceStatus[] = ["sent", "forwarded"];

export function isCreditNote(invoice: Pick<PartnerCommissionInvoice, "credits_invoice_id">): boolean {
  return !!invoice.credits_invoice_id;
}

export function isOpenForPartner(invoice: Pick<PartnerCommissionInvoice, "status" | "credits_invoice_id">): boolean {
  // Een creditnota hoeft de partner niet te betalen.
  return OPEN_STATUSES.includes(invoice.status) && !isCreditNote(invoice);
}

export function partnerDaysOverdue(
  invoice: Pick<PartnerCommissionInvoice, "status" | "due_date" | "credits_invoice_id">,
  now: Date = new Date(),
): number | null {
  if (!isOpenForPartner(invoice) || !invoice.due_date) return null;
  const days = differenceInCalendarDays(startOfDay(now), startOfDay(parseISO(invoice.due_date)));
  return days > 0 ? days : null;
}

export interface PartnerInvoiceStatusView {
  label: string;
  tone: PillTone;
}

/**
 * Status in partnertaal. "Doorgestuurd" is een interne stap (naar onze
 * boekhouding) en heet voor de partner gewoon "Open".
 */
export function partnerInvoiceStatus(
  invoice: Pick<PartnerCommissionInvoice, "status" | "due_date" | "credits_invoice_id">,
  now: Date = new Date(),
): PartnerInvoiceStatusView {
  if (isCreditNote(invoice)) return { label: "Creditnota", tone: "neutral" };
  switch (invoice.status) {
    case "paid":
      return { label: "Betaald", tone: "success" };
    case "credited":
      return { label: "Gecrediteerd", tone: "neutral" };
    case "sent":
    case "forwarded": {
      const late = partnerDaysOverdue(invoice, now);
      return late ? { label: `Te laat (${late} ${late === 1 ? "dag" : "dagen"})`, tone: "warning" } : { label: "Open", tone: "info" };
    }
    default:
      return { label: invoice.status, tone: "neutral" };
  }
}

export interface PartnerCommissionTotals {
  /** Commissie ex btw over alle facturen die de partner kreeg; creditnota's negatief. */
  invoiced: number;
  /** Incl. btw, nog te betalen door de partner. */
  open: number;
  /** Incl. btw, betaald. */
  paid: number;
  count: number;
}

export function summarizePartnerCommissionInvoices(invoices: PartnerCommissionInvoice[]): PartnerCommissionTotals {
  const totals: PartnerCommissionTotals = { invoiced: 0, open: 0, paid: 0, count: invoices.length };
  for (const invoice of invoices) {
    if (countsTowardsTotal(invoice.status)) totals.invoiced += Number(invoice.amount_excl_vat) || 0;
    if (isOpenForPartner(invoice)) totals.open += Number(invoice.amount_incl_vat) || 0;
    if (invoice.status === "paid") totals.paid += Number(invoice.amount_incl_vat) || 0;
  }
  return totals;
}

/** Nieuwste factuurdatum eerst; bij gelijke datum het hoogste nummer eerst. */
export function sortPartnerInvoices(invoices: PartnerCommissionInvoice[]): PartnerCommissionInvoice[] {
  return [...invoices].sort(
    (a, b) => b.invoice_date.localeCompare(a.invoice_date) || (b.invoice_number ?? "").localeCompare(a.invoice_number ?? ""),
  );
}

/**
 * Weergaveregels van het overzicht Commissiefacturen (fase 3 van
 * docs/plan-commissiefacturen.md): tegels als filters, te-laat-signaal,
 * zoeken op nummer, partner, klant en projectreferentie, en de volgende
 * stap per factuur. Pure functies, los van React.
 */
import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";
import type { PillTone } from "@/components/system";
import {
  COMMISSION_INVOICE_STATUS_LABELS,
  countsTowardsTotal,
  type CommissionInvoiceStatus,
} from "@/lib/commissionInvoiceStatus";

export interface CommissionInvoiceLineView {
  id: string;
  item_id: string | null;
  quote_id: string | null;
  purchase_invoice_id: string | null;
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

export interface CommissionInvoiceView {
  id: string;
  invoice_number: string | null;
  invoice_date: string;
  due_date: string | null;
  partner_id: string;
  recipient_name: string;
  recipient_email: string | null;
  amount_excl_vat: number;
  vat_amount: number;
  amount_incl_vat: number;
  vat_rate: number;
  status: CommissionInvoiceStatus;
  pdf_path: string | null;
  notes: string | null;
  sent_at: string | null;
  forwarded_to_accounting_at: string | null;
  paid_at: string | null;
  finalized_at: string | null;
  credits_invoice_id: string | null;
  credit_reason: string | null;
  credited_at: string | null;
  partner?: { id: string; name: string; email: string | null; contact_email: string | null } | null;
  lines: CommissionInvoiceLineView[];
}

/** De tegels: de vijf levende statussen plus het zicht "Te laat". */
export type InvoiceTab = "draft" | "final" | "sent" | "forwarded" | "paid" | "overdue";

export const INVOICE_TABS: InvoiceTab[] = ["draft", "final", "sent", "forwarded", "paid", "overdue"];

export const INVOICE_TAB_LABELS: Record<InvoiceTab, string> = {
  draft: "Concept",
  final: "Definitief",
  sent: "Verstuurd",
  forwarded: "Doorgestuurd",
  paid: "Betaald",
  overdue: "Te laat",
};

export const INVOICE_EMPTY: Record<InvoiceTab, { title: string; description?: string }> = {
  draft: { title: "Geen concepten", description: "Maak een factuur vanuit de werklijst op Commissies." },
  final: { title: "Niets definitief", description: "Een definitieve factuur wacht hier tot hij verstuurd is." },
  sent: { title: "Niets verstuurd" },
  forwarded: { title: "Niets doorgestuurd", description: "Verstuurde facturen die naar Snelstart zijn." },
  paid: { title: "Nog niets betaald" },
  overdue: { title: "Niets te laat", description: "Geen openstaande factuur met een verstreken vervaldatum." },
};

/** Openstaand: verstuurd of doorgestuurd, nog niet betaald. */
export const OPEN_STATUSES: CommissionInvoiceStatus[] = ["sent", "forwarded"];

/** Dagen over de vervaldatum; null als de factuur niet openstaat of geen vervaldatum heeft. */
export function daysOverdue(
  invoice: Pick<CommissionInvoiceView, "status" | "due_date">,
  now: Date = new Date(),
): number | null {
  if (!OPEN_STATUSES.includes(invoice.status) || !invoice.due_date) return null;
  const days = differenceInCalendarDays(startOfDay(now), startOfDay(parseISO(invoice.due_date)));
  return days > 0 ? days : null;
}

export function isOverdue(invoice: Pick<CommissionInvoiceView, "status" | "due_date">, now: Date = new Date()): boolean {
  return daysOverdue(invoice, now) !== null;
}

export function invoiceBelongsToTab(invoice: CommissionInvoiceView, tab: InvoiceTab, now: Date = new Date()): boolean {
  if (tab === "overdue") return isOverdue(invoice, now);
  return invoice.status === tab;
}

export interface InvoiceTabTotals {
  count: number;
  amount: number;
}

export function invoiceTabTotals(
  invoices: CommissionInvoiceView[],
  now: Date = new Date(),
): Record<InvoiceTab, InvoiceTabTotals> {
  const totals = Object.fromEntries(
    INVOICE_TABS.map((tab) => [tab, { count: 0, amount: 0 }]),
  ) as Record<InvoiceTab, InvoiceTabTotals>;
  for (const invoice of invoices) {
    for (const tab of INVOICE_TABS) {
      if (!invoiceBelongsToTab(invoice, tab, now)) continue;
      totals[tab].count += 1;
      totals[tab].amount += Number(invoice.amount_incl_vat) || 0;
    }
  }
  return totals;
}

/** Totaal incl. btw over alles wat geen concept is; creditnota's tellen negatief mee. */
export function invoicedTotal(invoices: CommissionInvoiceView[]): number {
  return invoices
    .filter((invoice) => countsTowardsTotal(invoice.status))
    .reduce((sum, invoice) => sum + (Number(invoice.amount_incl_vat) || 0), 0);
}

/** Zoekt op nummer, partner, klant en projectreferentie (ook in de regels). */
export function matchesInvoiceSearch(invoice: CommissionInvoiceView, query: string): boolean {
  const term = query.trim().toLowerCase();
  if (!term) return true;
  const haystack = [
    invoice.invoice_number,
    invoice.recipient_name,
    invoice.partner?.name,
    invoice.credit_reason,
    ...invoice.lines.flatMap((line) => [line.customer_label, line.reference_number, line.block_name]),
  ];
  return haystack.filter(Boolean).some((value) => String(value).toLowerCase().includes(term));
}

export const STATUS_PILL_TONE: Record<CommissionInvoiceStatus, PillTone> = {
  draft: "neutral",
  final: "brand",
  sent: "info",
  forwarded: "purple",
  paid: "success",
  credited: "neutral",
};

export function statusLabel(status: CommissionInvoiceStatus): string {
  return COMMISSION_INVOICE_STATUS_LABELS[status] ?? status;
}

/** De ene volgende stap van een factuur, voor de secundaire knop in de rij. */
export type InvoiceNextAction = "finalize" | "send" | "forward" | "markPaid" | null;

export function nextInvoiceAction(invoice: Pick<CommissionInvoiceView, "status" | "credits_invoice_id">): InvoiceNextAction {
  switch (invoice.status) {
    case "draft":
      return "finalize";
    case "final":
      return "send";
    case "sent":
      return "forward";
    case "forwarded":
      // Een creditnota wordt niet betaald; die is klaar na doorsturen.
      return invoice.credits_invoice_id ? null : "markPaid";
    default:
      return null;
  }
}

/** Sortering: nieuwste factuurdatum eerst, concepten bovenaan. */
export function sortInvoices(invoices: CommissionInvoiceView[]): CommissionInvoiceView[] {
  return [...invoices].sort((a, b) => {
    const draftA = a.status === "draft" ? 0 : 1;
    const draftB = b.status === "draft" ? 0 : 1;
    if (draftA !== draftB) return draftA - draftB;
    return b.invoice_date.localeCompare(a.invoice_date) || (b.invoice_number ?? "").localeCompare(a.invoice_number ?? "");
  });
}

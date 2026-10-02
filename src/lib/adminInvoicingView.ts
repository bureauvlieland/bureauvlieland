/**
 * Filter-, zoek- en sorteerlogica voor het facturatie-overzicht
 * (`/admin/facturatie`). Puur, zodat het te testen is zonder React.
 */

export interface InvoicingViewInvoice {
  invoice_number: string;
  status: string | null;
  forwarded_to_accounting_at: string | null;
}

export interface InvoicingViewRequest {
  reference_number: string | null;
  customer_name: string;
  customer_company: string | null;
  customer_email: string;
  selected_dates: string[];
  invoices: InvoicingViewInvoice[];
}

export type InvoicingSort = "event_oldest" | "amount_desc" | "customer";

export const isInvoiceForwarded = (invoice: InvoicingViewInvoice) =>
  invoice.status === "forwarded" || !!invoice.forwarded_to_accounting_at;

export const countUnforwardedInvoices = (request: Pick<InvoicingViewRequest, "invoices">) =>
  request.invoices.filter((invoice) => !isInvoiceForwarded(invoice)).length;

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

/** Eerste en laatste evenementdag (lokale tijd), of null zonder datums. */
export function getEventRange(selectedDates: string[] | null | undefined) {
  const dates = (selectedDates ?? [])
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  if (dates.length === 0) return null;
  return { first: dates[0], last: dates[dates.length - 1] };
}

/** Dagen tot (positief) of sinds (negatief) de laatste evenementdag. */
export function daysUntilEventEnd(selectedDates: string[], now: Date = new Date()) {
  const range = getEventRange(selectedDates);
  if (!range) return null;
  const diff = startOfDay(range.last).getTime() - startOfDay(now).getTime();
  return Math.round(diff / 86_400_000);
}

/** "vandaag", "3 dagen geleden", "morgen", "over 5 dagen". */
export function formatRelativeDays(days: number) {
  if (days === 0) return "vandaag";
  if (days === 1) return "morgen";
  if (days === -1) return "gisteren";
  return days > 0 ? `over ${days} dagen` : `${Math.abs(days)} dagen geleden`;
}

export function matchesSearch(request: InvoicingViewRequest, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    request.reference_number,
    request.customer_name,
    request.customer_company,
    request.customer_email,
    ...request.invoices.map((invoice) => invoice.invoice_number),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return needle.split(/\s+/).every((part) => haystack.includes(part));
}

interface Sortable extends InvoicingViewRequest {
  outstanding: number;
}

export function sortRequests<T extends Sortable>(items: T[], sort: InvoicingSort): T[] {
  const customerLabel = (item: T) => (item.customer_company || item.customer_name).toLowerCase();
  const eventEnd = (item: T) =>
    getEventRange(item.selected_dates)?.last.getTime() ?? Number.POSITIVE_INFINITY;
  const sorted = [...items];
  if (sort === "amount_desc") sorted.sort((a, b) => b.outstanding - a.outstanding);
  else if (sort === "customer") sorted.sort((a, b) => customerLabel(a).localeCompare(customerLabel(b), "nl"));
  else sorted.sort((a, b) => eventEnd(a) - eventEnd(b));
  return sorted;
}

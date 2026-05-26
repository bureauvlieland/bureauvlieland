import type { DerivedStatus } from "@/lib/projectStatus";
import type {
  PartnerItem,
  PartnerAccommodationQuote,
  PartnerDashboardData,
} from "@/types/partner";

export type PartnerRowKind = "activities" | "accommodation";

export interface PartnerOverviewRow {
  id: string;
  href: string;            // /partner/project/:id or /partner/logies/:id
  reference: string | null;
  kind: PartnerRowKind;
  customerLabel: string;
  numberOfPeople: number;
  earliestDate: Date | null;
  endDate: Date | null;
  durationDays: number;
  derivedStatus: DerivedStatus;
  itemCount: number;
  actionCount: number;       // items the partner has to do something with
  termsAccepted: boolean;
  isConcept: boolean;        // not yet released by admin → read-only preview
}

function toDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function isItemActionRequired(i: PartnerItem): boolean {
  if (i.status === "pending" || i.status === "counter_proposed") return true;
  // ready to invoice
  const canInvoice =
    (i.status === "accepted" ||
      i.status === "executed" ||
      (i.status === "confirmed" && (i.customer_accepted_at || i.customer_approved_at))) &&
    !i.invoiced_number &&
    i.program_requests.terms_accepted_at;
  if (canInvoice) return true;
  return false;
}

function deriveActivityStatus(items: PartnerItem[]): DerivedStatus {
  if (items.length === 0) return "concept";
  const req = items[0].program_requests;
  if (req.cancelled_at || req.status === "cancelled") return "geannuleerd";
  const active = items.filter(i => i.status !== "cancelled" && i.status !== "unavailable");
  if (active.length === 0) return "geannuleerd";
  if (active.every(i => !!i.invoiced_number)) return "afgerond";
  if (
    req.terms_accepted_at &&
    active.some(
      i =>
        !i.invoiced_number &&
        (i.status === "accepted" ||
          i.status === "executed" ||
          (i.status === "confirmed" && (i.customer_accepted_at || i.customer_approved_at)))
    )
  ) {
    return "facturatie";
  }
  if (req.terms_accepted_at) return "av_getekend";
  if (active.every(i => i.customer_accepted_at || i.customer_approved_at || i.status === "accepted"))
    return "akkoord_ontvangen";
  if (active.some(i => i.status === "pending")) return "offerte_verstuurd";
  return "offerte_verstuurd";
}

function deriveAccommodationStatus(q: PartnerAccommodationQuote): DerivedStatus {
  const reqStatus = q.accommodation_requests?.status;
  if (q.status === "cancelled" || q.status === "rejected" || reqStatus === "cancelled")
    return "geannuleerd";
  if (q.invoiced_number) return "afgerond";
  if (q.status === "selected") return "av_getekend";
  if (q.status === "submitted") return "offerte_verstuurd";
  if (q.status === "pending") return "concept";
  if (q.status === "declined") return "geannuleerd";
  if (q.status === "expired") return "afgerond";
  return "concept";
}

export function buildPartnerOverviewRows(
  data: PartnerDashboardData,
): PartnerOverviewRow[] {
  const rows: PartnerOverviewRow[] = [];

  // activities — group by request_id
  const byRequest = new Map<string, PartnerItem[]>();
  data.items.forEach(i => {
    const arr = byRequest.get(i.request_id) ?? [];
    arr.push(i);
    byRequest.set(i.request_id, arr);
  });

  byRequest.forEach((items, requestId) => {
    const first = items[0];
    const req = first.program_requests;
    const dates = (req.selected_dates || []) as string[];
    const sorted = [...dates].sort();
    const earliest = toDate(sorted[0] ?? null);
    const end = toDate(sorted[sorted.length - 1] ?? null);
    const derivedStatus = deriveActivityStatus(items);
    const actionCount = items.filter(isItemActionRequired).length;

    rows.push({
      id: requestId,
      href: `/partner/project/${requestId}`,
      reference: req.reference_number ?? null,
      kind: "activities",
      customerLabel: req.customer_company || req.customer_name,
      numberOfPeople: req.number_of_people ?? 1,
      earliestDate: earliest,
      endDate: end,
      durationDays: earliest && end
        ? Math.max(1, Math.round((end.getTime() - earliest.getTime()) / 86400000) + 1)
        : Math.max(1, dates.length || 1),
      derivedStatus,
      itemCount: items.length,
      actionCount,
      termsAccepted: !!req.terms_accepted_at,
    });
  });

  // accommodations — one row per quote (one request usually = one quote per partner)
  (data.accommodationQuotes ?? []).forEach(q => {
    const r = q.accommodation_requests;
    const arrival = toDate(r.arrival_date);
    const departure = toDate(r.departure_date);
    const derivedStatus = deriveAccommodationStatus(q);
    const actionCount = q.status === "pending" ? 1 : 0;

    rows.push({
      id: r.id,
      href: `/partner/logies/${r.id}`,
      reference: (r as any).reference_number ?? null,
      kind: "accommodation",
      customerLabel: r.customer_company || r.customer_name,
      numberOfPeople: r.number_of_guests ?? 1,
      earliestDate: arrival,
      endDate: departure,
      durationDays: arrival && departure
        ? Math.max(1, Math.round((departure.getTime() - arrival.getTime()) / 86400000))
        : 1,
      derivedStatus,
      itemCount: 1,
      actionCount,
      termsAccepted: false,
    });
  });

  return rows.sort((a, b) => {
    if (!a.earliestDate && !b.earliestDate) return 0;
    if (!a.earliestDate) return 1;
    if (!b.earliestDate) return -1;
    return a.earliestDate.getTime() - b.earliestDate.getTime();
  });
}

export const ARCHIVE_STATUSES = new Set<DerivedStatus>(["afgerond", "geannuleerd"]);

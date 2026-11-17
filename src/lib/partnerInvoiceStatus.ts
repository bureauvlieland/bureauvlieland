/**
 * Status van de factuur van een partner per project, voor het tabblad "Nog
 * te factureren" (docs/plan-inkoopfacturen-via-inbox.md, §3.1). De bron is
 * wat het bureau ziet: een mail in de inkoop-inbox van een afzender van deze
 * partner, en de inkoopfactuur die daaruit (of handmatig) op het project is
 * geregistreerd. De partner typt niets in; hij ziet alleen waar zijn factuur
 * staat.
 */

export interface PartnerInvoiceMailRow {
  id: string;
  received_at: string;
  /** new | processed | discarded */
  status: string;
  /** pending | scanned | failed | … */
  scan_status: string | null;
  /** Referentienummers (BV-…) die in onderwerp, mailtekst of scan staan. */
  reference_numbers: string[];
  processed_invoice_id: string | null;
}

export interface PartnerPurchaseInvoiceRow {
  id: string;
  /** Projecten waar de factuur (of een regel ervan) aan hangt. */
  request_ids: string[];
  invoice_number: string | null;
  invoice_date: string | null;
  amount_incl_vat: number | null;
  /** pending | forwarded | paid */
  status: string;
  paid_at: string | null;
  created_at: string;
}

export type PartnerInvoiceStatusKey = "waiting" | "received" | "processed" | "paid" | "unreadable";

export interface PartnerInvoiceStatus {
  key: PartnerInvoiceStatusKey;
  label: string;
  tone: "neutral" | "info" | "success" | "warning" | "danger";
  /** De factuur waar de status op slaat, als die er is. */
  invoice?: PartnerPurchaseInvoiceRow;
}

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "long" });

const formatEuro = (n: number): string =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const normalizeRef = (ref: string | null | undefined): string => (ref ?? "").trim().toUpperCase();

/** Mails die bij dit project horen: ons referentienummer staat erin. */
export function mailsForProject(mails: PartnerInvoiceMailRow[], referenceNumber: string | null | undefined): PartnerInvoiceMailRow[] {
  const ref = normalizeRef(referenceNumber);
  if (!ref) return [];
  return mails.filter((m) => m.reference_numbers.some((r) => normalizeRef(r) === ref));
}

/** Mails van de partner die nog niet verwerkt zijn en bij geen enkel project van hem passen. */
export function unmatchedOpenMails(mails: PartnerInvoiceMailRow[], referenceNumbers: Array<string | null | undefined>): PartnerInvoiceMailRow[] {
  const refs = new Set(referenceNumbers.map(normalizeRef).filter(Boolean));
  return mails.filter((m) => m.status === "new" && !m.reference_numbers.some((r) => refs.has(normalizeRef(r))));
}

export function partnerInvoiceStatusForProject(input: {
  requestId: string;
  referenceNumber: string | null | undefined;
  invoices: PartnerPurchaseInvoiceRow[];
  mails: PartnerInvoiceMailRow[];
}): PartnerInvoiceStatus {
  const invoices = input.invoices
    .filter((inv) => inv.request_ids.includes(input.requestId))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const paid = invoices.find((inv) => inv.status === "paid");
  if (paid) {
    return { key: "paid", label: `Betaald${paid.paid_at ? ` op ${formatDate(paid.paid_at)}` : ""}`, tone: "success", invoice: paid };
  }
  const processed = invoices[0];
  if (processed) {
    const parts = [processed.invoice_number ? `factuur ${processed.invoice_number}` : null, processed.amount_incl_vat != null ? formatEuro(Number(processed.amount_incl_vat)) : null].filter(Boolean);
    return { key: "processed", label: `Verwerkt${parts.length ? `: ${parts.join(", ")}` : ""}`, tone: "info", invoice: processed };
  }
  const mails = mailsForProject(input.mails, input.referenceNumber)
    .filter((m) => m.status === "new")
    .sort((a, b) => b.received_at.localeCompare(a.received_at));
  const latest = mails[0];
  if (latest) {
    if (latest.scan_status === "failed") {
      return { key: "unreadable", label: `Uw mail van ${formatDate(latest.received_at)} bevatte geen leesbare pdf; mail de factuur opnieuw als losse pdf-bijlage`, tone: "danger" };
    }
    return { key: "received", label: `Ontvangen op ${formatDate(latest.received_at)}, wordt verwerkt`, tone: "info" };
  }
  return { key: "waiting", label: "Nog niet ontvangen", tone: "neutral" };
}

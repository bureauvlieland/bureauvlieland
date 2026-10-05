/**
 * Eén PDF-opbouw voor de commissiefactuur, gebruikt door "Commissiefactuur
 * maken" (concept en definitief) en door "PDF opnieuw maken" in het
 * overzicht. De regels komen uit het scherm of uit de database; de opmaak
 * en de optelling zijn hetzelfde.
 */
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  renderInvoicePdf,
  type InvoiceBureau,
  type InvoiceCategory,
  type InvoiceLineRow,
} from "@/lib/invoicePdfRenderer";
import {
  calculateCommissionInvoiceTotals,
  commissionAmountForLine,
} from "@/lib/commissionInvoiceTotals";

export interface CommissionPdfLine {
  description: string;
  reference: string | null;
  eventDate: string | null;
  baseAmountExclVat: number;
  commissionPct: number;
  /**
   * Het opgeslagen regelbedrag. Gezet bij een PDF uit de database, zodat de
   * PDF op de cent gelijk is aan wat er is opgeslagen (ook bij een creditnota
   * met negatieve bedragen). Zonder dit wordt het bedrag berekend.
   */
  commissionAmount?: number;
}

export interface CommissionPdfTotals {
  totalExclVat: number;
  totalVat: number;
  totalInclVat: number;
}

export interface CommissionPdfPartner {
  id: string;
  name: string;
  address_street?: string | null;
  address_postal?: string | null;
  address_city?: string | null;
}

export interface CommissionPdfInput {
  bureau: InvoiceBureau;
  partner: CommissionPdfPartner;
  /** Het uitgegeven nummer, of "CONCEPT" zolang er geen is. */
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  paymentTermDays: number;
  notes?: string | null;
  vatRate?: number;
  lines: CommissionPdfLine[];
  /** De opgeslagen totalen van de factuurkop; zonder dit worden ze berekend. */
  totals?: CommissionPdfTotals;
}

/** Label op de PDF van een factuur die nog geen nummer heeft. */
export const DRAFT_PDF_LABEL = "CONCEPT";

export const formatCurrencyNL = (amount: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(amount);

export const formatDateNL = (dateStr?: string | null) => {
  if (!dateStr) return "";
  try {
    return format(new Date(dateStr), "d MMM yyyy", { locale: nl });
  } catch {
    return dateStr;
  }
};

type GetSetting = <T>(id: string, fallback: T) => T;

/** Bureaugegevens uit de app-instellingen, zoals elke factuur-PDF ze nodig heeft. */
export function bureauFromSettings(getSetting: GetSetting): InvoiceBureau {
  const companyName = getSetting<string>("bureau_company_name", "Bureau Vlieland");
  return {
    legalName: getSetting<string>("bureau_legal_name", "Bureau Vlieland B.V.") || companyName,
    street: getSetting<string>("bureau_street", ""),
    postalCode: getSetting<string>("bureau_postal_code", ""),
    city: getSetting<string>("bureau_city", ""),
    phone: getSetting<string>("bureau_phone", ""),
    email: getSetting<string>("bureau_admin_email", "administratie@bureauvlieland.nl"),
    website: getSetting<string>("bureau_website", "bureauvlieland.nl"),
    iban: getSetting<string>("bureau_iban", ""),
    kvkNumber: getSetting<string>("bureau_kvk_number", ""),
    vatNumber: getSetting<string>("bureau_vat_number", ""),
  };
}

export function paymentTermFromSettings(getSetting: GetSetting): number {
  return Number(getSetting<number | string>("bureau_payment_term_days", 14)) || 14;
}

/** "12 mrt 2026" of "12 mrt 2026 – 15 apr 2026": de periode waarover de factuur gaat. */
export function deliveryDateLabel(lines: Array<{ eventDate: string | null }>): string | undefined {
  const dates = lines
    .map((l) => l.eventDate)
    .filter((d): d is string => !!d)
    .sort();
  if (dates.length === 0) return undefined;
  if (dates.length === 1 || dates[0] === dates[dates.length - 1]) return formatDateNL(dates[0]);
  return `${formatDateNL(dates[0])} – ${formatDateNL(dates[dates.length - 1])}`;
}

/** Regelbedrag: opgeslagen als dat er is, anders berekend. */
export function commissionPdfLineAmount(line: CommissionPdfLine): number {
  return typeof line.commissionAmount === "number" ? line.commissionAmount : commissionAmountForLine(line);
}

export async function buildCommissionInvoicePdf(input: CommissionPdfInput): Promise<Blob> {
  const computed = calculateCommissionInvoiceTotals(input.lines, input.vatRate);
  const totals = {
    vatRate: computed.vatRate,
    totalExclVat: input.totals?.totalExclVat ?? computed.totalExclVat,
    totalVat: input.totals?.totalVat ?? computed.totalVat,
    totalInclVat: input.totals?.totalInclVat ?? computed.totalInclVat,
  };

  const rows: InvoiceLineRow[] = input.lines.map((l) => ({
    description: l.description,
    subDescription: l.reference ? `Ref: ${l.reference}` : undefined,
    qty: "1",
    unitPrice: `${formatCurrencyNL(l.baseAmountExclVat)} × ${l.commissionPct}%`,
    amount: formatCurrencyNL(commissionPdfLineAmount(l)),
  }));
  const categories: InvoiceCategory[] = [{ label: "Commissie", rows }];

  return renderInvoicePdf({
    bureau: input.bureau,
    customer: {
      name: input.partner.name,
      street: input.partner.address_street ?? undefined,
      postalCity:
        [input.partner.address_postal, input.partner.address_city].filter(Boolean).join(" ") ||
        undefined,
      customerNumber: input.partner.id,
    },
    meta: {
      invoiceNumber: input.invoiceNumber,
      invoiceDate: input.invoiceDate,
      dueDate: input.dueDate,
      paymentTermDays: input.paymentTermDays,
      deliveryDate: deliveryDateLabel(input.lines),
    },
    categories,
    totals: {
      totalExclVat: totals.totalExclVat,
      totalVat: totals.totalVat,
      totalInclVat: totals.totalInclVat,
      vatLines: [{ rate: totals.vatRate, exclVat: totals.totalExclVat, vatAmount: totals.totalVat }],
    },
    notes:
      input.notes ||
      `Commissie conform partneraanbod. Voldoening binnen ${input.paymentTermDays} dagen op ${input.bureau.iban || "ons IBAN"}.`,
  });
}

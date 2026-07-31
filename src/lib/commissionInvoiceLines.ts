/**
 * Zet regels uit de commissie-werklijst (`ReconRow`) om naar concept-factuurregels.
 *
 * Eén bron van waarheid: de werklijst en de pagina "Commissiefactuur maken" gebruiken
 * exact dezelfde grondslag en hetzelfde percentage. Eerder rekende de factuurpagina zelf
 * opnieuw (met andere fallbacks voor percentage en btw), wat tot afwijkende bedragen leidde.
 */
import {
  basisAmountForBasis,
  commissionForBasis,
  type CommissionBasis,
  type ReconRow,
} from "@/lib/commissionReconciliation";

export interface CommissionLineDraft {
  /** program_request_items.id, accommodation_quotes.id of partner_purchase_invoices.id. */
  sourceId: string;
  itemType: ReconRow["itemType"];
  blockName: string;
  description: string;
  /** Grondslag ex btw, afgerond op centen. */
  baseAmountExclVat: number;
  commissionPct: number;
  commissionAmount: number;
  customerLabel: string;
  eventDate: string | null;
  reference: string | null;
  basis: CommissionBasis;
  purchaseInvoiceId: string | null;
  /** Grondslag zoals de werklijst die toonde (indien meegegeven via de URL). */
  expectedBaseAmount: number | null;
  /** True als de herberekende grondslag meer dan 2 cent afwijkt van de werklijst. */
  hasBaseMismatch: boolean;
}

export interface BuildCommissionLinesInput {
  rows: ReconRow[];
  itemIds?: string[];
  quoteIds?: string[];
  invoiceIds?: string[];
  /** bron-id → gekozen grondslag (uit de werklijst). */
  basisById?: Map<string, CommissionBasis>;
  /** bron-id → grondslagbedrag zoals de werklijst dat berekende. */
  amountById?: Map<string, number>;
  formatDate?: (value: string | null) => string;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

const defaultFormatDate = (value: string | null) => value ?? "";

/** Parseert `id:waarde,id:waarde` uit de URL. */
export function parseKeyedParam(param: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of param.split(",").filter(Boolean)) {
    const idx = entry.indexOf(":");
    if (idx <= 0) continue;
    map.set(entry.slice(0, idx), entry.slice(idx + 1));
  }
  return map;
}

export function parseBasisParam(param: string): Map<string, CommissionBasis> {
  const map = new Map<string, CommissionBasis>();
  for (const [id, value] of parseKeyedParam(param)) {
    if (value === "sales" || value === "purchase") map.set(id, value);
  }
  return map;
}

export function parseAmountParam(param: string): Map<string, number> {
  const map = new Map<string, number>();
  for (const [id, value] of parseKeyedParam(param)) {
    const n = Number(value);
    if (Number.isFinite(n)) map.set(id, n);
  }
  return map;
}

/** Bron-id van een werklijstregel: item/offerte-id, of het factuur-id bij losse inkoopfacturen. */
export function reconRowSourceId(row: ReconRow): string | null {
  return row.itemType === "purchase_invoice" ? row.invoiceId : row.itemId;
}

export function buildCommissionLineDrafts(
  input: BuildCommissionLinesInput,
): CommissionLineDraft[] {
  const formatDate = input.formatDate ?? defaultFormatDate;
  const selected = new Set<string>([
    ...(input.itemIds ?? []),
    ...(input.quoteIds ?? []),
    ...(input.invoiceIds ?? []),
  ]);

  const drafts: CommissionLineDraft[] = [];

  for (const row of input.rows) {
    const sourceId = reconRowSourceId(row);
    if (!sourceId || !selected.has(sourceId)) continue;

    const basis: CommissionBasis = input.basisById?.get(sourceId) ?? row.defaultBasis;
    const baseAmountExclVat = round2(basisAmountForBasis(row, basis));
    const commissionPct = row.commissionPercentage;
    const commissionAmount = round2(commissionForBasis(row, basis));

    const customerLabel = row.projectLabel || row.customerName || "Klant";
    const eventDate = row.executionDate ?? row.invoiceDate ?? null;
    const datePart = eventDate ? ` – ${formatDate(eventDate)}` : "";
    const prefix = row.itemType === "accommodation" ? "Commissie logies " : "Commissie ";

    const expectedBaseAmount = input.amountById?.get(sourceId) ?? null;

    drafts.push({
      sourceId,
      itemType: row.itemType,
      blockName: row.label,
      description: `${prefix}${row.label} – ${customerLabel}${datePart}`,
      baseAmountExclVat,
      commissionPct,
      commissionAmount,
      customerLabel,
      eventDate,
      reference: row.projectReference,
      basis,
      purchaseInvoiceId: row.itemType === "purchase_invoice" ? row.invoiceId : null,
      expectedBaseAmount,
      hasBaseMismatch:
        expectedBaseAmount !== null && Math.abs(expectedBaseAmount - baseAmountExclVat) > 0.02,
    });
  }

  // Zelfde volgorde als de meegegeven selectie, zodat de factuur voorspelbaar is.
  const order = [...selected];
  drafts.sort((a, b) => order.indexOf(a.sourceId) - order.indexOf(b.sourceId));

  return drafts;
}

/** Som van de commissie over de concept-regels (ex btw). */
export function sumCommission(drafts: Array<{ commissionAmount: number }>): number {
  return round2(drafts.reduce((sum, d) => sum + d.commissionAmount, 0));
}

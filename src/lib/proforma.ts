/**
 * De proforma: de klantfactuur in wording (docs/plan-proforma-factuur.md).
 *
 * Fase 1: de proforma ontstaat bij akkoord uit de specificatie
 * (`projectInvoiceSpec`) en volgt daarna de offerte zolang een regel nog uit
 * de offerte komt (plan §3.4). Deze module is puur: zij bouwt de regels en
 * berekent welke inserts, updates en deletes nodig zijn om een bestaande
 * proforma gelijk te trekken met een verse specificatie. De hook
 * `useProforma` schrijft dat plan weg.
 */

import type { ProjectInvoiceSpec, SpecLine } from "@/lib/projectInvoiceSpec";
import {
  storedRowForSpecLine,
  storedRowForSubLine,
  totalsFromStoredLines,
  type StoredInvoiceLineInput,
} from "@/lib/bureauInvoiceLines";

export type ProformaOrigin = "quote_item" | "lodging" | "fee" | "purchase_line" | "post_charge" | "manual";
export type ProformaLineStatus = "active" | "replaced" | "hidden";

/** Reden waarmee de volg-logica een offerteregel verbergt die uit de offerte verdween. */
export const HIDDEN_REASON_GONE = "Niet meer in de offerte";

export interface ProformaLineInput extends StoredInvoiceLineInput {
  origin: ProformaOrigin;
  line_status: ProformaLineStatus;
  /** Sleutel van de specificatieregel; null voor handmatige regels. */
  line_key: string | null;
  replaces_line_id: string | null;
  hidden_reason: string | null;
  purchase_invoice_line_id: string | null;
  purchase_invoice_id: string | null;
  accommodation_quote_id: string | null;
  fee_key: string | null;
  quote_amount_incl_vat: number | null;
  accepted_amount_incl_vat: number | null;
}

export type ProformaLine = ProformaLineInput & { id: string; proforma_id: string };

export interface Proforma {
  id: string;
  request_id: string;
  status: "concept" | "registered";
  accepted_at: string;
  registered_invoice_id: string | null;
  created_at: string;
  updated_at: string;
}

const originForSpecLine = (line: SpecLine): ProformaOrigin => {
  switch (line.kind) {
    case "lodging":
    case "lodging_extra":
      return "lodging";
    case "fee":
    case "revision":
      return "fee";
    default:
      return "quote_item";
  }
};

const accommodationIdFromKey = (line: SpecLine): string | null => {
  if (line.kind !== "lodging") return null;
  const id = line.key.startsWith("lodging:") ? line.key.slice("lodging:".length) : "";
  return id && id !== "quote" ? id : null;
};

const feeKeyFor = (line: SpecLine): string | null => {
  if (line.feeKey) return line.feeKey;
  if (line.kind === "revision") return "revision";
  return null;
};

const withOrigin = (row: StoredInvoiceLineInput, line: SpecLine, lineKey: string): ProformaLineInput => ({
  ...row,
  origin: originForSpecLine(line),
  line_status: "active",
  line_key: lineKey,
  replaces_line_id: null,
  hidden_reason: null,
  purchase_invoice_line_id: null,
  purchase_invoice_id: null,
  accommodation_quote_id: accommodationIdFromKey(line),
  fee_key: feeKeyFor(line),
  quote_amount_incl_vat: row.amount_incl_vat,
  accepted_amount_incl_vat: row.amount_incl_vat,
});

/**
 * De proformaregels zoals de specificatie ze nu zou maken, in factuurvolgorde.
 * Subregels (klantregels onder een onderdeel) krijgen de sleutel van hun
 * onderdeel met een volgnummer, zodat de volg-logica ze terugvindt.
 */
export function specToProformaLines(spec: ProjectInvoiceSpec): ProformaLineInput[] {
  const rows: ProformaLineInput[] = [];
  for (const section of spec.sections) {
    for (const line of section.lines) {
      rows.push(withOrigin(storedRowForSpecLine(line, section.label, rows.length), line, line.key));
      (line.subLines ?? []).forEach((sub, idx) => {
        const subKey = `${line.key}:sub:${sub.id ?? idx}`;
        rows.push(withOrigin(storedRowForSubLine(line, sub, section.label, rows.length), line, subKey));
      });
    }
  }
  return rows;
}

/** Een regel die de offerte nog volgt: uit de offerte, niet vervangen, zonder inkoopbron. */
export const followsQuote = (line: Pick<ProformaLine, "origin" | "line_status" | "purchase_invoice_line_id" | "line_key">): boolean =>
  (line.origin === "quote_item" || line.origin === "lodging" || line.origin === "fee") &&
  line.line_status !== "replaced" &&
  line.purchase_invoice_line_id == null &&
  line.line_key != null;

/** Regels die meetellen op de proforma (en straks op de factuur). */
export const activeProformaLines = <T extends { line_status: ProformaLineStatus }>(lines: T[]): T[] =>
  lines.filter((l) => l.line_status === "active");

export const totalsFromProformaLines = (lines: ProformaLine[]) => totalsFromStoredLines(activeProformaLines(lines));

/** Velden die de volg-logica van de specificatie overneemt. */
const FOLLOWED_FIELDS = [
  "sort_order",
  "kind",
  "section",
  "item_id",
  "description",
  "sub_description",
  "quantity",
  "quantity_label",
  "unit_price_excl_vat",
  "unit_suffix",
  "vat_rate",
  "amount_excl_vat",
  "vat_amount",
  "amount_incl_vat",
  "accommodation_quote_id",
  "fee_key",
] as const;

type FollowedField = (typeof FOLLOWED_FIELDS)[number];
export type ProformaLinePatch = Partial<Pick<ProformaLineInput, FollowedField | "line_status" | "hidden_reason" | "quote_amount_incl_vat">>;

export interface ProformaSyncPlan {
  inserts: ProformaLineInput[];
  updates: Array<{ id: string; patch: ProformaLinePatch }>;
  deletes: string[];
}

const same = (a: unknown, b: unknown): boolean => {
  if (typeof a === "number" || typeof b === "number") return Math.abs(Number(a ?? 0) - Number(b ?? 0)) < 0.00005;
  return (a ?? null) === (b ?? null);
};

export const isEmptySyncPlan = (plan: ProformaSyncPlan): boolean =>
  plan.inserts.length === 0 && plan.updates.length === 0 && plan.deletes.length === 0;

/**
 * Plan §3.4: een regel volgt zijn offerte-onderdeel zolang hij nog uit de
 * offerte komt. Vervangen regels, regels met een inkoopbron en handmatige
 * regels blijven onaangeroerd.
 *
 * - Verse regel met bestaande volgende regel (zelfde sleutel): velden en
 *   `quote_amount_incl_vat` bijwerken als er iets verschilt. Was de regel
 *   door deze logica verborgen (offerte-onderdeel verdween), dan komt hij
 *   terug; een door de gebruiker verborgen regel blijft verborgen.
 * - Verse regel zonder bestaande: invoegen, met `accepted_amount_incl_vat`
 *   gelijk aan het bedrag van nu.
 * - Bestaande volgende regel zonder verse: een onderdeelregel wordt
 *   verborgen met `HIDDEN_REASON_GONE` (geannuleerd onderdeel blijft
 *   zichtbaar als spoor); een subregel, logies- of feeregel verdwijnt.
 */
export function planProformaSync(existing: ProformaLine[], fresh: ProformaLineInput[]): ProformaSyncPlan {
  const plan: ProformaSyncPlan = { inserts: [], updates: [], deletes: [] };
  const byKey = new Map<string, ProformaLine>();
  // Een vervangen regel blijft eigenaar van zijn sleutel: de offerte mag hem
  // niet opnieuw invoegen naast de inkoopregels die hem vervingen.
  const ownedKeys = new Set<string>();
  for (const line of existing) {
    if (line.line_key) ownedKeys.add(line.line_key);
    if (followsQuote(line) && line.line_key) byKey.set(line.line_key, line);
  }
  const seen = new Set<string>();

  for (const next of fresh) {
    const key = next.line_key as string;
    const current = byKey.get(key);
    if (!current) {
      if (!ownedKeys.has(key)) plan.inserts.push(next);
      continue;
    }
    seen.add(key);
    const patch: ProformaLinePatch = {};
    for (const field of FOLLOWED_FIELDS) {
      if (!same(current[field], next[field])) (patch as Record<string, unknown>)[field] = next[field];
    }
    if (!same(current.quote_amount_incl_vat, next.amount_incl_vat)) patch.quote_amount_incl_vat = next.amount_incl_vat;
    if (current.line_status === "hidden" && current.hidden_reason === HIDDEN_REASON_GONE) {
      patch.line_status = "active";
      patch.hidden_reason = null;
    }
    if (Object.keys(patch).length > 0) plan.updates.push({ id: current.id, patch });
  }

  for (const [key, current] of byKey) {
    if (seen.has(key)) continue;
    const isItemRow = current.origin === "quote_item" && current.item_id != null && current.kind !== "sub";
    if (isItemRow) {
      if (current.line_status !== "hidden") {
        plan.updates.push({ id: current.id, patch: { line_status: "hidden", hidden_reason: HIDDEN_REASON_GONE } });
      }
    } else {
      plan.deletes.push(current.id);
    }
  }

  return plan;
}

/** Verschil tussen het proformatotaal en de berekening; nul als ze gelijk zijn. */
export function proformaDeltaInclVat(lines: ProformaLine[], spec: ProjectInvoiceSpec | null | undefined): number | null {
  if (!spec) return null;
  const total = totalsFromProformaLines(lines).inclVat;
  return Math.round((total - spec.totals.inclVat) * 100) / 100;
}

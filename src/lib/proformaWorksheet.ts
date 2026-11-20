/**
 * Het werkblad op de proforma (docs/plan-proforma-factuur.md, fase 2):
 * puur rekenwerk voor `ProformaWorksheetCard`.
 *
 * - `orderProformaLines`: factuurvolgorde, met regels uit inkoop direct onder
 *   de offerteregel die ze vervangen; regels zonder onderdeel achteraan in
 *   hun eigen sectie.
 * - `worksheetPurchaseLines`: welke inkoopregels nog niet op de factuur
 *   staan, welke zijn gelaten en welke erop staan.
 * - `matchableItemsFromProforma` + `proposeDestinations`: de voorstellen van
 *   de matcher, met als kandidaten de offerteregels van de proforma in
 *   plaats van de onderdelen.
 * - `itemFigures`: per offerteregel Offerte, Inkoop en Factuur.
 */

import {
  matchPurchaseLines,
  type LineMatch,
  type MatchableInvoice,
  type MatchableItem,
  type MatchableLine,
} from "@/lib/purchaseLineMatcher";
import type { ProformaLine } from "@/lib/proforma";

export interface WorksheetPurchaseLine {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  amount_excl_vat: number;
  vat_rate: number;
  amount_incl_vat: number;
  charge_status: string;
  skip_reason: string | null;
  item_id: string | null;
  lodging_quote_id: string | null;
  request_id: string | null;
}

export interface WorksheetInvoice {
  id: string;
  partner_id: string | null;
  partner_name: string | null;
  invoice_number: string | null;
  amount_incl_vat: number;
  billed_to?: string | null;
  allocated_item_ids?: string[];
}

export interface WorksheetItem {
  id: string;
  provider_id: string | null;
  day_index: number;
  status: string;
  override_people?: number | null;
}

/** Wat de ordening nodig heeft; het klantportaal kent alleen deze velden. */
export type OrderableLine = Pick<ProformaLine, "id" | "sort_order" | "created_at" | "replaces_line_id" | "line_key">;

const byOrder = (a: OrderableLine, b: OrderableLine) =>
  a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at);

/**
 * Regels in weergavevolgorde: de volgorde van de specificatie, een
 * vervangen regel direct gevolgd door de inkoopregels die hem vervangen,
 * losse regels (zonder onderdeel, uit inkoop of handmatig) daarna. De
 * teruggegeven kopie heeft een doorlopende `sort_order`, zodat voorbeeld en
 * PDF (die per sectie op `sort_order` sorteren) dezelfde volgorde tonen.
 */
export function orderProformaLines<T extends OrderableLine>(lines: T[]): T[] {
  const replacing = new Map<string, T[]>();
  const base: T[] = [];
  const loose: T[] = [];
  for (const line of lines) {
    if (line.replaces_line_id) {
      const arr = replacing.get(line.replaces_line_id) ?? [];
      arr.push(line);
      replacing.set(line.replaces_line_id, arr);
    } else if (line.line_key) {
      base.push(line);
    } else {
      loose.push(line);
    }
  }
  const ordered: T[] = [];
  const push = (line: T) => {
    ordered.push(line);
    for (const sub of (replacing.get(line.id) ?? []).sort(byOrder)) push(sub);
  };
  for (const line of base.sort(byOrder)) push(line);
  for (const line of loose.sort(byOrder)) push(line);
  // Regels die iets vervangen dat niet (meer) bestaat: achteraan, niet kwijt.
  const seen = new Set(ordered.map((l) => l.id));
  for (const line of lines) if (!seen.has(line.id)) ordered.push(line);
  return ordered.map((line, idx) => ({ ...line, sort_order: idx }));
}

/** Secties in factuurvolgorde met hun regels. */
export function sectionsOf(ordered: ProformaLine[]): Array<{ label: string; lines: ProformaLine[] }> {
  const map = new Map<string, ProformaLine[]>();
  for (const line of ordered) {
    const arr = map.get(line.section) ?? [];
    arr.push(line);
    map.set(line.section, arr);
  }
  return [...map.entries()].map(([label, lines]) => ({ label, lines }));
}

export interface WorksheetPurchaseState {
  /** Nog niet op de factuur en niet gelaten. */
  open: WorksheetPurchaseLine[];
  /** Gelaten: niet op de factuur, met reden. */
  kept: WorksheetPurchaseLine[];
  /** Op de proforma (via een proformaregel) of via de logiesofferte. */
  charged: WorksheetPurchaseLine[];
}

/**
 * Welke inkoopregels waar staan. Een regel staat op de factuur als een
 * proformaregel hem als bron heeft, als hij via de logiesofferte is
 * verwerkt, of als hij vóór de proforma al op offerteprijs of als
 * partnerverdeling was afgehandeld. Regels van een factuur die de gast zelf
 * betaalde horen nergens op de klantfactuur en tellen als gelaten.
 */
export function worksheetPurchaseLines(
  purchaseLines: WorksheetPurchaseLine[],
  proformaLines: ProformaLine[],
  invoices: WorksheetInvoice[],
): WorksheetPurchaseState {
  const onProforma = new Set(proformaLines.map((l) => l.purchase_invoice_line_id).filter(Boolean));
  const customerBilled = new Set(invoices.filter((i) => i.billed_to === "customer").map((i) => i.id));
  const state: WorksheetPurchaseState = { open: [], kept: [], charged: [] };
  for (const line of purchaseLines) {
    // kept_quote en legacy komen van vóór de proforma: de klant betaalt de
    // offerteprijs, de verdeling voor de commissie staat al. Niet opnieuw open.
    if (onProforma.has(line.id) || line.lodging_quote_id || line.charge_status === "kept_quote" || line.charge_status === "legacy") {
      state.charged.push(line);
    } else if (line.charge_status === "skipped" || customerBilled.has(line.invoice_id)) state.kept.push(line);
    else state.open.push(line);
  }
  return state;
}

/** Een offerteregel met onderdeel die vervangen kan worden. */
export const isReplaceableQuoteLine = (line: ProformaLine): boolean =>
  line.origin === "quote_item" && line.item_id != null && line.line_status !== "hidden" && line.kind !== "sub";

/**
 * Kandidaten voor de matcher: de offerteregels van de proforma, met de
 * aanbieder en de dag van hun onderdeel. De sleutel is het onderdeel, zodat
 * de bestaande scores (enige onderdeel, bedrag gelijk, datum, woorden) gewoon
 * werken; `lineByItem` vertaalt terug naar de proformaregel.
 */
export function matchableItemsFromProforma(
  proformaLines: ProformaLine[],
  items: WorksheetItem[],
  numberOfPeople: number | null,
  selectedDates: string[],
): { matchable: MatchableItem[]; lineByItem: Map<string, ProformaLine> } {
  const itemById = new Map(items.map((it) => [it.id, it]));
  const matchable: MatchableItem[] = [];
  const lineByItem = new Map<string, ProformaLine>();
  for (const line of proformaLines) {
    if (!isReplaceableQuoteLine(line) || !line.item_id) continue;
    const item = itemById.get(line.item_id);
    if (!item || item.status === "cancelled") continue;
    if (lineByItem.has(line.item_id)) continue;
    lineByItem.set(line.item_id, line);
    matchable.push({
      id: line.item_id,
      name: line.description,
      providerId: item.provider_id ?? null,
      dayIndex: item.day_index,
      status: item.status,
      quotedInclVat: line.quote_amount_incl_vat ?? line.amount_incl_vat,
      people: item.override_people ?? numberOfPeople ?? null,
      date: item.day_index >= 0 ? selectedDates[item.day_index] ?? null : null,
    });
  }
  return { matchable, lineByItem };
}

export type Destination =
  | { kind: "replace"; lineId: string }
  | { kind: "add" }
  | { kind: "keep"; reason: string | null }
  /** Via de logiesofferte (`apply-purchase-invoice-to-lodging`): kamerprijs of extra. */
  | { kind: "lodging"; quoteId: string; target: "room" | "extra" };

export interface WorksheetLodgingQuote {
  id: string;
  partner_id: string | null;
  accommodation_name: string;
}

export interface DestinationProposal {
  purchaseLineId: string;
  destination: Destination;
  /** Zeker genoeg om alvast aan te vinken. */
  sure: boolean;
  reason: string | null;
  match: LineMatch;
}

/** Voorstellen voor de open inkoopregels, vertaald naar proformaregels. */
export function proposeDestinations(args: {
  openLines: WorksheetPurchaseLine[];
  invoices: WorksheetInvoice[];
  proformaLines: ProformaLine[];
  items: WorksheetItem[];
  numberOfPeople: number | null;
  selectedDates: string[];
  /** Logiesoffertes van dit programma: een factuur van die partner hoort op de offerte, niet als kostenpost. */
  lodgingQuotes?: WorksheetLodgingQuote[];
}): DestinationProposal[] {
  const { matchable, lineByItem } = matchableItemsFromProforma(args.proformaLines, args.items, args.numberOfPeople, args.selectedDates);
  const invoiceById = new Map(args.invoices.map((inv) => [inv.id, inv]));
  const lodgingByPartner = new Map<string, WorksheetLodgingQuote>();
  for (const q of args.lodgingQuotes ?? []) if (q.partner_id && !lodgingByPartner.has(q.partner_id)) lodgingByPartner.set(q.partner_id, q);
  const invoices: MatchableInvoice[] = args.invoices.map((inv) => ({
    id: inv.id,
    partnerId: inv.partner_id,
    partnerName: inv.partner_name,
    invoiceNumber: inv.invoice_number,
    amountInclVat: inv.amount_incl_vat,
    allocatedItemIds: inv.allocated_item_ids ?? [],
  }));
  const lines: MatchableLine[] = args.openLines.map((l) => ({
    id: l.id,
    invoiceId: l.invoice_id,
    description: l.description,
    quantity: Number(l.quantity) || 1,
    amountExclVat: Number(l.amount_excl_vat),
    amountInclVat: Number(l.amount_incl_vat),
    vatRate: Number(l.vat_rate),
  }));
  const matches = matchPurchaseLines({ lines, invoices, items: matchable });
  return matches.map((match) => {
    const p = match.proposal;
    if (p.kind === "skip") {
      return { purchaseLineId: match.lineId, destination: { kind: "keep", reason: p.label }, sure: true, reason: p.label, match };
    }
    if (p.kind === "item") {
      const line = lineByItem.get(p.itemId);
      if (line) {
        return {
          purchaseLineId: match.lineId,
          destination: { kind: "replace", lineId: line.id },
          sure: p.confidence === "sure",
          reason: p.reasons.join(", "),
          match,
        };
      }
    }
    // Factuur van de accommodatie: de kamerprijs of een extra bij de
    // logiesofferte, anders komt het logies twee keer op de factuur.
    const partnerId = invoiceById.get(lines.find((l) => l.id === match.lineId)?.invoiceId ?? "")?.partner_id ?? null;
    const lodging = partnerId ? lodgingByPartner.get(partnerId) : undefined;
    if (lodging) {
      return {
        purchaseLineId: match.lineId,
        destination: { kind: "lodging", quoteId: lodging.id, target: "room" },
        sure: false,
        reason: `partner van de logiesofferte ${lodging.accommodation_name}: kamer of extra, niet als eigen regel`,
        match,
      };
    }
    const reason = p.kind === "new_cost" ? p.reason : null;
    return { purchaseLineId: match.lineId, destination: { kind: "add" }, sure: true, reason, match };
  });
}

export interface ItemFigures {
  /** Offertebedrag van nu (volgt de offerte). */
  quote: number;
  /** Som van alle inkoopregels van dit onderdeel, ook niet doorbelaste. */
  purchase: number | null;
  /** Wat er nu op de factuur staat: de regel zelf of de regels die hem vervangen. */
  invoice: number;
}

/** De drie getallen bij een offerteregel met onderdeel. */
export function itemFigures(
  line: ProformaLine,
  proformaLines: ProformaLine[],
  purchaseLines: WorksheetPurchaseLine[],
): ItemFigures {
  const quote = Number(line.quote_amount_incl_vat ?? line.amount_incl_vat) || 0;
  const purchaseForItem = line.item_id ? purchaseLines.filter((p) => p.item_id === line.item_id) : [];
  const purchase = purchaseForItem.length > 0 ? purchaseForItem.reduce((s, p) => s + Number(p.amount_incl_vat), 0) : null;
  const invoice =
    line.line_status === "active"
      ? Number(line.amount_incl_vat)
      : line.line_status === "replaced"
        ? proformaLines
            .filter((l) => l.replaces_line_id === line.id && l.line_status === "active")
            .reduce((s, l) => s + Number(l.amount_incl_vat), 0)
        : 0;
  const r = (n: number) => Math.round(n * 100) / 100;
  return { quote: r(quote), purchase: purchase == null ? null : r(purchase), invoice: r(invoice) };
}

export type ProformaChange =
  | { action: "replace"; line_id: string; purchase_line_ids: string[] }
  | { action: "add"; purchase_line_ids: string[]; section?: string }
  | { action: "revert"; line_id: string }
  | { action: "hide"; line_id: string; reason: string | null }
  | { action: "unhide"; line_id: string }
  | { action: "keep"; purchase_line_id: string; reason: string | null }
  | { action: "reopen"; purchase_line_id: string };

/** Bestemmingen uit het werkblad gebundeld tot besluiten voor `apply_proforma_changes`. */
export function changesFromDestinations(chosen: Array<{ purchaseLineId: string; destination: Destination }>): ProformaChange[] {
  const replaceByLine = new Map<string, string[]>();
  const add: string[] = [];
  const changes: ProformaChange[] = [];
  for (const { purchaseLineId, destination } of chosen) {
    if (destination.kind === "replace") {
      const arr = replaceByLine.get(destination.lineId) ?? [];
      arr.push(purchaseLineId);
      replaceByLine.set(destination.lineId, arr);
    } else if (destination.kind === "add") {
      add.push(purchaseLineId);
    } else if (destination.kind === "keep") {
      changes.push({ action: "keep", purchase_line_id: purchaseLineId, reason: destination.reason });
    }
    // "lodging" loopt via de edge function, niet via apply_proforma_changes.
  }
  for (const [lineId, ids] of replaceByLine) changes.push({ action: "replace", line_id: lineId, purchase_line_ids: ids });
  if (add.length > 0) changes.push({ action: "add", purchase_line_ids: add });
  return changes;
}

/** Tekst bij een herkomst, voor de pill op de regel. */
export function originLabel(line: ProformaLine): string {
  switch (line.origin) {
    case "quote_item":
      return "Offerte";
    case "lodging":
      return "Logies";
    case "fee":
      return "Automatisch";
    case "purchase_line":
      return "Inkoop";
    case "post_charge":
      return "Nacalculatie";
    default:
      return "Handmatig";
  }
}

/**
 * Voorstellen voor het werkblad Doorbelasten: waar hoort een inkoopregel?
 *
 * Per regel van een inkoopfactuur zoekt de matcher een bestemming in het
 * programma van het project. Kandidaten zijn de onderdelen van de partner
 * die de factuur stuurde, plus de bestaande kostenposten. Elk signaal
 * (bedrag, datum, woorden, aantal, "enige onderdeel") geeft punten en een
 * reden die het scherm kan tonen. Zonder bruikbare kandidaat wordt de regel
 * een nieuwe kostenpost; toeristenbelasting wordt nooit doorbelast.
 *
 * Deze module rekent alleen; het scherm beslist en de databasefunctie
 * `apply_purchase_line_charges` schrijft (docs/plan-inkoopfacturen-doorbelasten.md, §4).
 */

/**
 * Herkent een factuurregel voor toeristenbelasting aan de omschrijving. Zo'n
 * regel betaalt het bureau wel aan de partner, maar belast het nooit door: op
 * de klantfactuur staat de eigen toeristenbelasting al.
 */
export function isTouristTaxDescription(description: string | null | undefined): boolean {
  if (!description) return false;
  return /toeristen\s*belasting|verblijfs\s*belasting|tourist\s*tax|city\s*tax/i.test(description);
}

export interface MatchableLine {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  amountExclVat: number;
  amountInclVat: number;
  vatRate: number;
}

export interface MatchableInvoice {
  id: string;
  partnerId: string | null;
  partnerName: string | null;
  invoiceNumber: string | null;
  amountInclVat: number;
  /** Onderdelen waar de partner zelf (portaal) of een eerdere verdeling de factuur aan hing. */
  allocatedItemIds?: string[];
}

export interface MatchableItem {
  id: string;
  name: string;
  providerId: string | null;
  /** -1 voor overige kosten (kostenposten). */
  dayIndex: number;
  status: string;
  /** Offerteprijs incl. btw voor de hele groep, als bekend. */
  quotedInclVat: number | null;
  /** Aantal personen waarvoor het onderdeel is geboekt. */
  people: number | null;
  /** Uitvoeringsdatum (ISO yyyy-mm-dd) als de dag bekend is. */
  date: string | null;
}

export type Confidence = "sure" | "likely" | "none";

export interface ItemCandidate {
  itemId: string;
  score: number;
  reasons: string[];
}

export type Proposal =
  | { kind: "item"; itemId: string; score: number; reasons: string[]; confidence: Confidence }
  | { kind: "skip"; reason: "tourist_tax"; label: string }
  | { kind: "new_cost"; costKey: string; costName: string; reason: string };

export interface LineMatch {
  lineId: string;
  proposal: Proposal;
  candidates: ItemCandidate[];
}

export const SURE_THRESHOLD = 80;
export const LIKELY_THRESHOLD = 50;

const STOPWORDS = new Set([
  "de", "het", "een", "en", "of", "van", "voor", "met", "op", "in", "te", "bij", "per",
  "pers", "personen", "persoon", "pp", "stuks", "stuk", "x", "incl", "excl", "btw", "totaal",
  "the", "and", "for", "a", "aan", "naar", "ca", "ivm", "t/m", "tm", "dag", "dagen",
]);

/** Woorden van minstens drie letters, zonder stopwoorden en cijfers. */
export function keywords(text: string): Set<string> {
  const out = new Set<string>();
  for (const raw of text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/[^a-z0-9]+/)) {
    if (raw.length < 3 || STOPWORDS.has(raw) || /^\d+$/.test(raw)) continue;
    out.add(raw);
  }
  return out;
}

/** Datums als "12-08", "12/8", "12 aug", "12 augustus" in een omschrijving → maand/dag. */
export function datesInText(text: string): Array<{ month: number; day: number }> {
  const months: Record<string, number> = {
    jan: 1, feb: 2, mrt: 3, maa: 3, apr: 4, mei: 5, jun: 6, jul: 7, aug: 8, sep: 9, okt: 10, nov: 11, dec: 12,
  };
  const found: Array<{ month: number; day: number }> = [];
  const numeric = /\b(\d{1,2})[-/.](\d{1,2})(?:[-/.](\d{2,4}))?\b/g;
  let m: RegExpExecArray | null;
  while ((m = numeric.exec(text)) !== null) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) found.push({ month, day });
  }
  const named = /\b(\d{1,2})\s+(jan|feb|mrt|maa|apr|mei|jun|jul|aug|sep|okt|nov|dec)[a-z]*\b/gi;
  while ((m = named.exec(text)) !== null) {
    const day = Number(m[1]);
    const month = months[m[2].toLowerCase()];
    if (day >= 1 && day <= 31 && month) found.push({ month, day });
  }
  return found;
}

const sameMonthDay = (iso: string, d: { month: number; day: number }): boolean => {
  const [, mm, dd] = iso.split("-").map(Number);
  return mm === d.month && dd === d.day;
};

const closeAmount = (a: number, b: number): boolean => {
  const diff = Math.abs(a - b);
  return diff <= 2 || diff / Math.max(Math.abs(b), 0.01) <= 0.02;
};

const closeQuantity = (qty: number, people: number): boolean =>
  people > 0 && Math.abs(qty - people) / people <= 0.1;

export interface MatchInput {
  lines: MatchableLine[];
  invoices: MatchableInvoice[];
  items: MatchableItem[];
}

const ACTIVE = (item: MatchableItem) => item.status !== "cancelled";

const COST_WORDS = /\b(borg|servicekosten|bezorg|bezorging|fooi|schade|administratiekosten|reserveringskosten|verzend|toeslag|annulering)\b/i;

const isCostItem = (item: MatchableItem) => item.dayIndex === -1;

/** Score per onderdeel voor één regel; alleen onderdelen van dezelfde partner tellen. */
export function scoreLine(
  line: MatchableLine,
  invoice: MatchableInvoice,
  invoiceLines: MatchableLine[],
  items: MatchableItem[],
): ItemCandidate[] {
  const partnerItems = items.filter(
    (it) => ACTIVE(it) && !isCostItem(it) && invoice.partnerId != null && it.providerId === invoice.partnerId,
  );
  if (partnerItems.length === 0) return [];

  const invoiceTotal = invoiceLines.reduce((s, l) => s + l.amountInclVat, 0);
  // Bijkomende kosten (borg, reserveringskosten, …) liften niet mee op
  // "de hele factuur is dit onderdeel": die moeten op eigen kracht matchen.
  const costLike = COST_WORDS.test(line.description);
  const lineWords = keywords(line.description);
  const lineDates = datesInText(line.description);
  const allocated = new Set(invoice.allocatedItemIds ?? []);

  const candidates: ItemCandidate[] = partnerItems.map((item) => {
    let score = 0;
    const reasons: string[] = [];

    if (partnerItems.length === 1) {
      score += 40;
      reasons.push("enige onderdeel van deze partner");
    }
    if (allocated.has(item.id)) {
      score += 60;
      reasons.push("al aan dit onderdeel gekoppeld");
    }
    if (item.quotedInclVat != null && item.quotedInclVat > 0) {
      if (closeAmount(line.amountInclVat, item.quotedInclVat)) {
        score += 50;
        reasons.push("bedrag gelijk aan de offerte");
      } else if (!costLike && invoiceLines.length > 1 && closeAmount(invoiceTotal, item.quotedInclVat)) {
        score += 40;
        reasons.push("factuurtotaal gelijk aan de offerte");
      }
    }
    if (item.date && lineDates.some((d) => sameMonthDay(item.date!, d))) {
      score += 30;
      reasons.push(`datum ${item.date.slice(8, 10)}-${item.date.slice(5, 7)} is de uitvoeringsdag`);
    }
    const itemWords = keywords(item.name);
    let overlap = 0;
    const hits: string[] = [];
    for (const w of lineWords) {
      if (itemWords.has(w) || [...itemWords].some((iw) => iw.length >= 5 && (iw.startsWith(w) || w.startsWith(iw)))) {
        overlap += 1;
        hits.push(w);
      }
    }
    if (overlap > 0) {
      score += Math.min(30, overlap * 10);
      reasons.push(`omschrijving noemt ${hits.slice(0, 3).map((h) => `“${h}”`).join(", ")}`);
    }
    if (item.people != null && line.quantity > 1 && closeQuantity(line.quantity, item.people)) {
      score += 15;
      reasons.push(`aantal ${line.quantity} past bij ${item.people} personen`);
    }

    return { itemId: item.id, score, reasons };
  });

  return candidates.filter((c) => c.score > 0).sort((a, b) => b.score - a.score);
}

export function confidenceFor(score: number): Confidence {
  if (score >= SURE_THRESHOLD) return "sure";
  if (score >= LIKELY_THRESHOLD) return "likely";
  return "none";
}

export type LodgingExtraCategory = "fb" | "facilities" | "transport" | "other";

/** Categorie van een extra bij een logies-offerte, uit de omschrijving. */
export function lodgingExtraCategory(description: string): LodgingExtraCategory {
  const text = description.toLowerCase();
  if (/ontbijt|lunch|diner|dinner|drank|borrel|bbq|barbecue|maaltijd|koffie|thee|catering|buffet|wijn|bier/.test(text)) return "fb";
  if (/zaal|ruimte|vergader|sauna|zwembad|wellness|fiets|huur|linnen|handdoek|schoonmaak|eindschoonmaak/.test(text)) return "facilities";
  if (/vervoer|transfer|taxi|bus|boot|overtocht/.test(text)) return "transport";
  return "other";
}

/** Standaardnaam van de kostenpost waar de restregels van een factuur op komen. */
export function defaultCostName(invoice: MatchableInvoice): string {
  const partner = invoice.partnerName?.trim();
  if (partner) return partner;
  return invoice.invoiceNumber ? `Inkoopfactuur ${invoice.invoiceNumber}` : "Overige kosten";
}

/** Bestemmingen voorstellen voor alle regels van het project. */
export function matchPurchaseLines(input: MatchInput): LineMatch[] {
  const invoiceById = new Map(input.invoices.map((i) => [i.id, i]));
  const linesByInvoice = new Map<string, MatchableLine[]>();
  for (const line of input.lines) {
    const arr = linesByInvoice.get(line.invoiceId) ?? [];
    arr.push(line);
    linesByInvoice.set(line.invoiceId, arr);
  }

  return input.lines.map((line) => {
    const invoice = invoiceById.get(line.invoiceId);
    if (!invoice) {
      return {
        lineId: line.id,
        proposal: { kind: "new_cost", costKey: line.invoiceId, costName: "Overige kosten", reason: "factuur onbekend" },
        candidates: [],
      };
    }

    if (isTouristTaxDescription(line.description)) {
      return {
        lineId: line.id,
        proposal: {
          kind: "skip",
          reason: "tourist_tax",
          label: "toeristenbelasting rekent het bureau zelf aan de klant",
        },
        candidates: [],
      };
    }

    const candidates = scoreLine(line, invoice, linesByInvoice.get(line.invoiceId) ?? [], input.items);
    const best = candidates[0];
    const costLike = COST_WORDS.test(line.description);

    if (best && best.score >= LIKELY_THRESHOLD && !(costLike && best.score < SURE_THRESHOLD)) {
      return {
        lineId: line.id,
        proposal: {
          kind: "item",
          itemId: best.itemId,
          score: best.score,
          reasons: best.reasons,
          confidence: confidenceFor(best.score),
        },
        candidates,
      };
    }

    return {
      lineId: line.id,
      proposal: {
        kind: "new_cost",
        costKey: invoice.partnerId ?? invoice.id,
        costName: defaultCostName(invoice),
        reason: costLike
          ? "bijkomende kosten, geen programma-onderdeel"
          : best
            ? "geen onderdeel dat zeker genoeg past"
            : "geen onderdeel van deze partner in het programma",
      },
      candidates,
    };
  });
}

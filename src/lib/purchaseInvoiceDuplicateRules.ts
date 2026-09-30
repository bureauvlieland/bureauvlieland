/**
 * Regels om een dubbel geregistreerde inkoopfactuur te herkennen.
 *
 * Dezelfde factuur kan langs twee wegen binnenkomen: de partner registreert
 * hem in het portaal, en de PDF komt (ook) via de inkoop-inbox of wordt door
 * het bureau handmatig ingevoerd. Vult de partner daarbij een ander nummer in
 * (bijvoorbeeld onze projectreferentie in plaats van zijn eigen factuurnummer),
 * dan zag een controle op alleen het nummer daar niets van. Zo is één factuur
 * in juli 2026 twee keer uitbetaald.
 *
 * Daarom kijken we hier naar twee signalen:
 *  1. zelfde partner + zelfde (genormaliseerd) factuurnummer;
 *  2. zelfde partner + zelfde bedrag incl. btw, op hetzelfde project of met
 *     factuurdata dicht bij elkaar.
 *
 * Dit bestand staat twee keer in de repo: `src/lib/` (frontend) en
 * `supabase/functions/_shared/` (edge functions). Een test bewaakt dat beide
 * kopieën gelijk zijn. Geen imports, zodat het in Deno én Vitest laadt.
 */

/** Spaties, streepjes, punten en underscores weg, hoofdletters. "F-2026.001" == "f2026001". */
export function normalizeInvoiceNumber(value: string | null | undefined): string {
  return (value || "").replace(/[\s\-_.]/g, "").toUpperCase();
}

/**
 * Lijkt dit nummer op een projectreferentie van Bureau Vlieland (BV-JJMM-NNNN
 * of LOG-JJMM-NNNN)? Partners vullen die soms in als factuurnummer; dat is
 * nooit hun eigen nummer, dus we wijzen het af.
 */
export function looksLikeProjectReference(value: string | null | undefined): boolean {
  return /^(BV|LOG)\d{8}$/.test(normalizeInvoiceNumber(value));
}

/** Twee bedragen gelden als gelijk binnen deze marge (afrondverschillen). */
export const DUPLICATE_AMOUNT_TOLERANCE = 0.02;
/** Zonder gedeeld project: factuurdata moeten binnen dit aantal dagen liggen. */
export const DUPLICATE_DATE_WINDOW_DAYS = 60;

export interface DuplicateCandidate {
  id: string;
  invoice_number: string | null;
  invoice_date: string | null;
  amount_incl_vat: number | null;
  request_id?: string | null;
}

export interface DuplicateProbe {
  invoice_number?: string | null;
  invoice_date?: string | null;
  amount_incl_vat?: number | null;
  request_id?: string | null;
}

export type DuplicateReason = "number" | "amount";

export interface DuplicateMatch<T extends DuplicateCandidate = DuplicateCandidate> {
  invoice: T;
  reason: DuplicateReason;
}

const daysBetween = (a: string, b: string): number | null => {
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  if (Number.isNaN(ta) || Number.isNaN(tb)) return null;
  return Math.abs(ta - tb) / (1000 * 60 * 60 * 24);
};

/** Zelfde bedrag, en op hetzelfde project of met data dicht bij elkaar. */
export function isAmountDuplicate(probe: DuplicateProbe, existing: DuplicateCandidate): boolean {
  const a = Number(probe.amount_incl_vat);
  const b = Number(existing.amount_incl_vat);
  if (!a || !b) return false;
  if (Math.abs(a - b) > DUPLICATE_AMOUNT_TOLERANCE) return false;
  if (probe.request_id && existing.request_id) {
    return probe.request_id === existing.request_id;
  }
  if (probe.invoice_date && existing.invoice_date) {
    const days = daysBetween(probe.invoice_date, existing.invoice_date);
    return days !== null && days <= DUPLICATE_DATE_WINDOW_DAYS;
  }
  return false;
}

/**
 * Zoek in de facturen van dezelfde partner naar een waarschijnlijke dubbele.
 * Een nummer-match weegt zwaarder dan een bedrag-match; de aanroeper filtert
 * al op partner.
 */
export function findLikelyDuplicate<T extends DuplicateCandidate>(
  probe: DuplicateProbe,
  existing: T[],
  options?: { excludeId?: string | null },
): DuplicateMatch<T> | null {
  const rows = options?.excludeId ? existing.filter((r) => r.id !== options.excludeId) : existing;
  const normalized = normalizeInvoiceNumber(probe.invoice_number);
  if (normalized) {
    const byNumber = rows.find((r) => normalizeInvoiceNumber(r.invoice_number) === normalized);
    if (byNumber) return { invoice: byNumber, reason: "number" };
  }
  const byAmount = rows.find((r) => isAmountDuplicate(probe, r));
  if (byAmount) return { invoice: byAmount, reason: "amount" };
  return null;
}

export interface SelectionRow extends DuplicateCandidate {
  partner_id: string;
}

export interface SelectionDuplicateGroup<T extends SelectionRow = SelectionRow> {
  partnerId: string;
  reason: DuplicateReason;
  rows: T[];
}

/**
 * Groepeer een selectie (bijvoorbeeld van een betaalbatch) op waarschijnlijke
 * dubbelen: eerst op nummer, daarna op bedrag. Een rij zit in hooguit één groep.
 */
export function findDuplicateGroupsInSelection<T extends SelectionRow>(
  rows: T[],
): SelectionDuplicateGroup<T>[] {
  const groups: SelectionDuplicateGroup<T>[] = [];
  const taken = new Set<string>();

  const byNumber = new Map<string, T[]>();
  for (const row of rows) {
    const nr = normalizeInvoiceNumber(row.invoice_number);
    if (!row.partner_id || !nr) continue;
    const key = `${row.partner_id}::${nr}`;
    byNumber.set(key, [...(byNumber.get(key) ?? []), row]);
  }
  for (const group of byNumber.values()) {
    if (group.length < 2) continue;
    group.forEach((r) => taken.add(r.id));
    groups.push({ partnerId: group[0].partner_id, reason: "number", rows: group });
  }

  for (let i = 0; i < rows.length; i++) {
    const a = rows[i];
    if (!a.partner_id || taken.has(a.id)) continue;
    const group: T[] = [a];
    for (let j = i + 1; j < rows.length; j++) {
      const b = rows[j];
      if (b.partner_id !== a.partner_id || taken.has(b.id)) continue;
      if (isAmountDuplicate(a, b)) group.push(b);
    }
    if (group.length < 2) continue;
    group.forEach((r) => taken.add(r.id));
    groups.push({ partnerId: a.partner_id, reason: "amount", rows: group });
  }

  return groups;
}

export interface ItemInvoiceLink {
  item_id: string | null;
  invoice_id: string;
  invoice_number: string | null;
}

/**
 * Welke van deze onderdelen hebben al een inkoopfactuur (direct of via een
 * verdeling)? Geeft per onderdeel de eerste gevonden factuur terug.
 */
export function findItemsAlreadyInvoiced(
  itemIds: string[],
  links: ItemInvoiceLink[],
): Map<string, ItemInvoiceLink> {
  const wanted = new Set(itemIds);
  const found = new Map<string, ItemInvoiceLink>();
  for (const link of links) {
    if (!link.item_id || !wanted.has(link.item_id) || found.has(link.item_id)) continue;
    found.set(link.item_id, link);
  }
  return found;
}

/**
 * Partnersuggestie bij een gescande inkoopfactuur.
 *
 * De scanner leest de leveranciersnaam zoals die op de factuur staat; bij ons
 * staat de partner vaak anders geschreven. "Jan van Vlieland Fietsverhuur &
 * Bagagevervoer" op de factuur is bij ons "Fietsverhuur Jan van Vlieland":
 * dezelfde woorden in een andere volgorde, met een extra activiteit erbij. Een
 * letterlijke vergelijking vindt dat niet.
 *
 * Daarom in volgorde van zekerheid:
 * 1. Het IBAN op de factuur is bij een partner geregistreerd.
 * 2. De naam is gelijk, of de ene bevat de andere (rechtsvorm en leestekens
 *    buiten beschouwing).
 * 3. Alle woorden van de partnernaam komen in de leveranciersnaam voor. Bij
 *    meerdere partners wint degene die het grootste deel van de leveranciers-
 *    naam verklaart; bij gelijkspel is er geen suggestie.
 */

import { normalizeForMatch } from "@/lib/purchaseInvoiceProjectSuggestion";
import { normalizeIban, parseIbanList } from "@/lib/ibanList";

export interface SuggestablePartner {
  id: string;
  name: string;
  iban?: string | null;
}

export type PartnerMatchReason = "iban" | "name" | "words";

export interface PartnerSuggestion {
  partnerId: string;
  reason: PartnerMatchReason;
}

/** Rechtsvormen en voegwoorden zeggen niets over wélk bedrijf het is. */
const NOISE_WORDS = new Set([
  "bv", "b", "v", "nv", "n", "vof", "cv", "c", "bvba", "gmbh", "ltd", "inc",
  "en", "and", "de", "het", "the",
]);

const significantWords = (value: string): string[] =>
  normalizeForMatch(value).split(" ").filter((w) => w && !NOISE_WORDS.has(w));

export function suggestPartner(
  scanned: { supplier_name?: string | null; supplier_iban?: string | null },
  partners: SuggestablePartner[],
): PartnerSuggestion | null {
  const iban = scanned.supplier_iban ? normalizeIban(scanned.supplier_iban) : "";
  if (iban) {
    const byIban = partners.find((p) => p.iban && parseIbanList(p.iban).includes(iban));
    if (byIban) return { partnerId: byIban.id, reason: "iban" };
  }

  const supplier = scanned.supplier_name ? normalizeForMatch(scanned.supplier_name) : "";
  if (!supplier) return null;
  const supplierWords = significantWords(supplier);
  const supplierJoined = supplierWords.join(" ");

  const exact = partners.find((p) => normalizeForMatch(p.name) === supplier);
  if (exact) return { partnerId: exact.id, reason: "name" };

  const contains = partners.find((p) => {
    const name = significantWords(p.name).join(" ");
    return name.length >= 4 && (` ${supplierJoined} `.includes(` ${name} `) || ` ${name} `.includes(` ${supplierJoined} `));
  });
  if (contains) return { partnerId: contains.id, reason: "name" };

  if (supplierWords.length === 0) return null;
  const supplierSet = new Set(supplierWords);
  let best: { partnerId: string; coverage: number } | null = null;
  let tie = false;
  for (const p of partners) {
    const words = significantWords(p.name);
    // Eén los woord ("Vlieland") is geen bedrijfsnaam; daar matchen we niet op.
    if (words.length < 2 || !words.every((w) => supplierSet.has(w))) continue;
    const coverage = new Set(words).size / supplierSet.size;
    if (!best || coverage > best.coverage) {
      best = { partnerId: p.id, coverage };
      tie = false;
    } else if (coverage === best.coverage) {
      tie = true;
    }
  }
  if (!best || tie) return null;
  return { partnerId: best.partnerId, reason: "words" };
}

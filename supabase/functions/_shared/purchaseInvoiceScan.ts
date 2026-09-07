/**
 * Eén prompt, één schema en één nabewerking voor het scannen van inkoopfacturen.
 *
 * Er waren twee scanners: `scan-purchase-invoice` voor het uploaden vanuit de
 * admin, en `scan-purchase-invoice-internal` voor facturen die per mail in de
 * inbox binnenkomen — de route waarlangs de meeste facturen komen. Elk had een
 * eigen kopie van de prompt en het schema, en ze waren uit elkaar gelopen.
 *
 * De interne miste het belangrijkste: het veld `prices_include_vat` én de
 * nabewerking die inclusieve regelprijzen naar exclusief omrekent. Op een
 * horecabon — waar de prijskolom vrijwel altijd inclusief btw is — betekende dat
 * een grondslag die er zo'n 9 tot 21 % naast zat, precies op de route die het
 * meest gebruikt wordt.
 *
 * Deze module is wat beide functies nu delen; ze houden alleen hun eigen
 * authenticatie en opslag.
 */

export const INVOICE_SCAN_SYSTEM_PROMPT =
  `Je bent een specialist in het analyseren van Nederlandse inkoopfacturen. Lees ALLE pagina's van de PDF zorgvuldig.

Extracteer gestructureerde data via de tool 'extract_invoice'. Belangrijke regels:
- Bedragen ALTIJD als getallen (geen €/EUR, geen duizendscheidingstekens, punt als decimaal — dus "1.234,56" → 1234.56).
- Datums in formaat YYYY-MM-DD.
- BTW-percentage als getal (0, 9 of 21 — geen %-teken).
- supplier_name = de leverancier/afzender (NIET de geadresseerde "Bureau Vlieland").
- supplier_iban = het IBAN-rekeningnummer van de LEVERANCIER zoals vermeld op de factuur (vaak in de voettekst of bij betaalinstructies). Schrijf zonder spaties (bv. NL12RABO0123456789). NOOIT het IBAN van Bureau Vlieland (de geadresseerde) invullen. Geen IBAN zichtbaar → null.
- Als een veld niet zichtbaar is, gebruik null.

VAT BREAKDOWN (KRITIEK):
- Vrijwel elke factuur toont onderaan een BTW-overzicht/grondslag-tabel met de subtotalen per tarief (bv. "9% over 871,56 = 78,44" en "21% over 231,40 = 48,60"). Lees dit overzicht ZORGVULDIG.
- Vul vat_breakdown ALTIJD in met één entry per uniek BTW-tarief dat op de factuur voorkomt (sla 0%-regels met bedrag 0 over).
- Staat er alleen een BTW-BEDRAG per tarief (bv. "BTW laag € 35,60") en geen grondslag? Bereken de grondslag dan zelf: bedrag ÷ (tarief/100).
- amount_excl in vat_breakdown is ALTIJD exclusief BTW (de grondslag/Exclusief-kolom, NIET de bruto-kolom).
- Som van vat_breakdown[].amount_excl MOET gelijk zijn aan amount_excl_vat (header).
- Som van vat_breakdown[].vat_amount MOET gelijk zijn aan vat_amount (header).
- BIJ GEMENGDE TARIEVEN (meerdere entries in vat_breakdown): zet header-veld vat_rate op null. NOOIT één tarief verzinnen — dat leidt tot foute herberekening.
- Bij één enkel tarief mag header vat_rate gelijk zijn aan dat tarief.

PRICES_INCLUDE_VAT (HEEL BELANGRIJK voor horeca/POS-bonnen):
- Op horeca-kassabonnen, restaurant-/cafénota's en POS-bonnen staan de prijzen in de kolom "Prijs"/"Totaal" vrijwel altijd INCLUSIEF BTW. Het regeltotaal en "Op factuur"/"Totaal" matchen het BRUTO-bedrag.
- Op zakelijke facturen (PDF met factuurlay-out, BTW-kolom per regel, "Subtotaal/Excl. BTW"-totaal) staan prijzen meestal EXCLUSIEF BTW.
- Bepaal dit per factuur en zet prices_include_vat = true of false.
- Heuristieken voor INCL:
  * Kolomkoppen "Aant / Artikel / Prijs / Totaal" zonder expliciete "Excl"-aanduiding.
  * Aanwezigheid van "Bruto"-kolom in onderstaande BTW-tabel.
  * Sum(line_items.quantity * unit_price) ≈ amount_incl_vat (binnen €1).
  * Sum(line_items.quantity * unit_price) > amount_excl_vat * 1.05.
- Bij twijfel: vergelijk Σ(qty × unit_price) met amount_excl_vat en amount_incl_vat — kies het tarief waar de som het dichtst bij ligt.

ORDERREGELS:
- Vul line_items in met ALLE zichtbare regels van de factuur, indien herkenbaar.
- unit_price = exact wat in de "Prijs"-kolom staat (kan dus incl OF excl BTW zijn — dat geeft prices_include_vat aan).
- Per regel MOET je vat_rate invullen (BTW-tarief van die specifieke regel: 0, 9 of 21).
- Als regel-tarieven niet duidelijk te lezen zijn maar er WEL een BTW-overzicht is, mag line_items leeg blijven — vat_breakdown is dan leidend. Verzin liever geen tarief per regel dan een verkeerd tarief: het BTW-overzicht wint toch.

REKENKUNDIGE CHECK:
- amount_excl_vat + vat_amount = amount_incl_vat (controleer dit altijd!).`;

/** De tool-definitie met het schema; identiek voor beide scanroutes. */
export const INVOICE_SCAN_TOOL = {
  type: "function" as const,
  function: {
    name: "extract_invoice",
    description: "Extracteer factuurgegevens incl. orderregels per BTW-tarief",
    parameters: {
      type: "object",
      properties: {
        invoice_number: { type: ["string", "null"] },
        invoice_date: { type: ["string", "null"], description: "YYYY-MM-DD" },
        supplier_name: { type: ["string", "null"] },
        supplier_iban: {
          type: ["string", "null"],
          description:
            "IBAN van de leverancier zoals op de factuur, zonder spaties. NIET het IBAN van Bureau Vlieland.",
        },
        amount_excl_vat: { type: ["number", "null"] },
        vat_rate: { type: ["number", "null"], description: "0, 9 of 21 (hoofdtarief)" },
        vat_amount: { type: ["number", "null"] },
        amount_incl_vat: { type: ["number", "null"] },
        description: { type: ["string", "null"] },
        customer_reference: {
          type: ["string", "null"],
          description:
            'Voor wie het werk was: de groep, het gezelschap of de opdrachtgever die op de factuur genoemd wordt, bijvoorbeeld achter "Groep:", "T.b.v.", "Betreft" of "Referentie". Dit is NIET de leverancier en NIET Bureau Vlieland zelf. Neem de naam letterlijk over. Staat er niets: null.',
        },
        prices_include_vat: {
          type: ["boolean", "null"],
          description:
            "true als de unit_price in line_items INCLUSIEF BTW is (horeca/POS-bon), false als exclusief (zakelijke factuur).",
        },
        vat_breakdown: {
          type: "array",
          description: "Eén entry per uniek BTW-tarief op de factuur",
          items: {
            type: "object",
            properties: {
              vat_rate: { type: "number" },
              amount_excl: { type: "number" },
              vat_amount: { type: "number" },
            },
            required: ["vat_rate", "amount_excl", "vat_amount"],
            additionalProperties: false,
          },
        },
        line_items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              description: { type: "string" },
              quantity: { type: ["number", "null"] },
              unit_price: { type: ["number", "null"] },
              total_excl_vat: { type: ["number", "null"] },
              vat_rate: {
                type: ["number", "null"],
                description: "BTW-tarief van deze regel: 0, 9 of 21",
              },
            },
            required: ["description", "vat_rate"],
            additionalProperties: false,
          },
        },
      },
      required: [
        "invoice_number",
        "invoice_date",
        "supplier_name",
        "supplier_iban",
        "amount_excl_vat",
        "vat_rate",
        "vat_amount",
        "amount_incl_vat",
        "description",
        "customer_reference",
        "line_items",
        "vat_breakdown",
        "prices_include_vat",
      ],
      additionalProperties: false,
    },
  },
};

export const INVOICE_SCAN_USER_INSTRUCTION =
  "Analyseer deze inkoopfactuur en extracteer ALLE velden via de extract_invoice tool. Vul ALTIJD line_items in met vat_rate per regel.";

export interface ScannedLineItem {
  description?: string;
  quantity: number | null;
  unit_price: number | null;
  total_excl_vat: number | null;
  vat_rate: number | null;
}

export interface ScannedInvoice {
  amount_excl_vat?: number | null;
  amount_incl_vat?: number | null;
  prices_include_vat?: boolean | null;
  line_items?: ScannedLineItem[];
  [key: string]: unknown;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

const sumLines = (items: ScannedLineItem[]) =>
  items.reduce((s, li) => {
    const q = Number(li.quantity ?? 1) || 0;
    const u = Number(li.unit_price ?? 0) || 0;
    return s + q * u;
  }, 0);

/**
 * Rekent regelprijzen die inclusief btw zijn om naar exclusief.
 *
 * Het scherm berekent regeltotalen als aantal × prijs, en telt de btw daar
 * bovenop — het gaat dus uit van exclusieve prijzen. Staat er op de factuur een
 * inclusieve prijs (horeca), dan moet die hier omgerekend worden, anders komt de
 * grondslag te hoog uit.
 *
 * Of de prijzen inclusief zijn, wordt niet alleen aan de scanner overgelaten: de
 * som van de regels wordt naast het totaal ex én incl btw gelegd, en de dichtste
 * van de twee wint. Zo wordt een verkeerd ingevulde vlag alsnog gecorrigeerd.
 *
 * Wijkt de som na omrekening meer dan 50 cent af van het factuurtotaal ex btw,
 * dan worden de regels naar rato bijgesteld zodat ze weer aansluiten.
 */
export function normalizeScannedInvoice<T extends ScannedInvoice>(extracted: T): T {
  const items = Array.isArray(extracted.line_items) ? extracted.line_items : [];
  const headerExcl = Number(extracted.amount_excl_vat) || 0;
  const headerIncl = Number(extracted.amount_incl_vat) || 0;
  if (items.length === 0) return extracted;

  let pricesIncl: boolean | null =
    typeof extracted.prices_include_vat === "boolean" ? extracted.prices_include_vat : null;

  const total = sumLines(items);
  if (headerIncl > 0 && headerExcl > 0) {
    const distToIncl = Math.abs(total - headerIncl);
    const distToExcl = Math.abs(total - headerExcl);
    if (distToIncl + 0.5 < distToExcl) pricesIncl = true;
    else if (distToExcl + 0.5 < distToIncl) pricesIncl = false;
  }

  if (pricesIncl !== true) return extracted;

  for (const li of items) {
    const factor = 1 + (Number(li.vat_rate ?? 0) || 0) / 100;
    if (factor <= 0) continue;
    if (li.unit_price != null) li.unit_price = round2(Number(li.unit_price) / factor);
    if (li.total_excl_vat != null) li.total_excl_vat = round2(Number(li.total_excl_vat) / factor);
  }
  extracted.prices_include_vat = true;

  const newSum = sumLines(items);
  if (headerExcl > 0 && newSum > 0 && Math.abs(newSum - headerExcl) > 0.5) {
    const scale = headerExcl / newSum;
    for (const li of items) {
      if (li.unit_price != null) li.unit_price = round2(Number(li.unit_price) * scale);
    }
  }

  return extracted;
}

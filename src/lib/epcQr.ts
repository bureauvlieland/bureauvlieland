/**
 * EPC-QR (ook "GiroCode" of "SEPA-QR"): de QR-code die Nederlandse en
 * Europese bank-apps scannen om een overschrijving voor te vullen met IBAN,
 * naam, bedrag en omschrijving. Geen betaalprovider, geen kosten, werkt
 * zonder internet. Specificatie: European Payments Council, "Quick Response
 * Code: Guidelines to Enable Data Capture for the Initiation of a SEPA Credit
 * Transfer", versie 002 (BIC mag leeg blijven).
 *
 * Dezelfde functie staat in supabase/functions/_shared/epcQr.ts; houd ze gelijk.
 */

export interface EpcPaymentInput {
  /** Naam van de begunstigde, zoals op de rekening. */
  beneficiaryName: string;
  iban: string;
  /** Bedrag in euro; wordt op twee decimalen afgerond. */
  amount: number;
  /** Ongestructureerde omschrijving: het factuurnummer. */
  remittance: string;
  bic?: string | null;
}

const MAX_NAME = 70;
const MAX_REMITTANCE = 140;
const MIN_AMOUNT = 0.01;
const MAX_AMOUNT = 999999999.99;

export const normalizeIbanForEpc = (iban: string): string => iban.replace(/\s+/g, "").toUpperCase();

/**
 * De tekst in de QR-code, of null als er niets zinnigs te betalen is (geen
 * IBAN, geen naam, bedrag nul of negatief: een creditnota krijgt geen QR).
 */
export function buildEpcPayload(input: EpcPaymentInput): string | null {
  const iban = normalizeIbanForEpc(input.iban ?? "");
  const name = (input.beneficiaryName ?? "").trim().slice(0, MAX_NAME);
  const amount = Math.round((Number(input.amount) || 0) * 100) / 100;
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return null;
  if (!name) return null;
  if (amount < MIN_AMOUNT || amount > MAX_AMOUNT) return null;
  const remittance = (input.remittance ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, MAX_REMITTANCE);
  const bic = (input.bic ?? "").replace(/\s+/g, "").toUpperCase();

  return [
    "BCD", // service tag
    "002", // versie: BIC optioneel
    "1", // tekenset: UTF-8
    "SCT", // SEPA Credit Transfer
    bic,
    name,
    iban,
    `EUR${amount.toFixed(2)}`,
    "", // purpose
    "", // gestructureerde omschrijving
    remittance,
    "", // informatie aan de betaler
  ].join("\n");
}

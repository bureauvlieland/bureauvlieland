/**
 * Alle rekeningnummers die we van een partner kennen: het IBAN voor de
 * betaalbatches, het IBAN dat de partner zelf in het portaal opgaf, en de
 * overige IBAN's van de partnerpagina. Een partner kan van meerdere
 * rekeningen incasseren of betalen; de bankmatching kijkt naar allemaal.
 */
export interface PartnerIbanRow {
  iban?: string | null;
  bank_iban?: string | null;
  extra_ibans?: string[] | null;
}

export function partnerIbans(partner: PartnerIbanRow | null | undefined): string[] {
  if (!partner) return [];
  const all = [partner.iban, partner.bank_iban, ...(partner.extra_ibans ?? [])];
  const seen = new Set<string>();
  for (const raw of all) {
    const iban = (raw ?? "").replace(/\s/g, "").toUpperCase();
    if (iban) seen.add(iban);
  }
  return Array.from(seen);
}

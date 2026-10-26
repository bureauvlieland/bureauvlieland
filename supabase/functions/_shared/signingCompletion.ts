// Wat de handtekening onder de voorwaarden met de afrondingsstatus doet.
//
// Tot fase 4 van het klantreisplan (26 oktober 2026) zette een handtekening
// het project altijd op "ready_for_invoice". Dat klopte zolang er vlak voor
// of na het evenement getekend werd. Nu de klant tekent op het moment van
// akkoord, vaak maanden vooraf, zou dat het project meteen in de
// facturatiefase zetten: het portaal toont dan "uitgevoerd", de dagelijkse
// controles slaan het over en de nazorg start. Daarom alleen nog als de
// eerste programmadag al voorbij is; anders doet auto-close-past-execution
// het de dag na afloop.

/** Eerste programmadag als YYYY-MM-DD, of null. */
export function firstProgramDay(selectedDates: unknown): string | null {
  if (!Array.isArray(selectedDates)) return null;
  const days = (selectedDates as unknown[])
    .map((d) => String(d).slice(0, 10))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();
  return days[0] ?? null;
}

/**
 * Mag de handtekening het project op "klaar voor facturatie" zetten?
 * Alleen als de eerste programmadag vóór vandaag ligt. Zonder datums: nee.
 */
export function markReadyForInvoiceAtSigning(selectedDates: unknown, todayStr: string): boolean {
  const first = firstProgramDay(selectedDates);
  if (!first) return false;
  return first < todayStr;
}

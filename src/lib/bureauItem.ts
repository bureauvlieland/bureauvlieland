// Frontend mirror van supabase/functions/_shared/bureau-item.ts
// Eén bron van waarheid voor "is dit item door Bureau Vlieland centraal
// geregeld (en dus géén externe partner-notificatie)?".
//
// Belangrijk: facturatie is sinds 2026 ALTIJD centraal (bureau_central).
// `block_type` zegt vanaf nu uitsluitend iets over de AARD van het blok,
// niet meer over wie de klant factureert. Of er een externe partner
// gebeld/gemaild moet worden bepalen we via `provider_id`.

export interface BureauItemLike {
  block_type?: string | null;
  provider_id?: string | null;
}

const BUREAU_PROVIDER_IDS = new Set<string>([
  "bureau",
  "bureau-vlieland",
  "rederij",
  "fietsverhuur",
  "bagagevervoer-vlieland",
]);

/**
 * True als het item door Bureau Vlieland zelf wordt afgehandeld
 * en er dus géén externe partner geïnformeerd hoeft te worden.
 */
export function isBureauItem(item: BureauItemLike | null | undefined): boolean {
  if (!item) return false;
  const providerId = item.provider_id ?? null;
  // Echte partner als provider → nooit bureau-item, ook al staat
  // block_type per ongeluk op "bureau".
  if (providerId && !BUREAU_PROVIDER_IDS.has(providerId)) return false;
  if (item.block_type === "bureau") return true;
  if (providerId && BUREAU_PROVIDER_IDS.has(providerId)) return true;
  return false;
}

export function excludeBureauItems<T extends BureauItemLike>(items: T[]): T[] {
  return items.filter((i) => !isBureauItem(i));
}

export { BUREAU_PROVIDER_IDS };

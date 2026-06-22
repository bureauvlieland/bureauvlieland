// Frontend mirror van supabase/functions/_shared/bureau-item.ts
// Eén bron van waarheid voor "is dit item door Bureau Vlieland centraal
// geregeld (en dus géén externe partner-notificatie)?".
//
// Sinds 2026: facturatie is ALTIJD centraal (bureau_central). Of er een
// externe partner gebeld/gemaild moet worden bepalen we via `provider_id`
// EN — voor de drie managed-service providers — alleen voor het werkelijke
// vervoerstuk (overtochten, fietsen, bagagevervoer). Catering of andere
// onderdelen van bv. Rederij Doeksen moeten gewoon door de partner zelf
// worden bevestigd.

export interface BureauItemLike {
  block_type?: string | null;
  block_category?: string | null;
  provider_id?: string | null;
}

const PURE_BUREAU_PROVIDER_IDS = new Set<string>(["bureau", "bureau-vlieland"]);
const MANAGED_SERVICE_PROVIDER_IDS = new Set<string>([
  "rederij",
  "fietsverhuur",
  "bagagevervoer-vlieland",
]);
// Categorieën die Bureau Vlieland centraal boekt voor de managed-service partners.
const MANAGED_SERVICE_CATEGORIES = new Set<string>(["vervoer"]);

// Volledige lijst van provider_id's die ooit als bureau-managed kúnnen gelden,
// voor backwards-compat in importerende code.
const BUREAU_PROVIDER_IDS = new Set<string>([
  ...PURE_BUREAU_PROVIDER_IDS,
  ...MANAGED_SERVICE_PROVIDER_IDS,
]);

/**
 * True als het item door Bureau Vlieland zelf wordt afgehandeld
 * en er dus géén externe partner geïnformeerd hoeft te worden.
 */
export function isBureauItem(item: BureauItemLike | null | undefined): boolean {
  if (!item) return false;
  const providerId = item.provider_id ?? null;

  // Pure bureau-interne post (uren, materiaal, toeristenbelasting, etc.)
  if (providerId && PURE_BUREAU_PROVIDER_IDS.has(providerId)) return true;

  // Managed services: alleen vervoer (overtocht/fiets/bagage) wordt centraal
  // door bureau geboekt. Andere onderdelen (catering aan boord, etc.) moeten
  // door de partner zelf bevestigd worden.
  if (
    providerId
    && MANAGED_SERVICE_PROVIDER_IDS.has(providerId)
    && item.block_type === "bureau"
    && item.block_category
    && MANAGED_SERVICE_CATEGORIES.has(item.block_category)
  ) {
    return true;
  }

  return false;
}

export function excludeBureauItems<T extends BureauItemLike>(items: T[]): T[] {
  return items.filter((i) => !isBureauItem(i));
}

export { BUREAU_PROVIDER_IDS, PURE_BUREAU_PROVIDER_IDS, MANAGED_SERVICE_PROVIDER_IDS };

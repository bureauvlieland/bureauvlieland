// Shared helper: bepaal of een program_request_item een bureau-managed
// (centraal door Bureau Vlieland geboekt) item is.
//
// Een item is bureau-managed als:
//  - provider_id pure bureau is ('bureau' / 'bureau-vlieland'), OF
//  - block_type='bureau' EN provider_id in de managed-service providers
//    (rederij, fietsverhuur, bagagevervoer-vlieland) EN block_category in
//    de managed-service categorieën (vervoer = overtochten / fietsen /
//    bagagevervoer).
//
// Alleen items die hieraan voldoen worden door Bureau Vlieland zelf
// geboekt en mogen GEEN partner-notificaties (wijzigingen, prijswijzigingen,
// annuleringen, verwijderingen, akkoord-bevestigingen) ontvangen — én mogen
// direct op status 'confirmed' / 'bevestigd' worden gezet.
//
// Andere onderdelen (bv. "Koffie & Gebak aan boord" met provider 'rederij'
// maar category 'catering') horen gewoon de partner-aanvraag-flow te
// doorlopen.

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
const MANAGED_SERVICE_CATEGORIES = new Set<string>(["vervoer"]);

const BUREAU_PROVIDER_IDS = new Set<string>([
  ...PURE_BUREAU_PROVIDER_IDS,
  ...MANAGED_SERVICE_PROVIDER_IDS,
]);

/**
 * True als item centraal door Bureau Vlieland wordt geregeld en
 * dus NOOIT een externe partner-notificatie mag triggeren.
 */
export function isBureauItem(item: BureauItemLike | null | undefined): boolean {
  if (!item) return false;
  const providerId = item.provider_id ?? null;

  if (providerId && PURE_BUREAU_PROVIDER_IDS.has(providerId)) return true;

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

/**
 * Filter helper: geeft alleen items terug die NIET bureau-managed zijn.
 */
export function excludeBureauItems<T extends BureauItemLike>(items: T[]): T[] {
  return items.filter((i) => !isBureauItem(i));
}

export { BUREAU_PROVIDER_IDS, PURE_BUREAU_PROVIDER_IDS, MANAGED_SERVICE_PROVIDER_IDS };

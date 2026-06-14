// Shared helper: bepaal of een program_request_item een bureau-managed
// (centraal door Bureau Vlieland gefactureerd) item is.
//
// Een item is bureau-managed als block_type === "bureau" — ongeacht welke
// provider (Rederij Doeksen, Fietsverhuur Jan van Vlieland, etc.) op het
// item staat. Deze providers worden door Bureau Vlieland zelf geboekt en
// mogen GEEN partner-notificaties (wijzigingen, prijswijzigingen,
// annuleringen, verwijderingen, akkoord-bevestigingen) ontvangen.
//
// De oudere check `provider_id === "bureau"` is te smal: er bestaan in de
// database bureau-items met provider_id "rederij", "fietsverhuur",
// "bureau-vlieland", etc. — soms zelfs mét een provider_email ingevuld.

export interface BureauItemLike {
  block_type?: string | null;
  provider_id?: string | null;
}

// Bekende provider_id's voor centraal-door-Bureau-Vlieland-afgehandelde
// boekingen. Een item mag ALLEEN als bureau-item gelden als de provider_id
// ook in deze lijst staat — anders is het een echte partner die per ongeluk
// (bv. via kopieer-actie) op block_type "bureau" beland is en moet er
// gewoon een partner-aanvraag uit.
const BUREAU_PROVIDER_IDS = new Set<string>([
  "bureau",
  "bureau-vlieland",
  "rederij",
  "fietsverhuur",
  "bagagevervoer-vlieland",
]);

/**
 * Geeft true als het item door Bureau Vlieland centraal wordt geregeld en
 * dus NOOIT een externe partner-notificatie mag triggeren.
 */
export function isBureauItem(item: BureauItemLike | null | undefined): boolean {
  if (!item) return false;
  const providerId = item.provider_id ?? null;
  // Echte partner met provider_id buiten de bureau-lijst → nooit bureau-item,
  // ook al staat block_type per ongeluk op "bureau".
  if (providerId && !BUREAU_PROVIDER_IDS.has(providerId)) return false;
  if (item.block_type === "bureau") return true;
  if (providerId === "bureau") return true;
  return false;
}

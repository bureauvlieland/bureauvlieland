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

/**
 * Geeft true als het item door Bureau Vlieland centraal wordt geregeld en
 * dus NOOIT een externe partner-notificatie mag triggeren.
 */
export function isBureauItem(item: BureauItemLike | null | undefined): boolean {
  if (!item) return false;
  if (item.block_type === "bureau") return true;
  // Fallback voor legacy items zonder block_type maar met provider_id "bureau"
  if (item.provider_id === "bureau") return true;
  return false;
}

/**
 * Filter helper: geeft alleen items terug die NIET bureau-managed zijn.
 */
export function excludeBureauItems<T extends BureauItemLike>(items: T[]): T[] {
  return items.filter((i) => !isBureauItem(i));
}
